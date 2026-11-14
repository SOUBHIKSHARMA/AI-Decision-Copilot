import { Bot, Download, Printer, Upload } from 'lucide-react';
import type { AnalysisRecord, AppSettings, NavSection } from '../types/analytics';
import { formatNumber } from '../utils/dataProcessor';
import { ChartRenderer } from './ChartRenderer';

interface ReportsViewProps {
  activeRecord: AnalysisRecord | null;
  settings: AppSettings;
  onNavigate: (section: NavSection) => void;
}

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ReportsView({ activeRecord, settings, onNavigate }: ReportsViewProps) {
  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file to compile a downloadable CSV summary and printable executive report.
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

  const { profile, defaultCharts, insights } = activeRecord;
  const numericColumns = profile.columns.filter((c) => c.type === 'numeric' && c.numericStats);

  const handleDownloadCsvReport = () => {
    const lines: string[] = [];
    lines.push(['Section', 'Metric / Column', 'Value', 'Detail / Evidence'].map(escapeCsvCell).join(','));

    lines.push(['Dataset Overview', 'File Name', profile.fileName, profile.detectedDomain].map(escapeCsvCell).join(','));
    lines.push(['Dataset Overview', 'Total Rows', profile.totalRows, ''].map(escapeCsvCell).join(','));
    lines.push(['Dataset Overview', 'Total Columns', profile.totalColumns, ''].map(escapeCsvCell).join(','));
    lines.push(['Dataset Overview', 'Duplicate Rows', profile.duplicateRows, ''].map(escapeCsvCell).join(','));
    lines.push(['Dataset Overview', 'Completeness %', `${profile.completenessPercentage.toFixed(1)}%`, ''].map(escapeCsvCell).join(','));

    for (const kpi of profile.automatedKpis) {
      lines.push(['Automated KPI', kpi.label, kpi.formattedValue, `${kpi.sourceColumn} — ${kpi.calculationNote}`].map(escapeCsvCell).join(','));
    }

    for (const col of profile.columns) {
      const statDetail = col.numericStats
        ? `Mean=${col.numericStats.mean.toFixed(2)}, Median=${col.numericStats.median.toFixed(2)}, Min=${col.numericStats.min.toFixed(2)}, Max=${col.numericStats.max.toFixed(2)}, StdDev=${col.numericStats.stdDev.toFixed(2)}`
        : col.dateStats
          ? `${col.dateStats.minDate} to ${col.dateStats.maxDate}`
          : `Top: ${col.topValues[0]?.value ?? 'N/A'}`;
      lines.push(
        [
          'Column Profile',
          col.name,
          `${col.type} (${col.uniqueCount} unique, ${col.missingCount} missing)`,
          statDetail,
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }

    if (insights) {
      lines.push(['AI Executive Summary', 'Summary', insights.executiveSummary, insights.generatedAt].map(escapeCsvCell).join(','));
      for (const f of insights.keyFindings) {
        lines.push(['AI Key Finding', f.title, f.detail, f.evidence].map(escapeCsvCell).join(','));
      }
      for (const t of insights.importantTrends) {
        lines.push(['AI Trend', t.title, t.detail, t.evidence].map(escapeCsvCell).join(','));
      }
      for (const a of insights.anomalies) {
        lines.push(['AI Anomaly', a.title, a.detail, a.evidence].map(escapeCsvCell).join(','));
      }
      for (const r of insights.recommendations) {
        lines.push(['AI Recommendation', `${r.priority}: ${r.action}`, r.rationale, `Impact: ${r.expectedImpact}`].map(escapeCsvCell).join(','));
      }
    }

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = profile.fileName.replace(/\.csv$/i, '');
    link.href = url;
    link.setAttribute('download', `${baseName}_analysis_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      charts: defaultCharts,
      aiInsights: insights,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = profile.fileName.replace(/\.csv$/i, '');
    link.href = url;
    link.setAttribute('download', `${baseName}_report.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Executive Analysis Report
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Compiled KPIs, data quality metrics, charts, and AI findings for {profile.fileName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsvReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download CSV Report</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJsonReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Report Document Container */}
      <div className="space-y-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        {/* Report Title Banner */}
        <div className="border-b border-slate-200 pb-6">
          <div className="text-xs font-medium uppercase tracking-wider text-blue-700">
            AI Decision Copilot · Analytical Report
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            {profile.fileName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{profile.detectedDomain}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.totalRows.toLocaleString()} rows</span>
            <span aria-hidden="true">·</span>
            <span>{profile.totalColumns} columns</span>
            <span aria-hidden="true">·</span>
            <span>Uploaded {new Date(profile.uploadedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Section 1: Automated KPIs */}
        <section className="print-break-inside-avoid space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            1. Key Performance Indicators
          </h3>
          {profile.automatedKpis.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.automatedKpis.map((kpi) => (
                <div key={kpi.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                    {kpi.formattedValue}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{kpi.calculationNote}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No standard financial or conversion KPIs were matched to the available columns.
            </p>
          )}
        </section>

        {/* Section 2: Data Quality & Descriptive Statistics */}
        <section className="print-break-inside-avoid space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            2. Data Quality &amp; Statistical Profile
          </h3>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Completeness</div>
              <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                {profile.completenessPercentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Duplicate Rows</div>
              <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                {profile.duplicateRows.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Numeric Columns</div>
              <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                {numericColumns.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Missing Cells</div>
              <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-900">
                {profile.columns.reduce((acc, c) => acc + c.missingCount, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {numericColumns.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Column</th>
                    <th className="px-3.5 py-2.5 text-right">Mean</th>
                    <th className="px-3.5 py-2.5 text-right">Median</th>
                    <th className="px-3.5 py-2.5 text-right">Min</th>
                    <th className="px-3.5 py-2.5 text-right">Max</th>
                    <th className="px-3.5 py-2.5 text-right">Std. Dev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {numericColumns.map((col) => {
                    const s = col.numericStats!;
                    const opts = {
                      isCurrency: col.isCurrency,
                      isPercentage: col.isPercentage,
                      currencySymbol: settings.currencySymbol,
                    };
                    return (
                      <tr key={col.name}>
                        <td className="px-3.5 py-2 font-medium text-slate-900">{col.name}</td>
                        <td className="px-3.5 py-2 text-right font-mono tabular-nums">{formatNumber(s.mean, opts)}</td>
                        <td className="px-3.5 py-2 text-right font-mono tabular-nums">{formatNumber(s.median, opts)}</td>
                        <td className="px-3.5 py-2 text-right font-mono tabular-nums">{formatNumber(s.min, opts)}</td>
                        <td className="px-3.5 py-2 text-right font-mono tabular-nums">{formatNumber(s.max, opts)}</td>
                        <td className="px-3.5 py-2 text-right font-mono tabular-nums">{formatNumber(s.stdDev, opts)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 3: Visualizations */}
        {defaultCharts.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              3. Key Visualizations
            </h3>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {defaultCharts.map((chart, i) => (
                <div
                  key={`${chart.title}-${i}`}
                  className="print-break-inside-avoid rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-slate-900">{chart.title}</div>
                    <div className="text-xs text-slate-500">{chart.subtitle}</div>
                  </div>
                  <ChartRenderer series={chart} height={240} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: AI Insights */}
        <section className="print-break-inside-avoid space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            4. AI-Generated Business Insights &amp; Recommendations
          </h3>

          {insights ? (
            <div className="space-y-5 text-sm">
              <div>
                <div className="font-semibold text-slate-900">Executive Summary</div>
                <p className="mt-1 leading-relaxed text-slate-700">{insights.executiveSummary}</p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Key Findings</div>
                <ul className="mt-2 space-y-2">
                  {insights.keyFindings.map((item, idx) => (
                    <li key={idx} className="text-slate-700">
                      <span className="font-medium text-slate-900">{item.title}:</span> {item.detail}{' '}
                      <span className="font-mono text-xs text-blue-700">({item.evidence})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Actionable Recommendations</div>
                <ul className="mt-2 space-y-2">
                  {insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-slate-700">
                      <span className="font-medium text-slate-900">
                        [{rec.priority}] {rec.action}:
                      </span>{' '}
                      {rec.rationale} (Expected impact: {rec.expectedImpact})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="no-print flex flex-col items-start justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="text-sm text-slate-600">
                AI Insights have not been generated for this dataset yet. Generate insights to include them in your printed or CSV report.
              </div>
              <button
                type="button"
                onClick={() => onNavigate('insights')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-purple-700 whitespace-nowrap shrink-0"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Generate AI Insights</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
