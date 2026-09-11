import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/layout/Screen";
import { useTranslation } from "../../services/i18n/I18nProvider";
import { useThemeMode } from "../../theme/ThemeProvider";
import { useAuth } from "./AuthProvider";
import { createStyles } from "./LoginScreen.styles";

/**
 * Ecran de connexion, affiche par AppShell tant que la session n'est pas
 * authentifiee (voir features/auth/AuthProvider.tsx). Purement controle :
 * toute la logique reseau (POST /auth/login, persistance du refreshToken)
 * vit dans AuthProvider, ce composant ne fait que collecter email/mot de
 * passe et refleter l'etat de soumission.
 */
export function LoginScreen() {
  const { theme } = useThemeMode();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { login, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  // Etat de soumission local (distinct de loginError, qui vit dans
  // AuthProvider) : desactive le bouton et affiche un spinner pendant
  // l'appel, sans attendre un re-render declenche par le contexte.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && motDePasse.length > 0 && !isSubmitting;

  async function submit() {
    setIsSubmitting(true);

    try {
      await login({ email, motDePasse });
    } catch {
      // Rien a faire ici : en cas d'echec (identifiants invalides, panne
      // reseau), AuthProvider.login a deja mis loginError a jour et ce
      // composant l'affiche via {loginError ? ... : null} plus bas. On
      // avale l'erreur pour ne pas la laisser remonter en promesse rejetee
      // non geree jusqu'au onPress du bouton.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t("auth.title")}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t("auth.emailLabel")}</Text>
          <TextInput
            accessibilityLabel={t("auth.emailLabel")}
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            onChangeText={setEmail}
            placeholder={t("auth.emailPlaceholder")}
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
          <TextInput
            accessibilityLabel={t("auth.passwordLabel")}
            onChangeText={setMotDePasse}
            placeholder={t("auth.passwordPlaceholder")}
            secureTextEntry
            style={styles.input}
            value={motDePasse}
          />
        </View>

        {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

        <Pressable
          accessibilityLabel={t("auth.submit")}
          accessibilityRole="button"
          accessibilityState={{ busy: isSubmitting, disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={() => void submit()}
          style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{t("auth.submit")}</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
