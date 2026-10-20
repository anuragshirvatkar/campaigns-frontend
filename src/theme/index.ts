// Design tokens. Mostly white, with a soft violet as the one brand colour (from the
// theme references), navy text, and a few muted accents for status and charts.
// Dark mode: `colors` is a live object swapped in place by applyScheme(); anything built
// from it at module level goes through themed() so it rebuilds when the scheme changes.
import { Appearance, type TextStyle, type ViewStyle } from "react-native";
import * as SecureStore from "expo-secure-store";

const light = {
  // Surfaces
  background: "#FFFFFF",
  card: "#FFFFFF", // raised cards; a step lighter than the background in dark mode
  surface: "#F7F7FC", // grouped sections, inputs
  surfaceAlt: "#F1F0FB",
  border: "#ECEBF5",
  divider: "#F0EFF7",

  // Text
  text: "#26264A", // navy, never pure black
  textMuted: "#7D7E9D",
  textSubtle: "#AEAFC6",
  textOnDark: "#FFFFFF",

  // Brand
  primary: "#6C5DE8",
  primaryPressed: "#5848D6",
  primarySoft: "#EEEBFF", // chips, tinted icon wells
  primaryTint: "#F7F6FF", // very light washes
  primaryMuted: "#B9B1F6", // decor, disabled

  // Accents (charts, categories, status)
  teal: "#4FCFE0",
  tealSoft: "#E3F8FB",
  coral: "#F88A7E",
  coralSoft: "#FEECEA",
  blue: "#3F8CF2",
  blueSoft: "#E6F0FE",
  navy: "#454A78",
  amber: "#F4B740",
  amberSoft: "#FDF4E0",

  // Feedback
  success: "#22B07D",
  successSoft: "#E3F6EE",
  danger: "#E5534B",
  dangerSoft: "#FDECEB",
  warning: "#D68A12",
  warningSoft: "#FDF3E1",

  overlay: "rgba(38, 38, 74, 0.45)",
};

export type Palette = typeof light;

const dark: Palette = {
  background: "#0F1020",
  card: "#1A1B30",
  surface: "#25263F",
  surfaceAlt: "#2C2D4A",
  border: "#2C2D4A",
  divider: "#25263F",

  text: "#ECECF8",
  textMuted: "#A3A4C2",
  textSubtle: "#6D6E90",
  textOnDark: "#FFFFFF",

  primary: "#7D6CFA",
  primaryPressed: "#6A58EE",
  primarySoft: "#2A2655",
  primaryTint: "#1C1B38",
  primaryMuted: "#544C9E",

  teal: "#5AD6E6",
  tealSoft: "#123139",
  coral: "#FA9A8F",
  coralSoft: "#3A2427",
  blue: "#62A2F7",
  blueSoft: "#172A48",
  navy: "#A9AEDD",
  amber: "#F6C25A",
  amberSoft: "#3A3017",

  success: "#3CC892",
  successSoft: "#13342A",
  danger: "#F06A62",
  dangerSoft: "#3D1F22",
  warning: "#EBA53A",
  warningSoft: "#3A2D14",

  overlay: "rgba(0, 0, 0, 0.6)",
};

export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const MODE_KEY = "theme_mode";
let scheme: ColorScheme = "light";
let version = 0;

export const colors: Palette = { ...light };

export const isDark = () => scheme === "dark";
/** Pick a raw colour by scheme, for one-off art colours that aren't tokens. */
export const dk = <T,>(lightValue: T, darkValue: T): T => (scheme === "dark" ? darkValue : lightValue);

export function readThemeMode(): ThemeMode {
  try {
    const v = SecureStore.getItem(MODE_KEY);
    return v === "system" || v === "dark" ? v : "light"; // light unless the user picked otherwise
  } catch {
    return "light";
  }
}

export function saveThemeMode(mode: ThemeMode) {
  SecureStore.setItemAsync(MODE_KEY, mode).catch(() => {});
}

export function resolveScheme(mode: ThemeMode): ColorScheme {
  if (mode !== "system") return mode;
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function applyScheme(next: ColorScheme) {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, next === "dark" ? dark : light);
  version++;
}

/**
 * A module-level value (stylesheet, colour map) that is rebuilt from `factory` whenever the
 * scheme changes. Reads go through a proxy, so callers use it exactly like the plain object.
 */
export function themed<T extends object>(factory: () => T): T {
  let cache = factory();
  let built = version;
  const current = () => {
    if (built !== version) {
      cache = factory();
      built = version;
    }
    return cache as Record<PropertyKey, unknown>;
  };
  return new Proxy({} as T, {
    get: (_, key) => current()[key],
    has: (_, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, key) => {
      const d = Reflect.getOwnPropertyDescriptor(current(), key);
      return d && { ...d, configurable: true };
    },
  });
}

// Apply the saved choice before any screen builds its styles, so the first frame is right
applyScheme(resolveScheme(readThemeMode()));

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const fonts = {
  regular: "Rubik_400Regular",
  medium: "Rubik_500Medium",
  semibold: "Rubik_600SemiBold",
  bold: "Rubik_700Bold",
};

export const type = themed(() => ({
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.text },
  h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.text },
  h2: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.text },
  title: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text },
  // Long-form story text: larger and airier for reading
  article: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 28, color: colors.text },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  // Small uppercase label above titles ("STEP 1 OF 5", "HEALTH")
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primary,
  },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  number: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text },
}) satisfies Record<string, TextStyle>);

export type TypeVariant = keyof typeof type;

export const shadow = themed(() => ({
  card: {
    shadowColor: dk("#4B44A8", "#000000"),
    shadowOpacity: dk(0.08, 0.35),
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: dk("#4B44A8", "#000000"),
    shadowOpacity: dk(0.18, 0.5),
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
}) satisfies Record<string, ViewStyle>);

/** Minimum comfortable touch target (Android guidance is 48dp). */
export const TOUCH = 48;
