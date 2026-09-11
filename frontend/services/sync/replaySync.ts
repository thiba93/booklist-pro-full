import type { MutationNote, MutationOuvrage } from "../../domain/sync/offlineMutation";
import { createBookNote, deleteBookNote } from "../api/booksApi";
import { syncBooks, type SyncMutation } from "../api/systemApi";
import {
  chargerFileMutations,
  marquerStatutMutation,
  obtenirFileMutations,
  retirerMutation
} from "./mutationQueue";

function versMutationSync(mutation: MutationOuvrage): SyncMutation {
  const charge = mutation.mutation;

  if (charge.nature === "creation") {
    return { id: mutation.id, type: "create", livre: charge.payload };
  }

  if (charge.nature === "modification") {
    return {
      id: mutation.id,
      type: "update",
      baseVersion: charge.baseVersion,
      livre: { id: charge.livreId, ...charge.payload }
    };
  }

  return {
    id: mutation.id,
    type: "delete",
    livreId: charge.livreId,
    baseVersion: charge.baseVersion
  };
}

function estErreurReseau(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { type?: unknown }).type === "ErreurReseau";
}

async function rejouerOuvrages(mutations: readonly MutationOuvrage[]): Promise<void> {
  try {
    const reponse = await syncBooks(mutations.map(versMutationSync));

    reponse.resultats.forEach((resultat) => {
      if (!resultat.id) {
        return;
      }

      if (resultat.statut === "ok") {
        retirerMutation(resultat.id);
        return;
      }

      if (resultat.statut === "conflit") {
        marquerStatutMutation(resultat.id, "conflit", {
          serveur: resultat.serveur,
          versionAttendue: resultat.versionAttendue
        });
        return;
      }

      marquerStatutMutation(resultat.id, "erreur");
    });
  } catch {
    // Panne reseau ou serveur : la file reste intacte, le prochain retour en
    // ligne (ou redemarrage) retentera le lot complet.
  }
}

/**
 * Rejoue une mutation de note. Retourne `false` pour signaler une panne
 * reseau (on arrete le rejeu des notes suivantes, on retentera plus tard) ;
 * `true` sinon (succes, ou echec definitif marque et laisse de cote).
 */
async function rejouerNote(mutation: MutationNote): Promise<boolean> {
  const charge = mutation.mutation;

  try {
    if (charge.nature === "creation") {
      await createBookNote(charge.livreId, charge.contenu);
    } else {
      await deleteBookNote(charge.livreId, charge.noteId);
    }

    retirerMutation(mutation.id);
    return true;
  } catch (error) {
    if (estErreurReseau(error)) {
      return false;
    }

    marquerStatutMutation(mutation.id, "erreur");
    return true;
  }
}

let rejeuEnCours: Promise<void> | null = null;

/**
 * Rejoue la file de mutations hors ligne : les ouvrages partent en un seul
 * lot POST /sync (idempotent cote serveur via l'id de mutation), les notes
 * sont rejouees une a une sur leurs endpoints existants (pas de lot batch
 * cote serveur pour les notes). Plusieurs appels concurrents (ex. plusieurs
 * transitions reseau rapprochees) partagent le meme rejeu en cours.
 */
export function rejouerFileMutations(): Promise<void> {
  rejeuEnCours ??= executerRejeu().finally(() => {
    rejeuEnCours = null;
  });

  return rejeuEnCours;
}

async function executerRejeu(): Promise<void> {
  await chargerFileMutations();
  const file = obtenirFileMutations();

  const ouvrages = file.filter(
    (mutation): mutation is MutationOuvrage => mutation.cible === "ouvrage" && mutation.statut === "en_attente"
  );
  const notes = file.filter((mutation) => mutation.cible === "note" && mutation.statut === "en_attente");

  if (ouvrages.length > 0) {
    await rejouerOuvrages(ouvrages);
  }

  // Rejeu sequentiel volontaire : pas de lot serveur pour les notes, et
  // l'ordre create/delete doit etre respecte (voir supprimerNoteHorsLigne).
  for (const note of notes) {
    if (note.cible !== "note") {
      continue;
    }

    const continuer = await rejouerNote(note);
    if (!continuer) {
      break;
    }
  }
}
