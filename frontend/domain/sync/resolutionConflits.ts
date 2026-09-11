/**
 * Decide du sort d'une mutation hors ligne (modification ou suppression
 * d'un ouvrage) lorsque le serveur la refuse pour cause de version perimee
 * (409 / statut "conflit" de POST /sync).
 *
 * Strategie : la derniere intention connue l'emporte (last-write-wins),
 * comparee par horodatage ISO-8601 (comparaison lexicale valide pour ce
 * format). Voir docs/ADR/003-resolution-conflits.md pour le raisonnement
 * complet et les alternatives ecartees.
 *
 * Fonction pure : aucun effet de bord, aucun acces reseau ou stockage,
 * entierement testable en isolation.
 */
export type DecisionConflit = "reappliquer" | "abandonner";

export type ContexteConflit = {
  /** Horodatage (ISO-8601) auquel la mutation locale a ete formulee. */
  mutationCreeLe: string;
  /** updatedAt de la version du livre que le serveur connait actuellement. */
  serveurMisAJourLe: string;
};

export function deciderSortMutationConflit(contexte: ContexteConflit): DecisionConflit {
  return contexte.mutationCreeLe > contexte.serveurMisAJourLe ? "reappliquer" : "abandonner";
}
