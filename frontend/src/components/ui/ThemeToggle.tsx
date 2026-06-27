import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={`relative h-8 w-14 rounded-full border border-border-strong bg-surface-sunken
        flex items-center px-1 transition-colors ${className}`}
    >
      <span
        className={`absolute h-6 w-6 rounded-full bg-surface shadow-sm flex items-center justify-center
          transition-transform duration-200 ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}
      >
        {theme === "light" ? (
          <Sun className="h-3.5 w-3.5 text-warning-600" strokeWidth={2.25} />
        ) : (
          <Moon className="h-3.5 w-3.5 text-brand-400" strokeWidth={2.25} />
        )}
      </span>
    </button>
  );
}
