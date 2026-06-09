import { motion } from "framer-motion";

const STEPS = [
  { num: "01", text: "Вставьте ссылку или выберите пример" },
  { num: "02", text: "Выберите Fast или Quality режим" },
  { num: "03", text: "Получите 5 вопросов и экспортируйте результат" },
];

export function EmptyState() {
  return (
    <motion.div
      className="mt-10 grid gap-4 sm:grid-cols-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {STEPS.map((step, index) => (
        <motion.div
          key={step.num}
          className="glass-panel rounded-2xl p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
          whileHover={{ y: -4 }}
        >
          <span className="font-display text-3xl font-bold text-indigo-400/60">
            {step.num}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
