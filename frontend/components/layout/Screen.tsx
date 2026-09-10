import { StyleSheet, View } from "react-native";

import { useThemeMode } from "../../theme/ThemeProvider";
import type { Theme } from "../../theme/theme";

type ScreenProps = {
  children: React.ReactNode;
};

export function Screen({ children }: ScreenProps) {
  const { theme } = useThemeMode();
  const styles = createStyles(theme);

  return <View style={styles.container}>{children}</View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl
    }
  });
}
