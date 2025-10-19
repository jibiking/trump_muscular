import { AUTO_RESULT_DELAY_MS, RESULT_STORAGE_KEY, SESSION_SETTINGS_KEY } from './constants';
import {
  type CustomSessionSettings,
  type SessionSettings,
  buildInitialTotals,
  isValidCustomSettings,
  suits
} from './deck';

export interface ResultHistoryEntry {
  order: number;
  key: string;
  suit: string;
  glyph: string;
  rank: string;
  value: number;
  exercise: string;
}

export interface ResultSnapshot {
  version: number;
  completedAt: number;
  startedAt: number;
  durationSeconds: number;
  totals: Record<string, number>;
  history: ResultHistoryEntry[];
  draws: number;
  totalReps: number;
  totalCards: number;
  settings: SessionSettings;
}

export function loadSessionSettings(): SessionSettings {
  try {
    const raw = sessionStorage.getItem(SESSION_SETTINGS_KEY);
    if (!raw) {
      return { mode: 'default' };
    }
    const parsed: SessionSettings = JSON.parse(raw);
    if (parsed.mode === 'custom' && isValidCustomSettings(parsed)) {
      return { mode: 'custom', maxValue: parsed.maxValue } satisfies CustomSessionSettings;
    }
  } catch (error) {
    console.warn('セッション設定の読み込みに失敗しました', error);
  }
  return { mode: 'default' };
}

export function saveSessionSettings(settings: SessionSettings) {
  sessionStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSessionSettings() {
  sessionStorage.removeItem(SESSION_SETTINGS_KEY);
}

export function saveResultSnapshot(snapshot: ResultSnapshot) {
  sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadResultSnapshot(): ResultSnapshot | null {
  try {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: ResultSnapshot = JSON.parse(raw);
    if (!Array.isArray(parsed.history) || parsed.history.length === 0) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('リザルトデータの読み込みに失敗しました', error);
    return null;
  }
}

export function clearResultSnapshot() {
  sessionStorage.removeItem(RESULT_STORAGE_KEY);
}

export function buildEmptyResultSnapshot(settings: SessionSettings): ResultSnapshot {
  const totalCards =
    settings.mode === 'custom'
      ? Math.max(0, settings.maxValue) * suits.length
      : suits.length * 13;
  return {
    version: 1,
    completedAt: Date.now(),
    startedAt: Date.now(),
    durationSeconds: 0,
    totals: buildInitialTotals(),
    history: [],
    draws: 0,
    totalReps: 0,
    totalCards,
    settings
  };
}

export const AUTO_RESULT_DELAY = AUTO_RESULT_DELAY_MS;
