import type { AnalysisRecord, AppSettings } from '../types/analytics';

const HISTORY_KEY = 'ai_decision_copilot_history_v1';
const SETTINGS_KEY = 'ai_decision_copilot_settings_v1';
const ACTIVE_ID_KEY = 'ai_decision_copilot_active_id_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTopN: 10,
  currencySymbol: '$',
  compactNumbers: true,
};

export function loadHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: AnalysisRecord[]): void {
  try {
    // Keep up to 20 most recent datasets and trim sampleRows to 60 rows per saved record to respect localStorage quota
    const trimmed = records.slice(0, 20).map((rec) => ({
      ...rec,
      sampleRows: rec.sampleRows.slice(0, 60),
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Fallback: keep fewer records if storage quota is tight
    try {
      const minimal = records.slice(0, 8).map((rec) => ({
        ...rec,
        sampleRows: rec.sampleRows.slice(0, 25),
      }));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(minimal));
    } catch {
      // Ignore if storage is disabled
    }
  }
}

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id);
    else localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore storage errors
  }
}
