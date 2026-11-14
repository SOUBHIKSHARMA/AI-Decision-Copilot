import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type { AiInsightsReport, AnalysisRecord, NavSection } from '../types/analytics';
import { buildGeminiContextSummary } from '../utils/dataProcessor';

interface AiInsightsViewProps {
  activeRecord: AnalysisRecord | null;
  activeRows: Record<string, string>[];
  aiAvailable: boolean | null;
  onSaveInsights: (recordId: string, insights: AiInsightsReport) => void;
  onNavigate: (section: NavSection) => void;
}

export function AiInsightsView({
  activeRecord,
  activeRows,
  aiAvailable,
  onSaveInsights,
  onNavigate,
}: AiInsightsViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file first, then run AI-powered analysis grounded in your calculated dataset statistics.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Dataset</span>
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rows = activeRows.length > 0 ? activeRows : activeRecord.sampleRows;
      const datasetSummary = buildGeminiContextSummary(
        activeRecord.profile,
        rows,
        activeRecord.defaultCharts,
      );

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetSummary }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI analysis.');
      }

      onSaveInsights(activeRecord.id, data as AiInsightsReport);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reach Gemini AI service.');
    } finally {
      setIsLoading(false);
    }
  };

  const insights = activeRecord.insights;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            AI-Powered Data Analyst
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {activeRecord.profile.fileName} · Grounded strictly in computed statistics, quality metrics, and aggregated distributions
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void handleGenerate()}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {insights ? <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> : <Bot className="h-4 w-4" />}
          <span>{isLoading ? 'Analyzing Dataset...' : insights ? 'Regenerate Insights' : 'Generate AI Insights'}</span>
        </button>
      </div>

      {aiAvailable === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">AI Integration Unavailable</div>
          <p className="mt-1 text-amber-800">
            The server does not currently have a Gemini API key configured. CSV processing, descriptive statistics, automated KPIs, visualizations, and CSV exports continue to work normally without AI.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-semibold">AI Analysis Error</div>
            <div className="mt-0.5 text-rose-700">{error}</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
      )}

      {!isLoading && !insights && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">
            Ready to Analyze {activeRecord.profile.fileName}
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600">
            AI Decision Copilot sends only your calculated statistics, automated KPIs, correlations, and top aggregations to Gemini to produce an executive summary, trends, anomalies, and prioritized recommendations.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            <Bot className="h-4 w-4" />
            <span>Generate Executive Analysis</span>
          </button>
        </div>
      )}

      {!isLoading && insights && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-900">
                1. Executive Summary
              </h2>
              <span className="text-xs text-slate-500">
                Generated {new Date(insights.generatedAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {insights.executiveSummary}
            </p>
          </section>

          {/* Key Findings */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                2. Key Findings
              </h2>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {insights.keyFindings.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  <p className="mt-1.5 font-mono text-xs text-blue-700">
                    Evidence: {item.evidence}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Important Trends & Anomalies */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  3. Important Trends
                </h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {insights.importantTrends.map((item, idx) => (
                  <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    <p className="mt-1.5 font-mono text-xs text-slate-500">
                      Evidence: {item.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  4. Anomalies &amp; Unusual Observations
                </h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {insights.anomalies.map((item, idx) => (
                  <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    <p className="mt-1.5 font-mono text-xs text-amber-700">
                      Evidence: {item.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Business Implications */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
              5. Business Implications
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700 list-disc pl-5">
              {insights.businessImplications.map((imp, idx) => (
                <li key={idx}>{imp}</li>
              ))}
            </ul>
          </section>

          {/* Actionable Recommendations */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lightbulb className="h-4 w-4 text-purple-600" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                6. Actionable Recommendations
              </h2>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {insights.recommendations.map((rec, idx) => {
                const priorityColor =
                  rec.priority === 'High'
                    ? 'text-rose-700'
                    : rec.priority === 'Medium'
                      ? 'text-amber-700'
                      : 'text-slate-600';
                return (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      <span className={priorityColor}>{rec.priority} Priority</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500">Expected Impact: {rec.expectedImpact}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{rec.action}</h3>
                    <p className="mt-1 text-sm text-slate-600">{rec.rationale}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Evidence Limitations */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-600">
              Evidence &amp; Scope Limitations
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">{insights.evidenceLimitations}</p>
          </section>
        </div>
      )}
    </div>
  );
}
