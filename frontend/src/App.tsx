import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  generateQuestions,
  getErrorMessage,
  type GenerationMode,
} from "./api/client";
import { Background } from "./components/Background";
import { EmptyState } from "./components/EmptyState";
import { ErrorMessage } from "./components/ErrorMessage";
import { ExampleUrls } from "./components/ExampleUrls";
import { HistoryPanel } from "./components/HistoryPanel";
import { Loader } from "./components/Loader";
import { ModeToggle } from "./components/ModeToggle";
import { QuestionsList } from "./components/QuestionsList";
import { ThemeToggle } from "./components/ThemeToggle";
import { Toast } from "./components/Toast";
import { UrlForm } from "./components/UrlForm";
import { useTheme } from "./hooks/useTheme";
import {
  clearHistory,
  loadHistory,
  saveToHistory,
  type HistoryEntry,
} from "./utils/history";
import { isValidSiteAddress } from "./utils/validateUrl";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<GenerationMode>("fast");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [resultMode, setResultMode] = useState<GenerationMode>("fast");
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const applyResult = useCallback(
    (data: {
      url: string;
      questions: string[];
      page_title: string | null;
      mode: GenerationMode;
    }) => {
      setQuestions(data.questions);
      setPageTitle(data.page_title);
      setSubmittedUrl(data.url);
      setResultMode(data.mode);
      saveToHistory({
        url: data.url,
        pageTitle: data.page_title,
        questions: data.questions,
        mode: data.mode,
      });
      setHistory(loadHistory());
    },
    [],
  );

  const handleCopyAll = useCallback(async () => {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await navigator.clipboard.writeText(text);
    showToast("Все вопросы скопированы");
  }, [questions, showToast]);

  const handleCopyOne = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      showToast("Вопрос скопирован");
    },
    [showToast],
  );

  const runGeneration = async (targetUrl: string, targetMode: GenerationMode) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    if (!isValidSiteAddress(trimmed)) {
      setError("Введите корректный адрес сайта, например: example.com");
      return;
    }

    setLoading(true);
    setError(null);
    setQuestions([]);
    setPageTitle(null);
    setSubmittedUrl(trimmed);

    try {
      const data = await generateQuestions(trimmed, targetMode);
      applyResult(data);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmittedUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => runGeneration(url, mode);

  const handleHistorySelect = (entry: HistoryEntry) => {
    setUrl(entry.url);
    setMode(entry.mode);
    applyResult({
      url: entry.url,
      questions: entry.questions,
      page_title: entry.pageTitle,
      mode: entry.mode,
    });
    setHistoryOpen(false);
    showToast("Загружено из истории");
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    showToast("История очищена");
  };

  const hasResults = questions.length > 0 && submittedUrl;

  return (
    <>
      <Background />
      <AnimatePresence>
        {loading && <Loader mode={mode} />}
      </AnimatePresence>
      <Toast message={toast} />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 text-center">
          <motion.div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </motion.div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            <span className="gradient-title animate-gradient-text bg-clip-text text-transparent">
              Генератор вопросов
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Вставьте ссылку — AI сформулирует 5 вопросов, которые могли бы
            задать пользователи после прочтения страницы
          </p>
        </header>

        <UrlForm
          url={url}
          loading={loading}
          onUrlChange={setUrl}
          onSubmit={handleSubmit}
        />

        <ModeToggle mode={mode} disabled={loading} onChange={setMode} />
        <ExampleUrls
          disabled={loading}
          onSelect={(exampleUrl) => {
            setUrl(exampleUrl);
            runGeneration(exampleUrl, mode);
          }}
        />

        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <HistoryPanel
          history={history}
          open={historyOpen}
          onToggle={() => setHistoryOpen((v) => !v)}
          onSelect={handleHistorySelect}
          onClear={handleClearHistory}
        />

        {hasResults ? (
          <QuestionsList
            url={submittedUrl}
            pageTitle={pageTitle}
            mode={resultMode}
            questions={questions}
            onCopyAll={handleCopyAll}
            onCopyOne={handleCopyOne}
          />
        ) : (
          !loading && <EmptyState />
        )}

        <footer className="mt-auto flex flex-col items-center gap-3 pt-16 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted">Powered by GPT-4o · ProxyAPI</p>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </footer>
      </main>
    </>
  );
}
