import type { GenerationMode } from "../api/client";

export interface ExportData {
  url: string;
  pageTitle: string | null;
  questions: string[];
  mode: GenerationMode;
  exportedAt: string;
}

export function downloadJson(data: ExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(blob, `questions-${dateStamp()}.json`);
}

export function downloadCsv(data: ExportData): void {
  const rows = [
    ["url", "page_title", "mode", "question_number", "question"],
    ...data.questions.map((q, i) => [
      data.url,
      data.pageTitle ?? "",
      data.mode,
      String(i + 1),
      q,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, `questions-${dateStamp()}.csv`);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
