import { Upload } from 'lucide-react';
import type { AnalysisRecord, AppSettings, NavSection } from '../types/analytics';
import { formatNumber } from '../utils/dataProcessor';

interface DataQualityViewProps {
  activeRecord: AnalysisRecord | null;
  settings: AppSettings;
  onNavigate: (section: NavSection) => void;
}

export function DataQualityView({ activeRecord, settings, onNavigate }: DataQualityViewProps) {
  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file to generate missing value audits, duplicate checks, and numeric descriptive statistics.
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

  const { profile } = activeRecord;
  const numericColumns = profile.columns.filter((c) => c.type === 'numeric' && c.numericStats);
  const dateColumns = profile.columns.filter((c) => c.type === 'date' && c.dateStats);
  const totalMissingCells = profile.columns.reduce((acc, c) => acc + c.missingCount, 0);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Data Quality &amp; Statistical Profiling
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {profile.fileName} · Exact computed quality metrics and descriptive statistics
        </p>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Total Rows</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {profile.totalRows.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">Across {profile.totalColumns} columns</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Overall Completeness</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {profile.completenessPercentage.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {totalMissingCells.toLocaleString()} missing cells total
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Duplicate Records</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {profile.duplicateRows.toLocaleString()}
          </div>
          <div className={`mt-1 text-xs font-medium ${profile.duplicateRows > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {profile.duplicateRows > 0 ? 'Exact duplicate rows detected' : 'Zero exact duplicate rows'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Column Type Mix</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {numericColumns.length}N / {profile.columns.filter((c) => c.type === 'text').length}T / {dateColumns.length}D
          </div>
          <div className="mt-1 text-xs text-slate-500">Numeric · Text · Date columns</div>
        </div>
      </div>

      {/* Column Health & Missing Values Table */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Column Health &amp; Cardinality
          </h2>
          <p className="text-xs text-slate-500">
            Missing value counts, completeness bars, and unique cardinality per column
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-4 py-3">Column</th>
                  <th className="px-4 py-3">Data Type</th>
                  <th className="px-4 py-3 text-right">Non-Null</th>
                  <th className="px-4 py-3 text-right">Missing</th>
                  <th className="px-4 py-3 w-44">Completeness</th>
                  <th className="px-4 py-3 text-right">Unique Values</th>
                  <th className="px-4 py-3">Most Frequent Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.columns.map((col) => {
                  const completeness = 100 - col.missingPercentage;
                  const topVal = col.topValues[0];
                  return (
                    <tr key={col.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{col.name}</td>
                      <td className="px-4 py-3 text-xs font-medium capitalize text-slate-600">
                        {col.type}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {col.nonNullCount.toLocaleString()}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono tabular-nums ${
                          col.missingCount > 0 ? 'font-medium text-amber-700' : 'text-slate-600'
                        }`}
                      >
                        {col.missingCount.toLocaleString()} ({col.missingPercentage.toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                completeness >= 95
                                  ? 'bg-emerald-600'
                                  : completeness >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-rose-600'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, completeness))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums text-slate-600">
                            {completeness.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {col.uniqueCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                        {topVal ? `${topVal.value} (${topVal.count})` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Numeric Descriptive Statistics */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Numeric Descriptive Statistics
          </h2>
          <p className="text-xs text-slate-500">
            Calculated directly from all non-missing values in each numeric column
          </p>
        </div>

        {numericColumns.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No numeric columns were detected in this dataset.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Numeric Column</th>
                    <th className="px-4 py-3 text-right">Count</th>
                    <th className="px-4 py-3 text-right">Mean</th>
                    <th className="px-4 py-3 text-right">Median</th>
                    <th className="px-4 py-3 text-right">Min</th>
                    <th className="px-4 py-3 text-right">Max</th>
                    <th className="px-4 py-3 text-right">Std. Dev</th>
                    <th className="px-4 py-3 text-right">Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {numericColumns.map((col) => {
                    const s = col.numericStats!;
                    const fmtOpts = {
                      isCurrency: col.isCurrency,
                      isPercentage: col.isPercentage,
                      currencySymbol: settings.currencySymbol,
                    };
                    return (
                      <tr key={col.name} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{col.name}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {s.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                          {formatNumber(s.mean, fmtOpts)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatNumber(s.median, fmtOpts)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatNumber(s.min, fmtOpts)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatNumber(s.max, fmtOpts)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {formatNumber(s.stdDev, fmtOpts)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                          {formatNumber(s.sum, { ...fmtOpts, compact: settings.compactNumbers })}
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

      {/* Date Ranges & Numeric Correlations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {dateColumns.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Date Column Coverage
            </h3>
            <div className="divide-y divide-slate-100">
              {dateColumns.map((col) => (
                <div key={col.name} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{col.name}</div>
                    <div className="text-xs text-slate-500">
                      {col.dateStats!.count.toLocaleString()} valid dates
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums text-slate-700">
                    <div>
                      {col.dateStats!.minDate} → {col.dateStats!.maxDate}
                    </div>
                    <div className="text-slate-500">{col.dateStats!.spanDays.toLocaleString()} days span</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.correlations.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Strongest Numeric Correlations (Pearson r)
            </h3>
            <div className="divide-y divide-slate-100">
              {profile.correlations.map((pair) => {
                const abs = Math.abs(pair.coefficient);
                const strength = abs >= 0.7 ? 'Strong' : abs >= 0.4 ? 'Moderate' : 'Weak';
                return (
                  <div
                    key={`${pair.colA}-${pair.colB}`}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div className="text-slate-800">
                      <span className="font-medium">{pair.colA}</span>
                      <span className="mx-1.5 text-slate-400">×</span>
                      <span className="font-medium">{pair.colB}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                      <span className="text-slate-500">{strength}</span>
                      <span
                        className={`font-semibold ${
                          pair.coefficient >= 0.4
                            ? 'text-blue-700'
                            : pair.coefficient <= -0.4
                              ? 'text-purple-700'
                              : 'text-slate-700'
                        }`}
                      >
                        r = {pair.coefficient.toFixed(3)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
