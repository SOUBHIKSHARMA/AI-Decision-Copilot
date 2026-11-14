import { useEffect, useMemo, useState } from 'react';
import { FileText, Menu, Upload } from 'lucide-react';
import { AiInsightsView } from './components/AiInsightsView';
import { AskDataView } from './components/AskDataView';
import { DashboardView } from './components/DashboardView';
import { DataExplorerView } from './components/DataExplorerView';
import { DataQualityView } from './components/DataQualityView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { UploadView } from './components/UploadView';
import { VisualizationsView } from './components/VisualizationsView';
import type {
  AiInsightsReport,
  AnalysisRecord,
  AppSettings,
  ChatMessage,
  NavSection,
} from './types/analytics';
import { parseCsvFile, parseCsvString, profileDataset } from './utils/dataProcessor';
import { SAMPLE_DATASETS, type SampleDatasetSpec } from './utils/sampleDatasets';
import {
  clearAllHistory,
  loadActiveId,
  loadHistory,
  loadSettings,
  saveActiveId,
  saveHistory,
  saveSettings,
} from './utils/storage';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload Dataset',
  explorer: 'Data Explorer',
  quality: 'Data Quality',
  visualizations: 'Visualizations',
  insights: 'AI Insights',
  chat: 'Ask Your Data',
  reports: 'Reports',
  settings: 'Settings',
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const [history, setHistory] = useState<AnalysisRecord[]>(() => loadHistory());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = loadActiveId();
    const list = loadHistory();
    if (saved && list.some((r) => r.id === saved)) return saved;
    return list[0]?.id ?? null;
  });
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Full rows kept in memory for active session; falls back to cached sampleRows after page reload
  const [inMemoryRowsById, setInMemoryRowsById] = useState<Record<string, Record<string, string>[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setAiAvailable(Boolean(data.aiAvailable)))
      .catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveActiveId(activeId);
  }, [activeId]);

  const activeRecord = useMemo(
    () => history.find((r) => r.id === activeId) ?? null,
    [history, activeId],
  );

  const activeRows = useMemo(() => {
    if (!activeRecord) return [];
    return inMemoryRowsById[activeRecord.id] ?? activeRecord.sampleRows;
  }, [activeRecord, inMemoryRowsById]);

  const isCachedPreviewOnly = Boolean(
    activeRecord &&
      !inMemoryRowsById[activeRecord.id] &&
      activeRecord.profile.totalRows > activeRecord.sampleRows.length,
  );

  const ingestDataset = (
    fileName: string,
    fileSizeBytes: number,
    headers: string[],
    rows: Record<string, string>[],
    isSample = false,
  ) => {
    const { profile, defaultCharts, sampleRows } = profileDataset(
      fileName,
      fileSizeBytes,
      headers,
      rows,
      {
        currencySymbol: settings.currencySymbol,
        compact: settings.compactNumbers,
        topN: settings.defaultTopN,
      },
    );

    const newId = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newRecord: AnalysisRecord = {
      id: newId,
      profile,
      sampleRows,
      defaultCharts,
      insights: null,
      chatHistory: [],
      isSample,
    };

    setInMemoryRowsById((prev) => ({ ...prev, [newId]: rows }));
    setHistory((prev) => [newRecord, ...prev]);
    setActiveId(newId);
  };

  const handleUploadFile = async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const { headers, rows } = await parseCsvFile(file);
      ingestDataset(file.name, file.size, headers, rows, false);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async (sample: SampleDatasetSpec) => {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const { headers, rows } = await parseCsvString(sample.csvContent);
      ingestDataset(sample.fileName, sample.csvContent.length, headers, rows, true);
      setActiveSection('dashboard');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to load sample dataset.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleSaveInsights = (recordId: string, insights: AiInsightsReport) => {
    setHistory((prev) =>
      prev.map((rec) => (rec.id === recordId ? { ...rec, insights } : rec)),
    );
  };

  const handleUpdateChat = (recordId: string, messages: ChatMessage[]) => {
    setHistory((prev) =>
      prev.map((rec) => (rec.id === recordId ? { ...rec, chatHistory: messages } : rec)),
    );
  };

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleClearHistory = () => {
    clearAllHistory();
    setHistory([]);
    setActiveId(null);
    setInMemoryRowsById({});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        hasActiveDataset={Boolean(activeRecord)}
        activeDatasetName={activeRecord?.profile.fileName}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-64 flex min-h-screen flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1-2 primary actions on right */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-display font-semibold text-slate-900 whitespace-nowrap">
                {SECTION_TITLES[activeSection]}
              </span>
              {activeRecord && (
                <>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span className="truncate font-mono text-xs text-slate-500">
                    {activeRecord.profile.fileName}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeRecord && activeSection !== 'reports' && (
              <button
                type="button"
                onClick={() => setActiveSection('reports')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Report</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveSection('upload')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload CSV</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {activeSection === 'dashboard' && (
              <DashboardView
                history={history}
                activeRecord={activeRecord}
                activeRows={activeRows}
                settings={settings}
                onNavigate={setActiveSection}
                onSelectRecord={(id) => setActiveId(id)}
                onDeleteRecord={handleDeleteRecord}
                onLoadFirstSample={() => void handleLoadSample(SAMPLE_DATASETS[0])}
              />
            )}

            {activeSection === 'upload' && (
              <UploadView
                activeRecord={activeRecord}
                isProcessing={isProcessing}
                error={uploadError}
                onUploadFile={handleUploadFile}
                onLoadSample={handleLoadSample}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'explorer' && (
              <DataExplorerView
                activeRecord={activeRecord}
                activeRows={activeRows}
                isCachedPreviewOnly={isCachedPreviewOnly}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'quality' && (
              <DataQualityView
                activeRecord={activeRecord}
                settings={settings}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'visualizations' && (
              <VisualizationsView
                activeRecord={activeRecord}
                activeRows={activeRows}
                isCachedPreviewOnly={isCachedPreviewOnly}
                settings={settings}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'insights' && (
              <AiInsightsView
                activeRecord={activeRecord}
                activeRows={activeRows}
                aiAvailable={aiAvailable}
                onSaveInsights={handleSaveInsights}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'chat' && (
              <AskDataView
                activeRecord={activeRecord}
                activeRows={activeRows}
                aiAvailable={aiAvailable}
                onUpdateChat={handleUpdateChat}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'reports' && (
              <ReportsView
                activeRecord={activeRecord}
                settings={settings}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                history={history}
                onClearHistory={handleClearHistory}
                aiAvailable={aiAvailable}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
