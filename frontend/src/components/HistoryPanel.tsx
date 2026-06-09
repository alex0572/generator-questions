import { motion, AnimatePresence } from "framer-motion";
import type { HistoryEntry } from "../utils/history";

interface HistoryPanelProps {
  history: HistoryEntry[];
  open: boolean;
  onToggle: () => void;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryPanel({
  history,
  open,
  onToggle,
  onSelect,
  onClear,
}: HistoryPanelProps) {
  if (history.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-theme px-4 py-3 text-sm font-medium text-secondary transition hover:bg-surface-hover"
      >
        <span>История ({history.length})</span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="mt-2 flex flex-col gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {history.map((entry) => (
              <motion.li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="w-full rounded-xl border border-theme px-4 py-3 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/5"
                >
                  <p className="truncate text-sm font-medium text-primary">
                    {entry.pageTitle || entry.url}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {entry.url} · {entry.mode} ·{" "}
                    {new Date(entry.createdAt).toLocaleString("ru-RU")}
                  </p>
                </button>
              </motion.li>
            ))}
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted transition hover:text-red-400"
            >
              Очистить историю
            </button>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
