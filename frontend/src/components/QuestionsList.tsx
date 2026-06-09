import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { GenerationMode } from "../api/client";
import type { ExportData } from "../utils/export";
import { downloadCsv, downloadJson } from "../utils/export";

interface QuestionsListProps {
  url: string;
  pageTitle: string | null;
  mode: GenerationMode;
  questions: string[];
  onCopyAll: () => void;
  onCopyOne: (text: string) => void;
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
    </svg>
  );
}

const CARD_COLORS = [
  "from-indigo-500/20 to-transparent",
  "from-violet-500/20 to-transparent",
  "from-purple-500/20 to-transparent",
  "from-fuchsia-500/20 to-transparent",
  "from-cyan-500/20 to-transparent",
];

export function QuestionsList({
  url,
  pageTitle,
  mode,
  questions,
  onCopyAll,
  onCopyOne,
}: QuestionsListProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const exportData: ExportData = {
    url,
    pageTitle,
    questions,
    mode,
    exportedAt: new Date().toISOString(),
  };

  const handleCopyOne = (index: number, text: string) => {
    onCopyOne(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.section
      id="results"
      className="mt-8 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-primary">
              5 вопросов готово
              <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-normal text-indigo-300">
                {mode}
              </span>
            </p>
            {pageTitle && (
              <p className="mt-1 text-sm font-medium text-secondary">{pageTitle}</p>
            )}
            <p className="mt-0.5 truncate text-xs text-muted">{url}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onCopyAll} icon={<CopyIcon />} label="Копировать" />
          <ActionButton
            onClick={() => downloadJson(exportData)}
            icon={<DownloadIcon />}
            label="JSON"
          />
          <ActionButton
            onClick={() => downloadCsv(exportData)}
            icon={<DownloadIcon />}
            label="CSV"
          />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {questions.map((question, index) => (
          <motion.li
            key={`${index}-${question.slice(0, 24)}`}
            className="question-card group relative overflow-hidden rounded-2xl px-5 py-4"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${CARD_COLORS[index % CARD_COLORS.length]} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <div className="relative flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 font-display text-sm font-bold text-indigo-400">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 pt-0.5 leading-relaxed text-secondary">
                {question}
              </p>
              <button
                type="button"
                onClick={() => handleCopyOne(index, question)}
                title="Копировать вопрос"
                className="shrink-0 rounded-lg p-2 text-muted opacity-0 transition hover:bg-surface-hover hover:text-indigo-400 group-hover:opacity-100"
              >
                {copiedIndex === index ? (
                  <span className="text-xs text-emerald-400">✓</span>
                ) : (
                  <CopyIcon />
                )}
              </button>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 rounded-xl border border-theme px-3 py-2 text-sm font-medium text-secondary transition hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300"
    >
      {icon}
      {label}
    </motion.button>
  );
}
