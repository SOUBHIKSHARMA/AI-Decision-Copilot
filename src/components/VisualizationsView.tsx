import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Upload } from 'lucide-react';
import type {
  AggregationType,
  AnalysisRecord,
  AppSettings,
  ChartType,
  NavSection,
} from '../types/analytics';
import { buildChartSeries } from '../utils/dataProcessor';
import { ChartRenderer } from './ChartRenderer';

interface VisualizationsViewProps {
  activeRecord: AnalysisRecord | null;
  activeRows: Record<string, string>[];
  isCachedPreviewOnly: boolean;
  settings: AppSettings;
  onNavigate: (section: NavSection) => void;
}

export function VisualizationsView({
  activeRecord,
  activeRows,
  isCachedPreviewOnly,
  settings,
  onNavigate,
}: VisualizationsViewProps) {
  const columns = activeRecord?.profile.columns ?? [];
  const xCandidates = useMemo(
    () => columns.filter((c) => c.type === 'date' || c.type === 'text'),
    [columns],
  );
  const numericCandidates = useMemo(
    () => columns.filter((c) => c.type === 'numeric'),
    [columns],
  );

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('__row_count__');
  const [aggregation, setAggregation] = useState<AggregationType>('sum');
  const [topN, setTopN] = useState<number>(settings.defaultTopN);

  useEffect(() => {
    if (!activeRecord) return;
    const defaultX =
      xCandidates.find((c) => c.type === 'text' && c.uniqueCount >= 2 && c.uniqueCount <= 25)?.name ??
      xCandidates[0]?.name ??
      columns[0]?.name ??
      '';
    const defaultY = numericCandidates[0]?.name ?? '__row_count__';
    setXCol(defaultX);
    setYCol(defaultY);
    setAggregation(defaultY === '__row_count__' ? 'count' : 'sum');
    setChartType(columns.find((c) => c.name === defaultX)?.type === 'date' ? 'line' : 'bar');
  }, [activeRecord?.id]);

  const effectiveX = columns.some((c) => c.name === xCol)
    ? xCol
    : xCandidates[0]?.name ?? columns[0]?.name ?? '';
  const effectiveY =
    yCol === '__row_count__' || numericCandidates.some((c) => c.name === yCol)
      ? yCol
      : numericCandidates[0]?.name ?? '__row_count__';

  const sourceRows = activeRows.length > 0 ? activeRows : activeRecord?.sampleRows ?? [];

  const customSeries = useMemo(() => {
    if (!activeRecord || !effectiveX || sourceRows.length === 0) return null;
    const effectiveAgg: AggregationType = effectiveY === '__row_count__' ? 'count' : aggregation;
    return buildChartSeries(
      sourceRows,
      activeRecord.profile.columns,
      effectiveX,
      effectiveY,
      effectiveAgg,
      chartType,
      topN,
    );
  }, [activeRecord, sourceRows, effectiveX, effectiveY, aggregation, chartType, topN]);

  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file to build interactive bar, line, area, and pie charts from your data.
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

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Interactive Visualizations
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {activeRecord.profile.fileName} · Select dimensions, metrics, aggregations, and chart types
          {isCachedPreviewOnly
            ? ' · Custom builder uses cached preview rows after browser reload; overview charts below reflect full upload totals'
            : ''}
        </p>
      </div>

      {/* Interactive Chart Builder */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Custom Chart Builder
            </h2>
            <p className="text-xs text-slate-500">
              Explore any category comparison or time-based trend directly from your dataset
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['bar', 'line', 'area', 'pie'] as ChartType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChartType(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  chartType === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="viz-x-col" className="block text-xs font-medium text-slate-600">
              X-Axis / Group By Column
            </label>
            <select
              id="viz-x-col"
              value={effectiveX}
              onChange={(e) => setXCol(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="viz-y-col" className="block text-xs font-medium text-slate-600">
              Y-Axis Metric
            </label>
            <select
              id="viz-y-col"
              value={effectiveY}
              onChange={(e) => {
                const val = e.target.value;
                setYCol(val);
                if (val === '__row_count__') setAggregation('count');
                else if (aggregation === 'count') setAggregation('sum');
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {numericCandidates.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="__row_count__">Row Count (Frequency)</option>
            </select>
          </div>

          <div>
            <label htmlFor="viz-agg" className="block text-xs font-medium text-slate-600">
              Aggregation
            </label>
            <select
              id="viz-agg"
              value={effectiveY === '__row_count__' ? 'count' : aggregation}
              disabled={effectiveY === '__row_count__'}
              onChange={(e) => setAggregation(e.target.value as AggregationType)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="sum">Sum</option>
              <option value="avg">Average (Mean)</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="count">Count</option>
            </select>
          </div>

          <div>
            <label htmlFor="viz-topn" className="block text-xs font-medium text-slate-600">
              Max Categories
            </label>
            <select
              id="viz-topn"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
            </select>
          </div>
        </div>

        {customSeries ? (
          <div className="pt-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  {customSeries.title}
                </h3>
                <p className="text-xs text-slate-500">{customSeries.subtitle}</p>
              </div>
              <div className="font-mono text-xs text-slate-500 tabular-nums">
                {customSeries.data.length} plotted points
              </div>
            </div>
            <ChartRenderer series={customSeries} height={360} />
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            Select columns above to render a chart.
          </div>
        )}
      </section>

      {/* Auto-Generated Overview Charts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Automated Dataset Charts
            </h2>
            <p className="text-xs text-slate-500">
              Computed from the complete uploaded dataset across detected date and categorical dimensions
            </p>
          </div>
        </div>

        {activeRecord.defaultCharts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No automatic category or time-series charts were generated for this schema. Use the Custom Chart Builder above to visualize any columns.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {activeRecord.defaultCharts.map((chart, idx) => (
              <div
                key={`${chart.title}-${idx}`}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">{chart.title}</h3>
                  <p className="text-xs text-slate-500">{chart.subtitle}</p>
                </div>
                <ChartRenderer series={chart} height={300} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
