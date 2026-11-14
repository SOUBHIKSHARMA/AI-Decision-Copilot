export type ColumnType = 'numeric' | 'date' | 'text';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

export type NavSection =
  | 'dashboard'
  | 'upload'
  | 'explorer'
  | 'quality'
  | 'visualizations'
  | 'insights'
  | 'chat'
  | 'reports'
  | 'settings';

export interface NumericStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
}

export interface DateStats {
  count: number;
  minDate: string;
  maxDate: string;
  spanDays: number;
}

export interface CategoryFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  isCurrency: boolean;
  isPercentage: boolean;
  totalCount: number;
  nonNullCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  sampleValues: string[];
  numericStats?: NumericStats;
  dateStats?: DateStats;
  topValues: CategoryFrequency[];
}

export interface AutomatedKpi {
  id: string;
  label: string;
  formattedValue: string;
  rawValue: number;
  sourceColumn: string;
  calculationNote: string;
  format: 'currency' | 'number' | 'percentage';
}

export interface UnmappedKpiNote {
  metric: string;
  reason: string;
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  coefficient: number;
}

export interface DatasetProfile {
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  totalRows: number;
  totalColumns: number;
  duplicateRows: number;
  completenessPercentage: number;
  columns: ColumnProfile[];
  automatedKpis: AutomatedKpi[];
  unmappedKpis: UnmappedKpiNote[];
  correlations: CorrelationPair[];
  detectedDomain: string;
}

export interface InsightItem {
  title: string;
  detail: string;
  evidence: string;
}

export interface RecommendationItem {
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  expectedImpact: string;
  rationale: string;
}

export interface AiInsightsReport {
  generatedAt: string;
  executiveSummary: string;
  keyFindings: InsightItem[];
  importantTrends: InsightItem[];
  anomalies: InsightItem[];
  businessImplications: string[];
  recommendations: RecommendationItem[];
  evidenceLimitations: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface PrecomputedChartSeries {
  title: string;
  subtitle: string;
  xColumn: string;
  yColumn: string;
  aggregation: AggregationType;
  chartType: ChartType;
  data: Array<{ label: string; value: number; count: number }>;
}

export interface AnalysisRecord {
  id: string;
  profile: DatasetProfile;
  sampleRows: Record<string, string>[];
  defaultCharts: PrecomputedChartSeries[];
  insights: AiInsightsReport | null;
  chatHistory: ChatMessage[];
  isSample?: boolean;
}

export interface AppSettings {
  defaultTopN: number;
  currencySymbol: string;
  compactNumbers: boolean;
}
