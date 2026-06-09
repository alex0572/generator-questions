import { motion } from "framer-motion";

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <motion.div
      className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 backdrop-blur-sm"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      role="alert"
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-red-300">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}
