import { useState } from 'react';
import { CheckCircle2, Download, Trash2 } from 'lucide-react';
import type { AnalysisRecord, AppSettings } from '../types/analytics';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  history: AnalysisRecord[];
  onClearHistory: () => void;
  aiAvailable: boolean | null;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  history,
  onClearHistory,
  aiAvailable,
}: SettingsViewProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (next: AppSettings) => {
    onUpdateSettings(next);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleExportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ai_decision_copilot_history.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Workspace Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Configure formatting defaults, inspect AI service availability, and manage local browser storage
        </p>
      </div>

      {/* Display & Chart Defaults */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Formatting &amp; Chart Defaults
            </h2>
            <p className="text-xs text-slate-500">
              Applied to KPI cards, statistical tables, and newly built charts
            </p>
          </div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Saved</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="setting-topn" className="block text-xs font-medium text-slate-700">
              Default Chart Category Limit
            </label>
            <select
              id="setting-topn"
              value={settings.defaultTopN}
              onChange={(e) => handleSave({ ...settings, defaultTopN: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value={5}>Top 5 categories</option>
              <option value={10}>Top 10 categories</option>
              <option value={15}>Top 15 categories</option>
              <option value={20}>Top 20 categories</option>
            </select>
          </div>

          <div>
            <label htmlFor="setting-currency" className="block text-xs font-medium text-slate-700">
              Default Currency Symbol
            </label>
            <select
              id="setting-currency"
              value={settings.currencySymbol}
              onChange={(e) => handleSave({ ...settings, currencySymbol: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="$">$ (USD / Dollar)</option>
              <option value="€">€ (EUR / Euro)</option>
              <option value="£">£ (GBP / Pound)</option>
              <option value="₹">₹ (INR / Rupee)</option>
              <option value="¥">¥ (JPY / Yen)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <div className="text-sm font-medium text-slate-900">Compact Large Numbers</div>
            <div className="text-xs text-slate-500">
              Format totals above 10,000 as 12.4K or 1.25M on KPI cards
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.compactNumbers}
            onClick={() => handleSave({ ...settings, compactNumbers: !settings.compactNumbers })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              settings.compactNumbers ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                settings.compactNumbers ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* AI Integration Status */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Gemini AI Service Integration
        </h2>
        <p className="text-sm text-slate-600">
          {aiAvailable === true
            ? 'Server-side Gemini integration is active and ready for Executive Insights and Ask Your Data Q&A.'
            : aiAvailable === false
              ? 'Server-side Gemini integration is currently unavailable. CSV parsing, statistical profiling, automated KPIs, visualizations, and report downloads remain fully functional.'
              : 'Checking server-side Gemini availability...'}
        </p>
      </section>

      {/* LocalStorage History Management */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Local Browser Storage ({history.length} saved datasets)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Analysis profiles, KPIs, AI insights, and chat logs are stored locally in your browser via localStorage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleExportHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export All History (JSON)</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              disabled={history.length === 0}
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Local History</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-rose-700"
              >
                Confirm Delete All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
