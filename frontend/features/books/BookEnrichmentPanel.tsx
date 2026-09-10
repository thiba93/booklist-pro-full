import { Text, View } from "react-native";

import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import { createStyles } from "./BookDetailScreen.styles";
import { useOpenLibraryEnrichment } from "./useOpenLibraryEnrichment";

type BookEnrichmentPanelProps = {
  titre: string;
  auteur: string;
};

/**
 * N'affiche jamais d'erreur : useOpenLibraryEnrichment ne passe jamais en
 * isError (voir openLibraryApi.ts), donc ce panneau se contente de ne
 * rien afficher tant qu'il n'y a rien a montrer.
 */
export function BookEnrichmentPanel({ titre, auteur }: BookEnrichmentPanelProps) {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const enrichment = useOpenLibraryEnrichment(titre, auteur, titre.length > 0 && auteur.length > 0);

  if (!enrichment.data) {
    return null;
  }

  const { premierePublication, sujets } = enrichment.data;

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t("openLibrary.title")}</Text>
      {premierePublication !== null ? (
        <Text style={styles.textMuted}>
          {t("openLibrary.firstPublished", { year: premierePublication })}
        </Text>
      ) : null}
      {sujets.length > 0 ? (
        <Text style={styles.textMuted}>{t("openLibrary.subjects", { subjects: sujets.join(", ") })}</Text>
      ) : null}
    </View>
  );
}
