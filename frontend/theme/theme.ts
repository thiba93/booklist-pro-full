export type ThemeMode = "light" | "dark";

type ColorTokens = {
  accent: string;
  accentSoft: string;
  background: string;
  border: string;
  danger: string;
  onAccent: string;
  skeleton: string;
  skeletonStrong: string;
  starEmpty: string;
  starFilled: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
};

const lightColors: ColorTokens = {
  accent: "#0F766E",
  accentSoft: "#DDEFEA",
  background: "#FAFAF8",
  border: "#D7D7CE",
  danger: "#B42318",
  onAccent: "#FFFFFF",
  skeleton: "#E7E5DF",
  skeletonStrong: "#D9D7D0",
  starEmpty: "#D7D7CE",
  starFilled: "#D97706",
  surface: "#FFFFFF",
  textPrimary: "#18181B",
  textSecondary: "#52525B"
};

const darkColors: ColorTokens = {
  accent: "#2DD4BF",
  accentSoft: "#134E4A",
  background: "#121212",
  border: "#3A3A3A",
  danger: "#F87171",
  onAccent: "#0B1120",
  skeleton: "#2A2A2A",
  skeletonStrong: "#333333",
  starEmpty: "#3A3A3A",
  starFilled: "#FBBF24",
  surface: "#1E1E1E",
  textPrimary: "#F4F4F5",
  textSecondary: "#A1A1AA"
};

const palettes: Record<ThemeMode, ColorTokens> = {
  dark: darkColors,
  light: lightColors
};

const metrics = {
  radius: {
    sm: 6,
    md: 8
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40
  },
  touch: {
    min: 44
  },
  typography: {
    caption: 12,
    body: 16,
    title: 22,
    display: 40
  }
} as const;

export type Theme = typeof metrics & {
  colors: ColorTokens;
  mode: ThemeMode;
};

export function buildTheme(mode: ThemeMode): Theme {
  return { ...metrics, colors: palettes[mode], mode };
}
