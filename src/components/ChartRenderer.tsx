import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PrecomputedChartSeries } from '../types/analytics';

const CHART_COLORS = [
  '#2563EB',
  '#7C3AED',
  '#0EA5E9',
  '#4F46E5',
  '#0D9488',
  '#D97706',
  '#DC2626',
  '#64748B',
];

interface ChartRendererProps {
  series: PrecomputedChartSeries;
  height?: number;
}

function formatAxisNumber(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export function ChartRenderer({ series, height = 320 }: ChartRendererProps) {
  if (!series.data || series.data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500"
        style={{ height }}
      >
        No non-empty data points available for the selected columns.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {series.chartType === 'bar' ? (
          <BarChart data={series.data} margin={{ top: 10, right: 16, left: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
              interval={0}
              angle={series.data.length > 6 ? -20 : 0}
              textAnchor={series.data.length > 6 ? 'end' : 'middle'}
              height={series.data.length > 6 ? 52 : 30}
            />
            <YAxis
              tickFormatter={formatAxisNumber}
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), series.yColumn === '__row_count__' ? 'Records' : series.yColumn]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={52} />
          </BarChart>
        ) : series.chartType === 'line' ? (
          <LineChart data={series.data} margin={{ top: 10, right: 16, left: 4, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis
              tickFormatter={formatAxisNumber}
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), series.yColumn === '__row_count__' ? 'Records' : series.yColumn]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#2563EB', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#7C3AED' }}
            />
          </LineChart>
        ) : series.chartType === 'area' ? (
          <AreaChart data={series.data} margin={{ top: 10, right: 16, left: 4, bottom: 24 }}>
            <defs>
              <linearGradient id="areaBluePurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis
              tickFormatter={formatAxisNumber}
              tick={{ fontSize: 12, fill: '#475569' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), series.yColumn === '__row_count__' ? 'Records' : series.yColumn]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563EB"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#areaBluePurple)"
            />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={series.data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={104}
              paddingAngle={2}
            >
              {series.data.map((entry, idx) => (
                <Cell key={entry.label} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), series.yColumn === '__row_count__' ? 'Records' : series.yColumn]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
