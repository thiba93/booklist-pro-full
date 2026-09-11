import { useEffect, useState } from "react";

import type { MutationHorsLigne } from "../../domain/sync/offlineMutation";
import { ecouterFileMutations, obtenirFileMutations } from "./mutationQueue";

export type StatutFileMutations = {
  /** Mutations qui seront rejouees au prochain retour en ligne. */
  enAttente: number;
  /**
   * Au moins une mutation a ete abandonnee suite a un conflit (voir
   * deciderSortMutationConflit) : le serveur avait une version plus
   * recente, la mutation locale a ete ecartee mais conservee (statut
   * "conflit") pour rester visible plutot que de disparaitre en silence.
   */
  conflit: boolean;
};

function calculerStatut(file: readonly MutationHorsLigne[]): StatutFileMutations {
  return {
    enAttente: file.filter((mutation) => mutation.statut === "en_attente").length,
    conflit: file.some((mutation) => mutation.statut === "conflit")
  };
}

/**
 * Alimente l'indicateur permanent (N mutations en attente / conflit, voir
 * components/feedback/NetworkStatusBar.tsx) en s'abonnant a la file de
 * mutations partagee (services/sync/mutationQueue.ts). La file elle-meme
 * n'est pas un state React (simple module singleton pour rester accessible
 * hors composants, ex. depuis replaySync.ts) : ce hook fait le pont en
 * recalculant un resume derive a chaque notification.
 */
export function useMutationQueueStatus(): StatutFileMutations {
  const [statut, setStatut] = useState(() => calculerStatut(obtenirFileMutations()));

  useEffect(() => {
    // Recalcule immediatement au montage : la file a pu changer entre le
    // rendu initial (valeur figee au premier appel de useState) et l'effet.
    setStatut(calculerStatut(obtenirFileMutations()));
    return ecouterFileMutations((file) => setStatut(calculerStatut(file)));
  }, []);

  return statut;
}
