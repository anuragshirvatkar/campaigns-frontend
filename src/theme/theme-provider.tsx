// Light / dark / follow-the-phone. Switching re-mounts the screens under ThemedTree so every
// stylesheet and inline colour is read again from the new palette.
import * as SystemUI from "expo-system-ui";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { applyScheme, colors, readThemeMode, saveThemeMode, type ColorScheme, type ThemeMode } from "./index";

type ThemeState = { mode: ThemeMode; scheme: ColorScheme; setMode: (mode: ThemeMode) => void };

const ThemeContext = createContext<ThemeState>({ mode: "light", scheme: "light", setMode: () => {} });

const systemScheme = (): ColorScheme => (Appearance.getColorScheme() === "dark" ? "dark" : "light");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode);
  const [system, setSystem] = useState<ColorScheme>(() => {
    // Native dialogs and pickers follow the app's choice, not just the phone's
    if (mode !== "system") Appearance.setColorScheme(mode);
    return systemScheme();
  });

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme === "dark" ? "dark" : "light"));
    return () => sub.remove();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    saveThemeMode(next);
    Appearance.setColorScheme(next === "system" ? "unspecified" : next);
    setSystem(systemScheme());
    setModeState(next);
  }, []);

  const scheme: ColorScheme = mode === "system" ? system : mode;
  // Swap the palette before children render, so they read the new colours on this pass
  applyScheme(scheme);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [scheme]);

  return <ThemeContext.Provider value={{ mode, scheme, setMode }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Re-mounts its children when the scheme changes (module styles are cached per scheme). */
export function ThemedTree({ children }: { children: ReactNode }) {
  const { scheme } = useTheme();
  return <ThemeKey key={scheme}>{children}</ThemeKey>;
}

function ThemeKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
