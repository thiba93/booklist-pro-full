import type { MutationNote, MutationOuvrage } from "../../domain/sync/offlineMutation";
import { deciderSortMutationConflit } from "../../domain/sync/resolutionConflits";
import { createBookNote, deleteBookNote } from "../api/booksApi";
import { syncBooks, type SyncMutation } from "../api/systemApi";
import {
  chargerFileMutations,
  marquerStatutMutation,
  obtenirFileMutations,
  rebaserMutationOuvrage,
  retirerMutation
} from "./mutationQueue";

/**
 * Rejeu de la file de mutations hors ligne (services/sync/mutationQueue.ts)
 * vers l'API reelle des le retour du reseau. Deux strategies distinctes
 * cote serveur :
 * - Ouvrages : un seul POST /sync par lot, idempotent par id de mutation.
 * - Notes : pas d'endpoint batch cote serveur -> rejeu sequentiel un par un
 *   sur les endpoints REST existants (POST/DELETE .../notes).
 * Voir docs/ADR/003-resolution-conflits.md pour la strategie de resolution
 * des conflits (409) rencontres pendant le rejeu des ouvrages.
 */

// Une seule passe de retry immediat apres un rebase (voir executerRejeu) :
// suffisant pour le cas courant (conflit resolu par la comparaison LWW),
// evite une boucle infinie si un rebase reconflit aussitot (concurrence
// tres active sur le meme livre).
const PROFONDEUR_MAX_REJEU = 1;

/** Traduit une mutation de la file interne vers le format attendu par POST /sync. */
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

/**
 * Distingue une panne reseau (a retenter plus tard, sans perdre la
 * mutation) d'un echec definitif du serveur (422 invalide, etc., a marquer
 * "erreur" et laisser de cote). ApiError n'est pas importe directement ici
 * pour eviter un couplage supplementaire ; le duck-typing sur `.type`
 * suffit et reste stable (voir services/api/apiErrors.ts).
 */
function estErreurReseau(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { type?: unknown }).type === "ErreurReseau";
}

/**
 * Rejoue un lot d'ouvrages. Retourne `true` si au moins une mutation en
 * conflit a ete rebasee et doit etre retentee immediatement (voir
 * deciderSortMutationConflit).
 */
async function rejouerOuvrages(mutations: readonly MutationOuvrage[]): Promise<boolean> {
  const parId = new Map(mutations.map((mutation) => [mutation.id, mutation]));
  let unRebase = false;

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
        const origine = parId.get(resultat.id);

        // Un conflit deja traite lors d'un envoi precedent est rejoue par
        // le serveur sans reponter la version courante (voir
        // docs/ADR/003-resolution-conflits.md). Sans cette info, aucune
        // decision fiable n'est possible : on abandonne prudemment plutot
        // que de rebaser a l'aveugle sur une version qu'on ne connait pas.
        const decision =
          origine && resultat.serveur
            ? deciderSortMutationConflit({
                mutationCreeLe: origine.creeLe,
                serveurMisAJourLe: resultat.serveur.updatedAt
              })
            : "abandonner";

        if (decision === "reappliquer" && resultat.versionAttendue !== undefined) {
          rebaserMutationOuvrage(resultat.id, resultat.versionAttendue);
          unRebase = true;
        } else {
          // Le serveur fait foi : la mutation est conservee, marquee
          // terminale (visible via l'indicateur "conflit"), mais plus
          // jamais rejouee. Le prochain refetch reaffichera l'etat serveur.
          marquerStatutMutation(resultat.id, "conflit", {
            serveur: resultat.serveur,
            versionAttendue: resultat.versionAttendue
          });
        }
        return;
      }

      marquerStatutMutation(resultat.id, "erreur");
    });
  } catch {
    // Panne reseau ou serveur : la file reste intacte, le prochain retour en
    // ligne (ou redemarrage) retentera le lot complet.
  }

  return unRebase;
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

async function executerRejeu(profondeur = 0): Promise<void> {
  await chargerFileMutations();
  const file = obtenirFileMutations();

  const ouvrages = file.filter(
    (mutation): mutation is MutationOuvrage => mutation.cible === "ouvrage" && mutation.statut === "en_attente"
  );
  const notes = file.filter((mutation) => mutation.cible === "note" && mutation.statut === "en_attente");

  if (ouvrages.length > 0) {
    const unRebase = await rejouerOuvrages(ouvrages);

    // Une mutation rebasee (voir deciderSortMutationConflit) est retentee
    // tout de suite plutot que d'attendre la prochaine transition reseau.
    // Profondeur bornee : un rebase qui reconflit aussitot est laisse pour
    // le prochain cycle plutot que de boucler indefiniment.
    if (unRebase && profondeur < PROFONDEUR_MAX_REJEU) {
      await executerRejeu(profondeur + 1);
      return;
    }
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
