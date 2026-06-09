import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/30 bg-emerald-950/90 px-5 py-2.5 text-sm font-medium text-emerald-300 shadow-lg backdrop-blur-md"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          role="status"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
