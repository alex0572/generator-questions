import { FormEvent } from "react";
import { motion } from "framer-motion";

interface UrlFormProps {
  url: string;
  loading: boolean;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
}

function LinkIcon() {
  return (
    <svg
      className="h-5 w-5 text-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

export function UrlForm({ url, loading, onUrlChange, onSubmit }: UrlFormProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="glass-panel flex w-full flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:p-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <label className="sr-only" htmlFor="site-url">
        Ссылка на страницу
      </label>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <LinkIcon />
        </span>
        <input
          id="site-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          disabled={loading}
          className="glass-input w-full rounded-xl py-3.5 pl-12 pr-4 text-base outline-none disabled:opacity-50"
        />
      </div>
      <motion.button
        type="submit"
        disabled={loading || !url.trim()}
        whileHover={{ scale: loading ? 1 : 1.03 }}
        whileTap={{ scale: loading ? 1 : 0.97 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/25 transition disabled:cursor-not-allowed disabled:from-slate-600 disabled:via-slate-600 disabled:to-slate-600 disabled:shadow-none"
      >
        <span className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <span className="relative">Сгенерировать</span>
      </motion.button>
    </motion.form>
  );
}
