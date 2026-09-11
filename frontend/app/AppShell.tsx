import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ErrorBoundary } from "../components/error/ErrorBoundary";
import { NetworkStatusBar } from "../components/feedback/NetworkStatusBar";
import { Screen } from "../components/layout/Screen";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { ForbiddenBanner } from "../features/auth/ForbiddenBanner";
import { LoginScreen } from "../features/auth/LoginScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { ConflictPanel } from "../features/sync/ConflictPanel";
import { useSyncReplay } from "../features/sync/useSyncReplay";
import { I18nProvider, useTranslation } from "../services/i18n/I18nProvider";
import { hydrateQueryClient, persistQueryClient } from "../services/storage/queryPersister";
import { chargerFileMutations } from "../services/sync/mutationQueue";
import { useMutationQueueStatus } from "../services/sync/useMutationQueueStatus";
import { ThemeProvider, useThemeMode } from "../theme/ThemeProvider";

/**
 * networkMode "always" sur les MUTATIONS uniquement : React Query a son
 * propre detecteur online/offline (pause automatiquement toute mutation des
 * que le navigateur se dit hors ligne) qui entrerait en conflit avec le
 * notre (services/reseau.ts) et empecherait purement et simplement
 * mutationFn de s'executer hors ligne - vidant de son sens toute la
 * strategie de file de mutations.
 *
 * Les QUERIES gardent le comportement par defaut ("online") : un refetch en
 * arriere-plan qui echoue hors ligne doit rester silencieusement en pause,
 * pas faire basculer une fiche deja chargee (ou creee hors ligne) sur un
 * ecran d'erreur qui efface les donnees en cache le temps que le timeout
 * reseau (8s) expire.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { networkMode: "always" }
  }
});

export function AppShell() {
  // Bloque le premier rendu jusqu'a ce que le cache local (dernieres
  // reponses reussies, voir services/storage/queryPersister.ts) ET la file
  // de mutations en attente (services/sync/mutationQueue.ts) soient
  // relus depuis le storage - sinon un ecran monte trop tot verrait des
  // listes vides ou un compteur "mutations en attente" a zero le temps que
  // la lecture asynchrone se termine.
  const [isCacheReady, setIsCacheReady] = useState(false);

  useEffect(() => {
    let annule = false;

    void Promise.all([hydrateQueryClient(queryClient), chargerFileMutations()]).finally(() => {
      if (!annule) {
        setIsCacheReady(true);
      }
    });

    // Persistance continue (pas seulement au demarrage) : chaque succes de
    // requete "books" est sauvegarde des qu'il arrive, pour que le cache
    // relu au prochain lancement soit a jour.
    const arreterPersistance = persistQueryClient(queryClient);

    return () => {
      annule = true;
      arreterPersistance();
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            {/*
              Seul veritable noeud DOM racine de l'app : ThemeProvider,
              I18nProvider, ErrorBoundary, QueryClientProvider et
              AuthProvider ne sont que des Context.Provider, sans element
              visuel propre. Sans ce View explicite (flexDirection:"column"
              par defaut sur le web), la barre et le contenu se retrouvent
              enfants directs du conteneur racine Expo, dont l'axe flex
              n'est pas garanti - d'ou une mise en page cassee sur le web.
            */}
            <View style={styles.root}>
              <ConnectivityBar />
              <ConflictPanel />
              {isCacheReady ? (
                <AuthProvider>
                  <StatusBarForTheme />
                  <ForbiddenBanner />
                  <SyncReplayEffect />
                  <AuthGate />
                </AuthProvider>
              ) : (
                <LoadingScreen messageKey="app.loadingCache" />
              )}
            </View>
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});

/** Bandeau permanent (en dehors de AuthProvider : visible meme sur l'ecran de connexion). */
function ConnectivityBar() {
  const { conflit, enAttente } = useMutationQueueStatus();
  return <NetworkStatusBar hasConflict={conflit} pendingCount={enAttente} />;
}

/** Composant sans rendu : ne fait que brancher l'effet de rejeu automatique (voir useSyncReplay). */
function SyncReplayEffect() {
  useSyncReplay();
  return null;
}

/** Aiguillage ecran de connexion / contenu selon l'etat de session (voir AuthProvider). */
function AuthGate() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen messageKey="auth.loading" />;
  }

  if (status === "anonymous") {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}

function LoadingScreen({ messageKey }: { messageKey: "app.loadingCache" | "auth.loading" }) {
  const { t } = useTranslation();

  return (
    <Screen>
      <View>
        <Text>{t(messageKey)}</Text>
      </View>
    </Screen>
  );
}

function StatusBarForTheme() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}
