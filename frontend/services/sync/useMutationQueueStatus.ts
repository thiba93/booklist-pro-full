import { useEffect, useState } from "react";

import type { MutationHorsLigne } from "../../domain/sync/offlineMutation";
import { ecouterFileMutations, obtenirFileMutations } from "./mutationQueue";

export type StatutFileMutations = {
  enAttente: number;
  conflit: boolean;
};

function calculerStatut(file: readonly MutationHorsLigne[]): StatutFileMutations {
  return {
    enAttente: file.filter((mutation) => mutation.statut === "en_attente").length,
    conflit: file.some((mutation) => mutation.statut === "conflit")
  };
}

/** Alimente l'indicateur permanent (N mutations en attente / conflit). */
export function useMutationQueueStatus(): StatutFileMutations {
  const [statut, setStatut] = useState(() => calculerStatut(obtenirFileMutations()));

  useEffect(() => {
    setStatut(calculerStatut(obtenirFileMutations()));
    return ecouterFileMutations((file) => setStatut(calculerStatut(file)));
  }, []);

  return statut;
}
