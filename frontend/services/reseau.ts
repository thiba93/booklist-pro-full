/**
 * Abstraction reseau : isole la detection en ligne/hors ligne du reste de
 * l'app derriere une interface stable. Implementation web via
 * `navigator.onLine` et les evenements `online`/`offline` du navigateur.
 * Sur natif sans module de detection reseau installe (NetInfo), on reste
 * optimiste par defaut : mieux vaut tenter une requete et echouer proprement
 * que bloquer l'app a tort.
 */
export type EcouteurReseau = (enLigne: boolean) => void;

/** Lecture instantanee (non reactive) de l'etat reseau courant. */
export function estEnLigne(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }

  return true;
}

/**
 * Abonnement reactif aux transitions online/offline. Retourne toujours une
 * fonction de desabonnement (no-op si `window` n'existe pas, ex. rendu
 * serveur) pour que l'appelant n'ait pas a distinguer les deux cas dans un
 * useEffect.
 */
export function ecouterReseau(ecouteur: EcouteurReseau): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => undefined;
  }

  const surEnLigne = () => ecouteur(true);
  const surHorsLigne = () => ecouteur(false);

  window.addEventListener("online", surEnLigne);
  window.addEventListener("offline", surHorsLigne);

  return () => {
    window.removeEventListener("online", surEnLigne);
    window.removeEventListener("offline", surHorsLigne);
  };
}
