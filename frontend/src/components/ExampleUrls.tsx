import { motion } from "framer-motion";

const EXAMPLES = [
  { label: "Example.com", url: "https://example.com" },
  {
    label: "Wikipedia · ML",
    url: "https://ru.wikipedia.org/wiki/Машинное_обучение",
  },
  {
    label: "GNU GPL",
    url: "https://www.gnu.org/licenses/gpl-3.0.ru.html",
  },
];

interface ExampleUrlsProps {
  disabled: boolean;
  onSelect: (url: string) => void;
}

export function ExampleUrls({ disabled, onSelect }: ExampleUrlsProps) {
  return (
    <motion.div
      className="mt-3 flex flex-wrap items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25 }}
    >
      <span className="text-xs text-muted">Попробовать:</span>
      {EXAMPLES.map((example) => (
        <button
          key={example.url}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(example.url)}
          className="rounded-full border border-theme px-3 py-1 text-xs font-medium text-secondary transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:opacity-50"
        >
          {example.label}
        </button>
      ))}
    </motion.div>
  );
}
