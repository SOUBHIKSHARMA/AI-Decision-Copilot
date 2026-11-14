import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, Upload } from 'lucide-react';
import type { AnalysisRecord, NavSection } from '../types/analytics';

interface DataExplorerViewProps {
  activeRecord: AnalysisRecord | null;
  activeRows: Record<string, string>[];
  isCachedPreviewOnly: boolean;
  onNavigate: (section: NavSection) => void;
}

const PAGE_SIZE = 25;

export function DataExplorerView({
  activeRecord,
  activeRows,
  isCachedPreviewOnly,
  onNavigate,
}: DataExplorerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selectedColName, setSelectedColName] = useState<string>('');

  const rowsToDisplay = useMemo(() => {
    if (!activeRecord) return [];
    return activeRows.length > 0 ? activeRows : activeRecord.sampleRows;
  }, [activeRecord, activeRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = rowsToDisplay;
    if (q) {
      list = rowsToDisplay.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q)),
      );
    }
    if (sortCol && activeRecord) {
      const colMeta = activeRecord.profile.columns.find((c) => c.name === sortCol);
      list = [...list].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        if (colMeta?.type === 'numeric') {
          const an = Number(av.replace(/[$€£¥,\s%]/g, ''));
          const bn = Number(bv.replace(/[$€£¥,\s%]/g, ''));
          if (!Number.isNaN(an) && !Number.isNaN(bn)) {
            return sortDir === 'asc' ? an - bn : bn - an;
          }
        }
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [rowsToDisplay, searchTerm, sortCol, sortDir, activeRecord]);

  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file or load a sample dataset to inspect rows and column types.
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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const inspectedColumn =
    activeRecord.profile.columns.find((c) => c.name === selectedColName) ??
    activeRecord.profile.columns[0];

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Data Explorer
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {activeRecord.profile.fileName} · {activeRecord.profile.totalRows.toLocaleString()} total rows ·{' '}
            {activeRecord.profile.totalColumns} columns
            {isCachedPreviewOnly
              ? ` · Showing first ${rowsToDisplay.length} cached rows after browser reload (full statistics preserved)`
              : ''}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Filter rows..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Column Inspector */}
      {inspectedColumn && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Column Inspector
              </h2>
              <p className="text-xs text-slate-500">
                Inspect detected type, missing count, and top frequent values for any column
              </p>
            </div>
            <select
              value={inspectedColumn.name}
              onChange={(e) => setSelectedColName(e.target.value)}
              aria-label="Inspect column"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {activeRecord.profile.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Detected Type</div>
              <div className="mt-0.5 text-sm font-semibold capitalize text-slate-900">
                {inspectedColumn.type}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Unique Values</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                {inspectedColumn.uniqueCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Missing Values</div>
              <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                {inspectedColumn.missingCount.toLocaleString()} ({inspectedColumn.missingPercentage.toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Top Value</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                {inspectedColumn.topValues[0]
                  ? `${inspectedColumn.topValues[0].value} (${inspectedColumn.topValues[0].count})`
                  : '—'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-4 py-3 text-right text-slate-400">#</th>
                {activeRecord.profile.columns.map((col) => {
                  const isSorted = sortCol === col.name;
                  return (
                    <th
                      key={col.name}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.type === 'numeric' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.name)}
                        className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
                      >
                        <span>{col.name}</span>
                        {isSorted &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                          ))}
                      </button>
                      <div className="text-[11px] font-normal text-slate-400">{col.type}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeRecord.profile.columns.length + 1}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No rows match &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={rowNum} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                        {rowNum}
                      </td>
                      {activeRecord.profile.columns.map((col) => (
                        <td
                          key={col.name}
                          className={`px-4 py-2.5 max-w-[240px] truncate ${
                            col.type === 'numeric'
                              ? 'text-right font-mono tabular-nums text-slate-800'
                              : 'text-slate-700'
                          }`}
                          title={row[col.name] || ''}
                        >
                          {row[col.name] || <span className="text-slate-300">null</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of{' '}
            {filteredRows.length.toLocaleString()} matching rows
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
