import Papa from 'papaparse';
import type {
  AggregationType,
  AutomatedKpi,
  CategoryFrequency,
  ChartType,
  ColumnProfile,
  ColumnType,
  CorrelationPair,
  DatasetProfile,
  DateStats,
  NumericStats,
  PrecomputedChartSeries,
  UnmappedKpiNote,
} from '../types/analytics';

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseNumericValue(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'na') {
    return null;
  }
  const cleaned = trimmed
    .replace(/[$€£¥,\s]/g, '')
    .replace(/%$/, '');
  if (!cleaned || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseDateValue(raw: string | undefined | null): Date | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.length < 6) return null;
  // Reject pure numbers (e.g., IDs, years alone, zip codes)
  if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return null;
  // Require date-like separators or month name
  const hasDatePattern =
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed) ||
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(trimmed) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed) ||
    /\d{4}-\d{2}/.test(trimmed);
  if (!hasDatePattern) return null;

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  if (year < 1950 || year > 2100) return null;
  return date;
}

export function formatNumber(
  value: number,
  options: { isCurrency?: boolean; isPercentage?: boolean; currencySymbol?: string; compact?: boolean; decimals?: number } = {},
): string {
  const { isCurrency = false, isPercentage = false, currencySymbol = '$', compact = false, decimals } = options;
  if (!Number.isFinite(value)) return '—';

  if (isPercentage) {
    const d = decimals ?? 1;
    return `${value.toFixed(d)}%`;
  }

  const abs = Math.abs(value);
  let formatted: string;
  if (compact && abs >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(2)}M`;
  } else if (compact && abs >= 10_000) {
    formatted = `${(value / 1_000).toFixed(1)}K`;
  } else {
    const inferredDecimals = decimals ?? (Number.isInteger(value) ? 0 : abs < 10 ? 2 : 2);
    formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: inferredDecimals,
      maximumFractionDigits: inferredDecimals,
    });
  }

  if (isCurrency) {
    return value < 0 ? `-${currencySymbol}${formatted.replace('-', '')}` : `${currencySymbol}${formatted}`;
  }
  return formatted;
}

export function parseCsvString(csvText: string): Promise<ParsedCsvResult> {
  return new Promise((resolve, reject) => {
    const trimmed = csvText.trim();
    if (!trimmed) {
      reject(new Error('The uploaded CSV file is empty.'));
      return;
    }

    Papa.parse<Record<string, unknown>>(trimmed, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = (results.meta.fields || []).filter((h) => h.length > 0);
        if (headers.length === 0) {
          reject(new Error('No valid column headers were detected in the CSV file.'));
          return;
        }
        const rows: Record<string, string>[] = results.data
          .map((rawRow) => {
            const cleanRow: Record<string, string> = {};
            let hasAnyValue = false;
            for (const h of headers) {
              const val = rawRow[h] === undefined || rawRow[h] === null ? '' : String(rawRow[h]).trim();
              cleanRow[h] = val;
              if (val !== '') hasAnyValue = true;
            }
            return hasAnyValue ? cleanRow : null;
          })
          .filter((r): r is Record<string, string> => r !== null);

        if (rows.length === 0) {
          reject(new Error('The CSV contains column headers but zero data rows.'));
          return;
        }

        resolve({ headers, rows });
      },
      error: (err: Error) => {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}

export async function parseCsvFile(file: File): Promise<ParsedCsvResult> {
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
    throw new Error('Invalid file type. Please upload a .csv file.');
  }
  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }
  if (file.size > 35 * 1024 * 1024) {
    throw new Error('File exceeds the 35 MB browser processing limit. Please upload a smaller CSV slice.');
  }
  const text = await file.text();
  return parseCsvString(text);
}

function computeNumericStats(values: number[]): NumericStats {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const min = sorted[0];
  const max = sorted[count - 1];
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);
  const q1 = sorted[Math.floor((count - 1) * 0.25)];
  const q3 = sorted[Math.floor((count - 1) * 0.75)];

  return { count, sum, mean, median, min, max, stdDev, q1, q3 };
}

function detectColumnProfile(name: string, rows: Record<string, string>[]): ColumnProfile {
  const totalCount = rows.length;
  const nonNullStrings: string[] = [];
  let currencyHits = 0;
  let percentHits = 0;

  for (const row of rows) {
    const val = (row[name] ?? '').trim();
    if (val !== '' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'n/a' && val.toLowerCase() !== 'na') {
      nonNullStrings.push(val);
      if (/[$€£¥]/.test(val)) currencyHits++;
      if (/%$/.test(val)) percentHits++;
    }
  }

  const nonNullCount = nonNullStrings.length;
  const missingCount = totalCount - nonNullCount;
  const missingPercentage = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;

  const uniqueSet = new Set(nonNullStrings);
  const uniqueCount = uniqueSet.size;

  const numericValues: number[] = [];
  const dateValues: Date[] = [];

  for (const val of nonNullStrings) {
    const num = parseNumericValue(val);
    if (num !== null) numericValues.push(num);
    const dt = parseDateValue(val);
    if (dt !== null) dateValues.push(dt);
  }

  let type: ColumnType = 'text';
  const nameLower = name.toLowerCase();
  const isLikelyIdColumn = /(^id$|_id$|id$|zip|postal|phone|code$)/i.test(nameLower);

  if (nonNullCount > 0) {
    const numRatio = numericValues.length / nonNullCount;
    const dateRatio = dateValues.length / nonNullCount;

    if (dateRatio >= 0.8) {
      type = 'date';
    } else if (numRatio >= 0.8 && !(isLikelyIdColumn && currencyHits === 0 && percentHits === 0 && uniqueCount === nonNullCount && nonNullCount > 10 && !nameLower.includes('amount') && !nameLower.includes('price'))) {
      type = 'numeric';
    } else if (numRatio >= 0.85) {
      type = 'numeric';
    }
  }

  const isCurrency =
    type === 'numeric' &&
    (currencyHits / Math.max(1, nonNullCount) > 0.25 ||
      /(revenue|sales|profit|cost|expense|spend|price|amount|mrr|arr|income|budget|aov|ltv|cac|margin_usd|salary|fee)/i.test(nameLower));

  const isPercentage =
    type === 'numeric' &&
    (percentHits / Math.max(1, nonNullCount) > 0.25 ||
      /(rate|pct|percent|ratio|margin_pct|ctr|cvr|churn_rate|discount_pct|growth)/i.test(nameLower));

  const freqMap = new Map<string, number>();
  for (const val of nonNullStrings) {
    freqMap.set(val, (freqMap.get(val) ?? 0) + 1);
  }
  const topValues: CategoryFrequency[] = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({
      value,
      count,
      percentage: nonNullCount > 0 ? (count / nonNullCount) * 100 : 0,
    }));

  let numericStats: NumericStats | undefined;
  if (type === 'numeric' && numericValues.length > 0) {
    numericStats = computeNumericStats(numericValues);
  }

  let dateStats: DateStats | undefined;
  if (type === 'date' && dateValues.length > 0) {
    const timestamps = dateValues.map((d) => d.getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    dateStats = {
      count: dateValues.length,
      minDate: new Date(minTs).toISOString().slice(0, 10),
      maxDate: new Date(maxTs).toISOString().slice(0, 10),
      spanDays: Math.max(0, Math.round((maxTs - minTs) / (1000 * 60 * 60 * 24))),
    };
  }

  return {
    name,
    type,
    isCurrency,
    isPercentage,
    totalCount,
    nonNullCount,
    missingCount,
    missingPercentage,
    uniqueCount,
    sampleValues: Array.from(uniqueSet).slice(0, 5),
    numericStats,
    dateStats,
    topValues,
  };
}

function findBestColumn(columns: ColumnProfile[], patterns: RegExp[], requiredType?: ColumnType): ColumnProfile | undefined {
  for (const pattern of patterns) {
    const match = columns.find((c) => (!requiredType || c.type === requiredType) && pattern.test(c.name.toLowerCase()));
    if (match) return match;
  }
  return undefined;
}

function computeAutomatedKpis(
  columns: ColumnProfile[],
  rows: Record<string, string>[],
  currencySymbol: string,
  compact: boolean,
): { kpis: AutomatedKpi[]; unmapped: UnmappedKpiNote[] } {
  const kpis: AutomatedKpi[] = [];
  const unmapped: UnmappedKpiNote[] = [];

  const revenueCol = findBestColumn(
    columns,
    [/^(total_?)?(revenue|sales|gmv|arr|mrr|income|turnover)$/, /(revenue|sales|amount|mrr|arr|income|value)/],
    'numeric',
  );
  const profitCol = findBestColumn(columns, [/^(net_?|gross_?)?profit$/, /(profit|net_income|ebitda|earnings)/], 'numeric');
  const expenseCol = findBestColumn(columns, [/^(total_?)?(cost|expense|expenses|spend|ad_spend|cogs)$/, /(cost|expense|spend|cogs)/], 'numeric');
  const orderIdCol = findBestColumn(columns, [/(order_?id|transaction_?id|invoice_?id|deal_?id)/]);
  const ordersNumericCol = findBestColumn(columns, [/^(orders|order_count|transactions|purchases|deals)$/], 'numeric');
  const customerCol = findBestColumn(columns, [/(customer_?id|client_?id|user_?id|account_?id|customer_?name|customer|account|email)/]);
  const clicksCol = findBestColumn(columns, [/^(clicks|link_clicks)$/], 'numeric');
  const impressionsCol = findBestColumn(columns, [/^(impressions|views|sessions|visits)$/], 'numeric');
  const conversionsCol = findBestColumn(columns, [/^(conversions|converted|leads|signups)$/], 'numeric');
  const conversionRateCol = findBestColumn(columns, [/(conversion_?rate|cvr|ctr)/], 'numeric');
  const dateCol = columns.find((c) => c.type === 'date');

  // 1. Revenue
  if (revenueCol?.numericStats) {
    kpis.push({
      id: 'total_revenue',
      label: `Total ${revenueCol.name}`,
      rawValue: revenueCol.numericStats.sum,
      formattedValue: formatNumber(revenueCol.numericStats.sum, {
        isCurrency: revenueCol.isCurrency,
        currencySymbol,
        compact,
      }),
      sourceColumn: revenueCol.name,
      calculationNote: `Sum across ${revenueCol.numericStats.count.toLocaleString()} non-missing records`,
      format: revenueCol.isCurrency ? 'currency' : 'number',
    });
  } else {
    unmapped.push({
      metric: 'Revenue / Sales',
      reason: 'No numeric column matching revenue, sales, MRR, or amount was detected.',
    });
  }

  // 2. Profit & Profit Margin
  if (profitCol?.numericStats) {
    kpis.push({
      id: 'total_profit',
      label: `Total ${profitCol.name}`,
      rawValue: profitCol.numericStats.sum,
      formattedValue: formatNumber(profitCol.numericStats.sum, {
        isCurrency: profitCol.isCurrency || Boolean(revenueCol?.isCurrency),
        currencySymbol,
        compact,
      }),
      sourceColumn: profitCol.name,
      calculationNote: `Mean ${formatNumber(profitCol.numericStats.mean, { isCurrency: profitCol.isCurrency, currencySymbol })} per record`,
      format: 'currency',
    });

    if (revenueCol?.numericStats && revenueCol.numericStats.sum !== 0) {
      const margin = (profitCol.numericStats.sum / revenueCol.numericStats.sum) * 100;
      kpis.push({
        id: 'profit_margin',
        label: 'Aggregate Profit Margin',
        rawValue: margin,
        formattedValue: formatNumber(margin, { isPercentage: true }),
        sourceColumn: `${profitCol.name} / ${revenueCol.name}`,
        calculationNote: 'Total Profit divided by Total Revenue',
        format: 'percentage',
      });
    }
  } else if (revenueCol?.numericStats && expenseCol?.numericStats) {
    const net = revenueCol.numericStats.sum - expenseCol.numericStats.sum;
    kpis.push({
      id: 'derived_net',
      label: `Net (${revenueCol.name} − ${expenseCol.name})`,
      rawValue: net,
      formattedValue: formatNumber(net, { isCurrency: revenueCol.isCurrency || expenseCol.isCurrency, currencySymbol, compact }),
      sourceColumn: `${revenueCol.name}, ${expenseCol.name}`,
      calculationNote: 'Derived from Total Revenue minus Total Cost/Spend',
      format: 'currency',
    });
  } else {
    unmapped.push({
      metric: 'Profit / Margin',
      reason: 'No profit or matching cost column was found to calculate profit.',
    });
  }

  // 3. Expenses / Spend
  if (expenseCol?.numericStats) {
    kpis.push({
      id: 'total_expenses',
      label: `Total ${expenseCol.name}`,
      rawValue: expenseCol.numericStats.sum,
      formattedValue: formatNumber(expenseCol.numericStats.sum, {
        isCurrency: expenseCol.isCurrency,
        currencySymbol,
        compact,
      }),
      sourceColumn: expenseCol.name,
      calculationNote: `Range ${formatNumber(expenseCol.numericStats.min, { isCurrency: expenseCol.isCurrency, currencySymbol })} to ${formatNumber(expenseCol.numericStats.max, { isCurrency: expenseCol.isCurrency, currencySymbol })}`,
      format: expenseCol.isCurrency ? 'currency' : 'number',
    });
  } else {
    unmapped.push({
      metric: 'Expenses / Spend',
      reason: 'No numeric column matching cost, expenses, or spend was found.',
    });
  }

  // 4. Orders & Average Order Value
  if (orderIdCol) {
    kpis.push({
      id: 'unique_orders',
      label: 'Unique Orders / Transactions',
      rawValue: orderIdCol.uniqueCount,
      formattedValue: orderIdCol.uniqueCount.toLocaleString(),
      sourceColumn: orderIdCol.name,
      calculationNote: `Distinct values in ${orderIdCol.name}`,
      format: 'number',
    });
    if (revenueCol?.numericStats && orderIdCol.uniqueCount > 0) {
      const aov = revenueCol.numericStats.sum / orderIdCol.uniqueCount;
      kpis.push({
        id: 'aov',
        label: 'Average Order Value',
        rawValue: aov,
        formattedValue: formatNumber(aov, { isCurrency: revenueCol.isCurrency, currencySymbol }),
        sourceColumn: `${revenueCol.name} / ${orderIdCol.name}`,
        calculationNote: `Total ${revenueCol.name} divided by ${orderIdCol.uniqueCount.toLocaleString()} orders`,
        format: revenueCol.isCurrency ? 'currency' : 'number',
      });
    }
  } else if (ordersNumericCol?.numericStats) {
    kpis.push({
      id: 'total_orders',
      label: `Total ${ordersNumericCol.name}`,
      rawValue: ordersNumericCol.numericStats.sum,
      formattedValue: formatNumber(ordersNumericCol.numericStats.sum, { compact }),
      sourceColumn: ordersNumericCol.name,
      calculationNote: `Sum of ${ordersNumericCol.name}`,
      format: 'number',
    });
    if (revenueCol?.numericStats && ordersNumericCol.numericStats.sum > 0) {
      const aov = revenueCol.numericStats.sum / ordersNumericCol.numericStats.sum;
      kpis.push({
        id: 'aov',
        label: 'Average Order Value',
        rawValue: aov,
        formattedValue: formatNumber(aov, { isCurrency: revenueCol.isCurrency, currencySymbol }),
        sourceColumn: `${revenueCol.name} / ${ordersNumericCol.name}`,
        calculationNote: `Total ${revenueCol.name} per unit in ${ordersNumericCol.name}`,
        format: revenueCol.isCurrency ? 'currency' : 'number',
      });
    }
  } else if (revenueCol?.numericStats) {
    kpis.push({
      id: 'avg_record_value',
      label: `Average ${revenueCol.name} / Record`,
      rawValue: revenueCol.numericStats.mean,
      formattedValue: formatNumber(revenueCol.numericStats.mean, { isCurrency: revenueCol.isCurrency, currencySymbol }),
      sourceColumn: revenueCol.name,
      calculationNote: `Mean across ${revenueCol.numericStats.count.toLocaleString()} records (no Order ID column found)`,
      format: revenueCol.isCurrency ? 'currency' : 'number',
    });
  }

  // 5. Customer Count
  if (customerCol) {
    kpis.push({
      id: 'customer_count',
      label: 'Unique Customers / Accounts',
      rawValue: customerCol.uniqueCount,
      formattedValue: customerCol.uniqueCount.toLocaleString(),
      sourceColumn: customerCol.name,
      calculationNote: `Distinct non-empty values in ${customerCol.name}`,
      format: 'number',
    });
  } else {
    unmapped.push({
      metric: 'Customer Count',
      reason: 'No customer, client, user, or account identifier column was detected.',
    });
  }

  // 6. Conversion Rate
  if (conversionRateCol?.numericStats) {
    const rawMean = conversionRateCol.numericStats.mean;
    const pctValue = rawMean <= 1 && !conversionRateCol.isPercentage ? rawMean * 100 : rawMean;
    kpis.push({
      id: 'conversion_rate',
      label: `Average ${conversionRateCol.name}`,
      rawValue: pctValue,
      formattedValue: formatNumber(pctValue, { isPercentage: true }),
      sourceColumn: conversionRateCol.name,
      calculationNote: `Mean of ${conversionRateCol.name} across ${conversionRateCol.numericStats.count.toLocaleString()} rows`,
      format: 'percentage',
    });
  } else if (conversionsCol?.numericStats && (clicksCol?.numericStats || impressionsCol?.numericStats)) {
    const denomCol = clicksCol?.numericStats ? clicksCol : impressionsCol!;
    const denomSum = denomCol.numericStats!.sum;
    if (denomSum > 0) {
      const rate = (conversionsCol.numericStats.sum / denomSum) * 100;
      kpis.push({
        id: 'conversion_rate',
        label: 'Calculated Conversion Rate',
        rawValue: rate,
        formattedValue: formatNumber(rate, { isPercentage: true }),
        sourceColumn: `${conversionsCol.name} / ${denomCol.name}`,
        calculationNote: `${conversionsCol.numericStats.sum.toLocaleString()} / ${denomSum.toLocaleString()}`,
        format: 'percentage',
      });
    }
  } else {
    unmapped.push({
      metric: 'Conversion Rate',
      reason: 'No conversion rate or conversions + clicks/impressions columns were found.',
    });
  }

  // 7. Period-over-Period Growth %
  const primaryMetricCol = revenueCol ?? profitCol ?? columns.find((c) => c.type === 'numeric' && !/(id|year|zip)/i.test(c.name));
  if (dateCol && primaryMetricCol) {
    const datedPairs = rows
      .map((r) => ({
        date: parseDateValue(r[dateCol.name]),
        val: parseNumericValue(r[primaryMetricCol.name]),
      }))
      .filter((p): p is { date: Date; val: number } => p.date !== null && p.val !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (datedPairs.length >= 4) {
      const mid = Math.floor(datedPairs.length / 2);
      const firstHalfSum = datedPairs.slice(0, mid).reduce((acc, p) => acc + p.val, 0);
      const secondHalfSum = datedPairs.slice(mid).reduce((acc, p) => acc + p.val, 0);
      if (firstHalfSum !== 0) {
        const growthPct = ((secondHalfSum - firstHalfSum) / Math.abs(firstHalfSum)) * 100;
        kpis.push({
          id: 'period_growth',
          label: `${primaryMetricCol.name} Period Growth`,
          rawValue: growthPct,
          formattedValue: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`,
          sourceColumn: `${primaryMetricCol.name} over ${dateCol.name}`,
          calculationNote: 'Second-half chronological total vs. first-half total',
          format: 'percentage',
        });
      }
    }
  } else if (!dateCol) {
    unmapped.push({
      metric: 'Growth Percentage',
      reason: 'No date column was detected to evaluate chronological growth.',
    });
  }

  // Fallback generic numeric KPIs if dataset is non-commercial (e.g. scientific/operational)
  if (kpis.length < 2) {
    const extraNumerics = columns.filter((c) => c.type === 'numeric' && c.numericStats && !kpis.some((k) => k.sourceColumn === c.name));
    for (const col of extraNumerics.slice(0, 4 - kpis.length)) {
      if (!col.numericStats) continue;
      kpis.push({
        id: `col_mean_${col.name}`,
        label: `Mean ${col.name}`,
        rawValue: col.numericStats.mean,
        formattedValue: formatNumber(col.numericStats.mean, {
          isCurrency: col.isCurrency,
          isPercentage: col.isPercentage,
          currencySymbol,
        }),
        sourceColumn: col.name,
        calculationNote: `Sum: ${formatNumber(col.numericStats.sum, { compact: true })} · Median: ${formatNumber(col.numericStats.median)}`,
        format: col.isCurrency ? 'currency' : col.isPercentage ? 'percentage' : 'number',
      });
    }
  }

  return { kpis, unmapped };
}

function computeCorrelations(columns: ColumnProfile[], rows: Record<string, string>[]): CorrelationPair[] {
  const numericCols = columns
    .filter((c) => c.type === 'numeric' && c.numericStats && c.numericStats.stdDev > 0)
    .slice(0, 8);
  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i].name;
      const colB = numericCols[j].name;
      const xs: number[] = [];
      const ys: number[] = [];

      for (const row of rows) {
        const x = parseNumericValue(row[colA]);
        const y = parseNumericValue(row[colB]);
        if (x !== null && y !== null) {
          xs.push(x);
          ys.push(y);
        }
      }

      if (xs.length < 5) continue;
      const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let k = 0; k < xs.length; k++) {
        const dx = xs[k] - meanX;
        const dy = ys[k] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const denom = Math.sqrt(denX * denY);
      if (denom > 0) {
        pairs.push({
          colA,
          colB,
          coefficient: Number((num / denom).toFixed(3)),
        });
      }
    }
  }

  return pairs.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 6);
}

function detectDomain(columns: ColumnProfile[]): string {
  const joined = columns.map((c) => c.name.toLowerCase()).join(' ');
  if (/(campaign|impressions|clicks|ctr|roas|ad_spend|channel)/.test(joined)) return 'Marketing Campaign';
  if (/(mrr|arr|churn|nps|subscription|plan|tenure|support_ticket)/.test(joined)) return 'Customer & SaaS Health';
  if (/(order|sku|product|category|discount|region|shipping|profit)/.test(joined)) return 'Sales & Retail';
  if (/(expense|budget|ledger|ebitda|balance|asset|liability|invoice)/.test(joined)) return 'Financial Operations';
  if (/(latency|throughput|uptime|inventory|warehouse|shipment|defect|downtime)/.test(joined)) return 'Operations & Supply Chain';
  return 'General Tabular Dataset';
}

export function buildChartSeries(
  rows: Record<string, string>[],
  columns: ColumnProfile[],
  xColumn: string,
  yColumn: string,
  aggregation: AggregationType,
  chartType: ChartType,
  topN = 12,
): PrecomputedChartSeries {
  const xProfile = columns.find((c) => c.name === xColumn);
  const isDateAxis = xProfile?.type === 'date';

  // Determine date granularity if date axis
  let dateBucketMode: 'day' | 'month' | 'year' = 'month';
  if (isDateAxis && xProfile?.dateStats) {
    if (xProfile.dateStats.spanDays <= 45) dateBucketMode = 'day';
    else if (xProfile.dateStats.spanDays > 1100) dateBucketMode = 'year';
    else dateBucketMode = 'month';
  }

  const buckets = new Map<string, { values: number[]; count: number; sortKey: number | string }>();

  for (const row of rows) {
    const rawX = (row[xColumn] ?? '').trim();
    if (!rawX) continue;

    let label = rawX;
    let sortKey: number | string = rawX;

    if (isDateAxis) {
      const dt = parseDateValue(rawX);
      if (!dt) continue;
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      if (dateBucketMode === 'day') {
        label = `${yyyy}-${mm}-${dd}`;
      } else if (dateBucketMode === 'month') {
        label = `${yyyy}-${mm}`;
      } else {
        label = `${yyyy}`;
      }
      sortKey = label;
    }

    const bucket = buckets.get(label) ?? { values: [], count: 0, sortKey };
    bucket.count += 1;

    if (aggregation !== 'count' && yColumn !== '__row_count__') {
      const yVal = parseNumericValue(row[yColumn]);
      if (yVal !== null) {
        bucket.values.push(yVal);
      }
    }
    buckets.set(label, bucket);
  }

  let seriesData = Array.from(buckets.entries()).map(([label, bucket]) => {
    let value = bucket.count;
    if (aggregation !== 'count' && yColumn !== '__row_count__') {
      if (bucket.values.length === 0) {
        value = 0;
      } else if (aggregation === 'sum') {
        value = bucket.values.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'avg') {
        value = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length;
      } else if (aggregation === 'min') {
        value = Math.min(...bucket.values);
      } else if (aggregation === 'max') {
        value = Math.max(...bucket.values);
      }
    }
    return {
      label,
      value: Number(value.toFixed(2)),
      count: bucket.count,
    };
  });

  if (isDateAxis) {
    seriesData.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    seriesData.sort((a, b) => b.value - a.value);
    if (seriesData.length > topN) {
      seriesData = seriesData.slice(0, topN);
    }
  }

  const aggLabel = aggregation === 'count' || yColumn === '__row_count__' ? 'Record Count' : `${aggregation.toUpperCase()} of ${yColumn}`;
  return {
    title: `${aggLabel} by ${xColumn}`,
    subtitle: isDateAxis ? `Grouped by ${dateBucketMode}` : `Top ${seriesData.length} ${xColumn} values`,
    xColumn,
    yColumn,
    aggregation,
    chartType,
    data: seriesData,
  };
}

export function buildDefaultCharts(
  rows: Record<string, string>[],
  columns: ColumnProfile[],
  topN = 10,
): PrecomputedChartSeries[] {
  const charts: PrecomputedChartSeries[] = [];
  const dateCol = columns.find((c) => c.type === 'date');
  const numericCols = columns.filter((c) => c.type === 'numeric' && c.numericStats);
  const textCols = columns
    .filter((c) => c.type === 'text' && c.uniqueCount >= 2 && c.uniqueCount <= Math.max(30, rows.length * 0.5))
    .sort((a, b) => a.uniqueCount - b.uniqueCount);

  const primaryNumeric =
    columns.find((c) => c.type === 'numeric' && /(revenue|sales|profit|mrr|amount|spend|value)/i.test(c.name)) ??
    numericCols[0];

  const secondaryNumeric = numericCols.find((c) => c.name !== primaryNumeric?.name);

  if (dateCol && primaryNumeric) {
    charts.push(buildChartSeries(rows, columns, dateCol.name, primaryNumeric.name, 'sum', 'area', 24));
  }

  if (textCols[0] && primaryNumeric) {
    charts.push(buildChartSeries(rows, columns, textCols[0].name, primaryNumeric.name, 'sum', 'bar', topN));
  }

  if (textCols[1] && primaryNumeric) {
    charts.push(buildChartSeries(rows, columns, textCols[1].name, primaryNumeric.name, 'sum', 'pie', 8));
  } else if (textCols[0] && secondaryNumeric) {
    charts.push(buildChartSeries(rows, columns, textCols[0].name, secondaryNumeric.name, 'avg', 'bar', topN));
  } else if (textCols[0]) {
    charts.push(buildChartSeries(rows, columns, textCols[0].name, '__row_count__', 'count', 'pie', 8));
  }

  return charts;
}

export function profileDataset(
  fileName: string,
  fileSizeBytes: number,
  headers: string[],
  rows: Record<string, string>[],
  options: { currencySymbol?: string; compact?: boolean; topN?: number } = {},
): {
  profile: DatasetProfile;
  defaultCharts: PrecomputedChartSeries[];
  sampleRows: Record<string, string>[];
} {
  const { currencySymbol = '$', compact = true, topN = 10 } = options;

  const columns = headers.map((header) => detectColumnProfile(header, rows));

  // Duplicate row check
  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = headers.map((h) => row[h] ?? '').join('\u0001');
    if (seen.has(key)) duplicateRows += 1;
    else seen.add(key);
  }

  const totalCells = rows.length * headers.length;
  const totalMissing = columns.reduce((acc, c) => acc + c.missingCount, 0);
  const completenessPercentage = totalCells > 0 ? Number((((totalCells - totalMissing) / totalCells) * 100).toFixed(1)) : 100;

  const { kpis, unmapped } = computeAutomatedKpis(columns, rows, currencySymbol, compact);
  const correlations = computeCorrelations(columns, rows);
  const defaultCharts = buildDefaultCharts(rows, columns, topN);

  const profile: DatasetProfile = {
    fileName,
    fileSizeBytes,
    uploadedAt: new Date().toISOString(),
    totalRows: rows.length,
    totalColumns: headers.length,
    duplicateRows,
    completenessPercentage,
    columns,
    automatedKpis: kpis,
    unmappedKpis: unmapped,
    correlations,
    detectedDomain: detectDomain(columns),
  };

  return {
    profile,
    defaultCharts,
    sampleRows: rows.slice(0, 100),
  };
}

export function buildGeminiContextSummary(
  profile: DatasetProfile,
  rows: Record<string, string>[],
  defaultCharts: PrecomputedChartSeries[],
) {
  // Build extra category summaries if rows are available in memory
  const textCols = profile.columns.filter((c) => c.type === 'text' && c.uniqueCount >= 2 && c.uniqueCount <= 25).slice(0, 3);
  const primaryNumeric =
    profile.columns.find((c) => c.type === 'numeric' && /(revenue|sales|profit|mrr|amount|spend)/i.test(c.name)) ??
    profile.columns.find((c) => c.type === 'numeric');

  const computedBreakdowns =
    rows.length > 0 && primaryNumeric
      ? textCols.map((col) =>
          buildChartSeries(rows, profile.columns, col.name, primaryNumeric.name, 'sum', 'bar', 8),
        )
      : [];

  return {
    fileName: profile.fileName,
    detectedDomain: profile.detectedDomain,
    totalRows: profile.totalRows,
    totalColumns: profile.totalColumns,
    duplicateRows: profile.duplicateRows,
    completenessPercentage: profile.completenessPercentage,
    automatedKpis: profile.automatedKpis.map((k) => ({
      label: k.label,
      value: k.formattedValue,
      sourceColumn: k.sourceColumn,
      note: k.calculationNote,
    })),
    unmappedKpis: profile.unmappedKpis,
    correlations: profile.correlations,
    columns: profile.columns.map((c) => ({
      name: c.name,
      type: c.type,
      missingCount: c.missingCount,
      missingPercentage: Number(c.missingPercentage.toFixed(1)),
      uniqueCount: c.uniqueCount,
      numericStats: c.numericStats
        ? {
            count: c.numericStats.count,
            sum: Number(c.numericStats.sum.toFixed(2)),
            mean: Number(c.numericStats.mean.toFixed(2)),
            median: Number(c.numericStats.median.toFixed(2)),
            min: Number(c.numericStats.min.toFixed(2)),
            max: Number(c.numericStats.max.toFixed(2)),
            stdDev: Number(c.numericStats.stdDev.toFixed(2)),
          }
        : undefined,
      dateStats: c.dateStats,
      topValues: c.topValues.slice(0, 6).map((tv) => ({
        value: tv.value,
        count: tv.count,
        pct: Number(tv.percentage.toFixed(1)),
      })),
    })),
    aggregatedChartsAndBreakdowns: [...defaultCharts, ...computedBreakdowns].map((chart) => ({
      title: chart.title,
      subtitle: chart.subtitle,
      points: chart.data.slice(0, 12),
    })),
    sampleRows: rows.slice(0, 8),
  };
}
