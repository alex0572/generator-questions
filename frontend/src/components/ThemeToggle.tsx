import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-full border border-theme px-3 py-1.5 text-xs font-medium text-muted transition hover:border-indigo-500/40 hover:text-indigo-300"
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
    >
      {theme === "dark" ? (
        <>
          <span aria-hidden>☀️</span> Светлая
        </>
      ) : (
        <>
          <span aria-hidden>🌙</span> Тёмная
        </>
      )}
    </button>
  );
}
