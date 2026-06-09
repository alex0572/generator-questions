import type { GenerationMode } from "../api/client";
import { generateId } from "./generateId";

export interface HistoryEntry {
  id: string;
  url: string;
  pageTitle: string | null;
  questions: string[];
  mode: GenerationMode;
  createdAt: string;
}

const STORAGE_KEY = "questions-history";
const MAX_ENTRIES = 5;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "id" | "createdAt">): void {
  const newEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const history = loadHistory().filter((h) => h.url !== entry.url);
  const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
