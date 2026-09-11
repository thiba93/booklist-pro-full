import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { rejouerFileMutations } from "../../services/sync/replaySync";
import { bookKeys } from "../books/bookQueryKeys";
import { useAuth } from "../auth/AuthProvider";

/**
 * Declenche le rejeu de la file de mutations hors ligne : au demarrage si
 * l'app est deja en ligne (et authentifiee) avec une file non vide, a
 * chaque retour en ligne, et juste apres une connexion reussie (une session
 * peut avoir ete perdue pendant que des mutations s'accumulaient hors
 * ligne). Le cache est ensuite reconcilie avec la verite serveur (les
 * totaux de pages ajustes localement lors des mutations hors ligne restent
 * approximatifs jusque-la).
 */
export function useSyncReplay(): void {
  const isOnline = useNetworkStatus();
  const { status } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOnline || status !== "authenticated") {
      return;
    }

    void rejouerFileMutations().then(() => {
      void queryClient.invalidateQueries({ queryKey: bookKeys.root });
    });
  }, [isOnline, status, queryClient]);
}
