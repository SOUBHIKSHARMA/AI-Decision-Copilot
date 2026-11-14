import { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';
import type { AnalysisRecord, NavSection } from '../types/analytics';
import { SAMPLE_DATASETS, downloadCsvFile, type SampleDatasetSpec } from '../utils/sampleDatasets';

interface UploadViewProps {
  activeRecord: AnalysisRecord | null;
  isProcessing: boolean;
  error: string | null;
  onUploadFile: (file: File) => Promise<void>;
  onLoadSample: (sample: SampleDatasetSpec) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export function UploadView({
  activeRecord,
  isProcessing,
  error,
  onUploadFile,
  onLoadSample,
  onNavigate,
}: UploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onUploadFile(files[0]);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
          Upload CSV Dataset
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Import sales, customer, marketing, financial, product, or operational CSV files for instant local profiling and visualization.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-semibold">Unable to process CSV file</div>
            <div className="mt-0.5 text-rose-700">{error}</div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
          aria-label="Choose CSV file"
        />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <UploadCloud className="h-6 w-6" />
        </div>

        <h2 className="mt-4 font-display text-base font-semibold text-slate-900">
          {isProcessing ? 'Processing CSV dataset...' : 'Drag and drop your CSV file here'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Standard UTF-8 CSV with column headers · Processed locally in your browser up to 35 MB
        </p>

        <div className="mt-5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <span>{isProcessing ? 'Analyzing...' : 'Select CSV File'}</span>
          </button>
        </div>
      </div>

      {/* Active Dataset Schema Summary */}
      {activeRecord && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Loaded: {activeRecord.profile.fileName}
                  {activeRecord.isSample ? ' (Sample Data)' : ''}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeRecord.profile.totalRows.toLocaleString()} rows · {activeRecord.profile.totalColumns} columns ·{' '}
                  {activeRecord.profile.detectedDomain} · {activeRecord.profile.completenessPercentage.toFixed(1)}% complete
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>Preview Table</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('quality')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>Data Quality</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('insights')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                <span>Run AI Analyst</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Column Name</th>
                  <th className="px-4 py-2.5">Detected Type</th>
                  <th className="px-4 py-2.5 text-right">Unique Values</th>
                  <th className="px-4 py-2.5 text-right">Missing</th>
                  <th className="px-4 py-2.5">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRecord.profile.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{col.name}</td>
                    <td className="px-4 py-2.5 text-xs font-medium capitalize text-slate-700">
                      {col.type}
                      {col.isCurrency ? ' · Currency' : col.isPercentage ? ' · %' : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {col.uniqueCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {col.missingCount.toLocaleString()} ({col.missingPercentage.toFixed(1)}%)
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 max-w-xs truncate">
                      {col.sampleValues.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Clearly labeled Sample Datasets */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Sample Datasets (Demonstration Only)
          </h2>
          <p className="text-xs text-slate-500">
            Load a clearly labeled sample CSV directly into the workspace or download the raw CSV file to inspect and re-upload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SAMPLE_DATASETS.map((sample) => (
            <div
              key={sample.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Sample Dataset</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">{sample.domain}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-900">
                  {sample.title.replace(/^Sample:\s*/, '')}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{sample.description}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void onLoadSample(sample)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                >
                  <span>Load Sample Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadCsvFile(sample.fileName, sample.csvContent)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
