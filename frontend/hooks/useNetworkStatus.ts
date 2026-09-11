import { useEffect, useState } from "react";

import { ecouterReseau, estEnLigne } from "../services/reseau";

/**
 * Reflete l'etat reseau courant (voir services/reseau.ts) sous forme d'un
 * booleen reactif, pour piloter l'indicateur permanent et les strategies
 * hors ligne (cache, file de mutations).
 */
export function useNetworkStatus(): boolean {
  const [enLigne, setEnLigne] = useState(estEnLigne);

  useEffect(() => ecouterReseau(setEnLigne), []);

  return enLigne;
}
