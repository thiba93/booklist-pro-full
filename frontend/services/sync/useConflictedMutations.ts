import { useEffect, useState } from "react";

import type { MutationHorsLigne, MutationOuvrage } from "../../domain/sync/offlineMutation";
import { ecouterFileMutations, obtenirFileMutations } from "./mutationQueue";

/**
 * Seules les mutations "ouvrage" peuvent finir en conflit : le controle de
 * version optimiste de POST /sync ne s'applique qu'aux livres (les notes
 * passent par des endpoints REST simples, sans baseVersion - voir
 * services/sync/replaySync.ts).
 */
function extraireConflits(file: readonly MutationHorsLigne[]): MutationOuvrage[] {
  return file.filter(
    (mutation): mutation is MutationOuvrage => mutation.cible === "ouvrage" && mutation.statut === "conflit"
  );
}

/**
 * Liste detaillee des mutations abandonnees suite a un conflit (voir
 * deciderSortMutationConflit), pour permettre a l'utilisateur de les
 * consulter et de les purger explicitement (features/sync/ConflictPanel.tsx)
 * plutot que de les laisser gonfler la file indefiniment sans recours.
 */
export function useConflictedMutations(): readonly MutationOuvrage[] {
  const [conflits, setConflits] = useState(() => extraireConflits(obtenirFileMutations()));

  useEffect(() => {
    setConflits(extraireConflits(obtenirFileMutations()));
    return ecouterFileMutations((file) => setConflits(extraireConflits(file)));
  }, []);

  return conflits;
}
