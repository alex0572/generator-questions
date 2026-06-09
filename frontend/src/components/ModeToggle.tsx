import { motion } from "framer-motion";
import type { GenerationMode } from "../api/client";

interface ModeToggleProps {
  mode: GenerationMode;
  disabled: boolean;
  onChange: (mode: GenerationMode) => void;
}

const MODES: { value: GenerationMode; label: string; hint: string }[] = [
  { value: "fast", label: "Fast", hint: "~10–30 с · 1 запрос" },
  { value: "quality", label: "Quality", hint: "~30–60 с · 2 запроса" },
];

export function ModeToggle({ mode, disabled, onChange }: ModeToggleProps) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">Режим генерации</p>
      <div className="glass-panel inline-flex rounded-xl p-1">
        {MODES.map((item) => {
          const active = mode === item.value;
          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.value)}
              className="relative rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50"
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-lg bg-indigo-500/25 border border-indigo-500/40"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative ${active ? "text-indigo-300" : "text-muted"}`}>
                {item.label}
              </span>
              <span className="relative ml-1.5 text-xs text-muted hidden sm:inline">
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
