import { Pressable, StyleSheet, Text, View } from "react-native";

import { titreDepuisInconnu } from "../../domain/books/book";
import type { MutationOuvrage } from "../../domain/sync/offlineMutation";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { rebaserMutationOuvrage, retirerMutation } from "../../services/sync/mutationQueue";
import { useConflictedMutations } from "../../services/sync/useConflictedMutations";
import { rejouerFileMutations } from "../../services/sync/replaySync";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

/**
 * Rend visible et actionnable ce que le bandeau permanent se contente de
 * signaler ("Conflit à résoudre") : sans cet écran, une mutation abandonnée
 * (voir deciderSortMutationConflit / docs/ADR/003-resolution-conflits.md)
 * restait indéfiniment dans la file sans qu'aucune action ne soit possible
 * depuis l'interface. Affiché seulement s'il existe au moins un conflit ;
 * ne rend rien sinon (voir AppShell.tsx, monté en permanence a cote de la
 * barre de connectivite).
 *
 * Deux issues possibles par conflit :
 * - "Garder la version du serveur" : purge simplement la mutation abandonnee
 *   (son effet local a deja ete efface par le refetch qui a suivi le rejeu).
 * - "Réappliquer ma modification" : uniquement possible quand le serveur a
 *   renvoye sa version courante au moment du conflit (`versionAttendue`
 *   connu - absent dans le cas degrade documente dans l'ADR 003). Rebase la
 *   mutation sur cette version puis relance immediatement un rejeu, sans
 *   attendre la prochaine transition reseau.
 */
export function ConflictPanel() {
  const conflits = useConflictedMutations();
  const isOnline = useNetworkStatus();
  const { t } = useTranslation();
  const { theme } = useThemeMode();
  const styles = createStyles(theme);

  if (conflits.length === 0) {
    return null;
  }

  function garderVersionServeur(id: string) {
    retirerMutation(id);
  }

  function toutIgnorer() {
    conflits.forEach((mutation) => retirerMutation(mutation.id));
  }

  function reappliquer(mutation: MutationOuvrage) {
    if (mutation.versionAttendue === undefined) {
      return;
    }

    rebaserMutationOuvrage(mutation.id, mutation.versionAttendue);
    void rejouerFileMutations();
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("syncConflict.title", { count: conflits.length })}</Text>
        {conflits.length > 1 ? (
          <Pressable
            accessibilityLabel={t("syncConflict.dismissAll")}
            accessibilityRole="button"
            onPress={toutIgnorer}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>{t("syncConflict.dismissAll")}</Text>
          </Pressable>
        ) : null}
      </View>
      {conflits.map((mutation) => {
        const titre = titreDepuisInconnu(mutation.serveur);
        const peutReappliquer = mutation.versionAttendue !== undefined && isOnline;

        return (
          <View key={mutation.id} style={styles.card}>
            <Text style={styles.message}>
              {titre ? t("syncConflict.messageWithTitle", { titre }) : t("syncConflict.messageGeneric")}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={t("syncConflict.keepServer")}
                accessibilityRole="button"
                onPress={() => garderVersionServeur(mutation.id)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>{t("syncConflict.keepServer")}</Text>
              </Pressable>
              {peutReappliquer ? (
                <Pressable
                  accessibilityLabel={t("syncConflict.reapply")}
                  accessibilityRole="button"
                  onPress={() => reappliquer(mutation)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>{t("syncConflict.reapply")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    card: {
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.sm
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    message: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.danger,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md
    },
    primaryButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.sm,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.sm
    },
    primaryText: {
      color: theme.colors.onAccent,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    secondaryButton: {
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: theme.touch.min,
      paddingHorizontal: theme.spacing.sm
    },
    secondaryText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      fontWeight: "700"
    }
  });
}
