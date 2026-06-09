import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

export type GenerationMode = "fast" | "quality";

export interface GenerateQuestionsResponse {
  url: string;
  questions: string[];
  page_title: string | null;
  mode: GenerationMode;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export async function generateQuestions(
  url: string,
  mode: GenerationMode = "fast",
): Promise<GenerateQuestionsResponse> {
  const timeout = mode === "quality" ? 300_000 : 120_000;
  const { data } = await api.post<GenerateQuestionsResponse>(
    "/llm/generate-questions",
    { url, mode },
    { timeout },
  );
  return data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const detail =
      data && typeof data === "object" && "detail" in data
        ? (data as { detail: unknown }).detail
        : undefined;

    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg: string }).msg)
            : String(item),
        )
        .join("; ");
      if (msg) return msg;
    }
    if (typeof data === "string" && data.trim()) return data;
    if (error.response?.status === 404) {
      return "Эндпоинт не найден. Проверьте, что бэкенд запущен.";
    }
    if (!error.response) {
      return "Не удалось подключиться к серверу. Проверьте бэкенд и CORS.";
    }
    return `Ошибка сервера (${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return "Произошла неизвестная ошибка";
}
