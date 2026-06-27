import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // Respect system preference on first visit, before any explicit choice
  // has been persisted — persisted state below will override this on
  // subsequent visits.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    { name: "rmbs-theme" }
  )
);

// Applies the current theme to the document root so CSS variables in
// theme.css (scoped to [data-theme="dark"]) take effect. Call once at
// app startup and subscribe to changes.
export function applyThemeToDocument(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
