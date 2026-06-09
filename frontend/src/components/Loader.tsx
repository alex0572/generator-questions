import { motion } from "framer-motion";
import type { GenerationMode } from "../api/client";

interface LoaderProps {
  mode?: GenerationMode;
}

export function Loader({ mode = "fast" }: LoaderProps) {
  const isQuality = mode === "quality";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-live="polite"
      aria-busy="true"
    >
      <motion.div
        className="glass-panel flex flex-col items-center gap-5 rounded-3xl px-10 py-8"
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
            style={{ animation: "pulse-ring 2s ease-in-out infinite" }}
          />
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500/20 border-t-indigo-400" />
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-semibold text-primary">
            {isQuality ? "Глубокий анализ страницы" : "Анализируем страницу"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isQuality
              ? "Выделяем темы и формируем вопросы — до 60 секунд"
              : "Генерация 5 вопросов — 10–30 секунд"}
          </p>
        </div>

        <div className="flex gap-2">
          <span className="loader-dot h-2 w-2 rounded-full bg-indigo-400" />
          <span className="loader-dot h-2 w-2 rounded-full bg-violet-400" />
          <span className="loader-dot h-2 w-2 rounded-full bg-purple-400" />
        </div>
      </motion.div>
    </motion.div>
  );
}
