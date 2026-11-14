import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Bot, FileSpreadsheet, FileText, Trash2, Upload } from 'lucide-react';
import type { AnalysisRecord, AppSettings, NavSection } from '../types/analytics';
import { formatNumber, parseNumericValue } from '../utils/dataProcessor';
import { ChartRenderer } from './ChartRenderer';

interface DashboardViewProps {
  history: AnalysisRecord[];
  activeRecord: AnalysisRecord | null;
  activeRows: Record<string, string>[];
  settings: AppSettings;
  onNavigate: (section: NavSection) => void;
  onSelectRecord: (id: string) => void;
  onDeleteRecord: (id: string) => void;
  onLoadFirstSample: () => void;
}

export function DashboardView({
  history,
  activeRecord,
  activeRows,
  settings,
  onNavigate,
  onSelectRecord,
  onDeleteRecord,
  onLoadFirstSample,
}: DashboardViewProps) {
  const totalDatasetsAnalysed = history.length;
  const totalRowsAnalysed = history.reduce((sum, rec) => sum + rec.profile.totalRows, 0);
  const totalInsightsGenerated = history.reduce((sum, rec) => {
    if (!rec.insights) return sum;
    return (
      sum +
      rec.insights.keyFindings.length +
      rec.insights.importantTrends.length +
      rec.insights.anomalies.length +
      rec.insights.recommendations.length
    );
  }, 0);

  const numericColumns = activeRecord
    ? activeRecord.profile.columns.filter((c) => c.type === 'numeric' && c.numericStats)
    : [];

  const [customColumn, setCustomColumn] = useState<string>('');
  const selectedCustomCol =
    numericColumns.find((c) => c.name === customColumn) ?? numericColumns[0] ?? null;

  const activeRowsForCustom = useMemo(() => {
    if (!selectedCustomCol || activeRows.length === 0) return null;
    const vals = activeRows
      .map((r) => parseNumericValue(r[selectedCustomCol.name]))
      .filter((v): v is number => v !== null);
    return vals.length;
  }, [selectedCustomCol, activeRows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Business Intelligence Overview
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Upload any structured CSV dataset to compute real descriptive statistics, identify automated KPIs, visualize patterns, and generate grounded AI recommendations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!activeRecord && (
            <button
              type="button"
              onClick={onLoadFirstSample}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              <span>Load Sample CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>

      {/* Platform-wide actual calculated totals */}
      <section aria-label="Workspace Totals">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Total Datasets Analysed</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalDatasetsAnalysed.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Saved in local workspace history</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Total Rows Analysed</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalRowsAnalysed.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Across all processed CSV files</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Insights Generated</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {totalInsightsGenerated.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">Findings, trends, anomalies &amp; actions</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Active Dataset Completeness</div>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {activeRecord ? `${activeRecord.profile.completenessPercentage.toFixed(1)}%` : '—'}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {activeRecord ? `${activeRecord.profile.fileName} (${activeRecord.profile.totalRows.toLocaleString()} rows)` : 'Upload a CSV to profile'}
            </div>
          </div>
        </div>
      </section>

      {activeRecord ? (
        <>
          {/* Automated KPIs for active dataset */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Automated KPIs · {activeRecord.profile.fileName}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeRecord.profile.detectedDomain} · {activeRecord.profile.totalRows.toLocaleString()} rows · {activeRecord.profile.totalColumns} columns
                  {activeRecord.isSample ? ' · Sample Dataset' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('insights')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:text-purple-800 whitespace-nowrap shrink-0"
                >
                  <Bot className="h-4 w-4" />
                  <span>{activeRecord.insights ? 'View AI Insights' : 'Generate AI Insights'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                >
                  <FileText className="h-4 w-4" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {activeRecord.profile.automatedKpis.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {activeRecord.profile.automatedKpis.map((kpi) => (
                  <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="text-xs font-medium text-slate-500 truncate" title={kpi.label}>
                      {kpi.label}
                    </div>
                    <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                      {kpi.formattedValue}
                    </div>
                    <div className="mt-1.5 text-xs text-slate-500 truncate" title={kpi.calculationNote}>
                      {kpi.sourceColumn} · {kpi.calculationNote}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No numeric KPIs were automatically mapped from the current columns. Use the Column Metric Inspector below or open Data Quality to review all column statistics.
              </div>
            )}

            {/* Custom column selector + Unmapped metric explanation */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {selectedCustomCol?.numericStats && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Custom Numeric Column Analysis
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select any numeric column to inspect calculated metrics
                      </p>
                    </div>
                    <select
                      value={selectedCustomCol.name}
                      onChange={(e) => setCustomColumn(e.target.value)}
                      aria-label="Select numeric column for analysis"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
                    >
                      {numericColumns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-slate-500">Sum</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.sum, {
                          isCurrency: selectedCustomCol.isCurrency,
                          currencySymbol: settings.currencySymbol,
                          compact: settings.compactNumbers,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Mean</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.mean, {
                          isCurrency: selectedCustomCol.isCurrency,
                          isPercentage: selectedCustomCol.isPercentage,
                          currencySymbol: settings.currencySymbol,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Median</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.median, {
                          isCurrency: selectedCustomCol.isCurrency,
                          isPercentage: selectedCustomCol.isPercentage,
                          currencySymbol: settings.currencySymbol,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Minimum</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.min, {
                          isCurrency: selectedCustomCol.isCurrency,
                          isPercentage: selectedCustomCol.isPercentage,
                          currencySymbol: settings.currencySymbol,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Maximum</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.max, {
                          isCurrency: selectedCustomCol.isCurrency,
                          isPercentage: selectedCustomCol.isPercentage,
                          currencySymbol: settings.currencySymbol,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Std. Dev ({activeRowsForCustom ?? selectedCustomCol.numericStats.count} rows)</div>
                      <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {formatNumber(selectedCustomCol.numericStats.stdDev, {
                          isCurrency: selectedCustomCol.isCurrency,
                          currencySymbol: settings.currencySymbol,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeRecord.profile.unmappedKpis.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Omitted Standard Metrics
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Metrics excluded because required columns are not present in this dataset
                  </p>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {activeRecord.profile.unmappedKpis.slice(0, 4).map((note) => (
                      <li key={note.metric} className="py-2 text-xs">
                        <span className="font-medium text-slate-800">{note.metric}:</span>{' '}
                        <span className="text-slate-600">{note.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Real data visualization preview */}
          {activeRecord.defaultCharts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Key Dataset Trends &amp; Breakdowns
                  </h2>
                  <p className="text-xs text-slate-500">
                    Generated directly from {activeRecord.profile.fileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('visualizations')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Open Chart Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {activeRecord.defaultCharts.slice(0, 2).map((chart, index) => (
                  <div key={`${chart.title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-4">
                      <h3 className="font-display text-sm font-semibold text-slate-900">{chart.title}</h3>
                      <p className="text-xs text-slate-500">{chart.subtitle}</p>
                    </div>
                    <ChartRenderer series={chart} height={280} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">
            No Dataset Loaded Yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
            Upload a CSV file from your computer or load one of the clearly labeled sample datasets to automatically calculate KPIs, profile quality, and run AI analysis.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload CSV File</span>
            </button>
            <button
              type="button"
              onClick={onLoadFirstSample}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              <span>Try Sample Dataset</span>
            </button>
          </div>
        </section>
      )}

      {/* Recent Analysis History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Recent Analysis History
            </h2>
            <p className="text-xs text-slate-500">
              Persisted automatically in your browser localStorage across refreshes
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Your analyzed datasets will appear here once processed.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Dataset</th>
                    <th className="px-5 py-3">Domain</th>
                    <th className="px-5 py-3 text-right">Rows</th>
                    <th className="px-5 py-3 text-right">Columns</th>
                    <th className="px-5 py-3 text-right">Completeness</th>
                    <th className="px-5 py-3">AI Analysis</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((rec) => {
                    const isCurrent = activeRecord?.id === rec.id;
                    return (
                      <tr
                        key={rec.id}
                        className={`transition-colors hover:bg-slate-50 ${isCurrent ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">
                            {rec.profile.fileName}
                            {rec.isSample ? (
                              <span className="ml-2 text-xs font-normal text-purple-700">· Sample Data</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(rec.profile.uploadedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{rec.profile.detectedDomain}</td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-700">
                          {rec.profile.totalRows.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-700">
                          {rec.profile.totalColumns}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-700">
                          {rec.profile.completenessPercentage.toFixed(1)}%
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {rec.insights ? (
                            <span className="font-medium text-emerald-700">Generated</span>
                          ) : (
                            <span className="text-slate-500">Not run yet</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectRecord(rec.id)}
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                            >
                              {isCurrent ? 'Active' : 'Open'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectRecord(rec.id);
                                onNavigate('reports');
                              }}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                            >
                              Report
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRecord(rec.id)}
                              aria-label={`Remove ${rec.profile.fileName} from history`}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
