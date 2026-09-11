import type { BookCreatePayload, BookUpdatePayload } from "../api/booksApi";
import { readPersistedValue, writePersistedValue } from "../storage/persistedValue";
import type { MutationHorsLigne, StatutMutation } from "../../domain/sync/offlineMutation";

const STORAGE_KEY = "booklistpro.mutation-queue";

type Ecouteur = (file: readonly MutationHorsLigne[]) => void;

let file: MutationHorsLigne[] = [];
let hydratee = false;
const ecouteurs = new Set<Ecouteur>();

function notifier() {
  ecouteurs.forEach((ecouteur) => ecouteur(file));
}

function persister() {
  void writePersistedValue(STORAGE_KEY, JSON.stringify(file));
}

/**
 * Genere un identifiant stable pour une mutation. Sert aussi d'id
 * idempotent cote serveur (POST /sync memorise les mutations traitees par
 * cet id) et, pour les creations, d'id provisoire pour l'entite elle-meme.
 */
export function genererIdMutation(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** A appeler au demarrage de l'app, avant toute lecture de la file. */
export async function chargerFileMutations(): Promise<void> {
  if (hydratee) {
    return;
  }

  const brut = await readPersistedValue(STORAGE_KEY);

  if (brut) {
    try {
      file = JSON.parse(brut) as MutationHorsLigne[];
    } catch {
      file = [];
    }
  }

  hydratee = true;
  notifier();
}

export function obtenirFileMutations(): readonly MutationHorsLigne[] {
  return file;
}

export function ecouterFileMutations(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => ecouteurs.delete(ecouteur);
}

function ajouter(mutation: MutationHorsLigne) {
  file = [...file, mutation];
  persister();
  notifier();
}

export function enfilerCreationOuvrage(id: string, payload: BookCreatePayload): void {
  ajouter({
    id,
    cible: "ouvrage",
    mutation: { nature: "creation", payload },
    creeLe: new Date().toISOString(),
    statut: "en_attente"
  });
}

function estOuvragePendant(
  mutation: MutationHorsLigne,
  livreId: string,
  nature: "creation" | "modification"
): mutation is MutationHorsLigne & { cible: "ouvrage" } {
  if (mutation.cible !== "ouvrage" || mutation.statut !== "en_attente" || mutation.mutation.nature !== nature) {
    return false;
  }

  return (nature === "creation" ? mutation.id : (mutation.mutation as { livreId: string }).livreId) === livreId;
}

/**
 * Plusieurs mutations hors ligne successives sur le meme ouvrage (ex. :
 * marquer lu puis favori hors ligne) sont fusionnees en une seule mutation
 * en attente. Sans cela, chaque mutation garderait le meme baseVersion
 * d'origine et le rejeu en lot les ferait entrer en conflit les unes contre
 * les autres des que la premiere serait acceptee par le serveur.
 */
export function enfilerModificationOuvrage(
  id: string,
  livreId: string,
  payload: BookUpdatePayload,
  baseVersion: number
): void {
  const indexCreation = file.findIndex((m) => estOuvragePendant(m, livreId, "creation"));

  if (indexCreation !== -1) {
    const existante = file[indexCreation];
    if (existante?.cible === "ouvrage" && existante.mutation.nature === "creation") {
      const fusionnee = {
        ...existante,
        mutation: { nature: "creation" as const, payload: { ...existante.mutation.payload, ...payload } }
      };
      file = file.map((m, index) => (index === indexCreation ? fusionnee : m));
      persister();
      notifier();
      return;
    }
  }

  const indexModification = file.findIndex((m) => estOuvragePendant(m, livreId, "modification"));

  if (indexModification !== -1) {
    const existante = file[indexModification];
    if (existante?.cible === "ouvrage" && existante.mutation.nature === "modification") {
      const fusionnee = {
        ...existante,
        mutation: { ...existante.mutation, payload: { ...existante.mutation.payload, ...payload } }
      };
      file = file.map((m, index) => (index === indexModification ? fusionnee : m));
      persister();
      notifier();
      return;
    }
  }

  ajouter({
    id,
    cible: "ouvrage",
    mutation: { nature: "modification", livreId, payload, baseVersion },
    creeLe: new Date().toISOString(),
    statut: "en_attente"
  });
}

/**
 * Supprimer un ouvrage cree hors ligne (jamais synchronise) annule
 * simplement sa creation en attente ; supprimer un ouvrage deja synchronise
 * ecarte une eventuelle modification en attente devenue caduque avant
 * d'enfiler la suppression.
 */
export function enfilerSuppressionOuvrage(id: string, livreId: string, baseVersion: number): void {
  const indexCreation = file.findIndex((m) => estOuvragePendant(m, livreId, "creation"));

  if (indexCreation !== -1) {
    file = file.filter((_mutation, index) => index !== indexCreation);
    persister();
    notifier();
    return;
  }

  file = file.filter((mutation) => !estOuvragePendant(mutation, livreId, "modification"));

  ajouter({
    id,
    cible: "ouvrage",
    mutation: { nature: "suppression", livreId, baseVersion },
    creeLe: new Date().toISOString(),
    statut: "en_attente"
  });
}

export function enfilerCreationNote(id: string, livreId: string, contenu: string): void {
  ajouter({
    id,
    cible: "note",
    mutation: { nature: "creation", livreId, contenu },
    creeLe: new Date().toISOString(),
    statut: "en_attente"
  });
}

export function enfilerSuppressionNote(id: string, livreId: string, noteId: string): void {
  ajouter({
    id,
    cible: "note",
    mutation: { nature: "suppression", livreId, noteId },
    creeLe: new Date().toISOString(),
    statut: "en_attente"
  });
}

export function retirerMutation(id: string): void {
  file = file.filter((mutation) => mutation.id !== id);
  persister();
  notifier();
}

export function marquerStatutMutation(
  id: string,
  statut: StatutMutation,
  extra?: { serveur?: unknown; versionAttendue?: number }
): void {
  file = file.map((mutation) => (mutation.id === id ? { ...mutation, statut, ...extra } : mutation));
  persister();
  notifier();
}

/** Reservee aux tests : remet la file a plat sans toucher au storage reel. */
export function reinitialiserFileMutationsPourTests(): void {
  file = [];
  hydratee = false;
  notifier();
}
