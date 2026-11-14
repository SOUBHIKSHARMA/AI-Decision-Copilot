import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, Send, Trash2, Upload, User } from 'lucide-react';
import type { AnalysisRecord, ChatMessage, NavSection } from '../types/analytics';
import { buildGeminiContextSummary } from '../utils/dataProcessor';

interface AskDataViewProps {
  activeRecord: AnalysisRecord | null;
  activeRows: Record<string, string>[];
  aiAvailable: boolean | null;
  onUpdateChat: (recordId: string, messages: ChatMessage[]) => void;
  onNavigate: (section: NavSection) => void;
}

export function AskDataView({
  activeRecord,
  activeRows,
  aiAvailable,
  onUpdateChat,
  onNavigate,
}: AskDataViewProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestedQuestions = useMemo(() => {
    if (!activeRecord) return [];
    const cols = activeRecord.profile.columns;
    const textCol = cols.find((c) => c.type === 'text' && c.uniqueCount >= 2 && c.uniqueCount <= 30);
    const numCol =
      cols.find((c) => c.type === 'numeric' && /(revenue|sales|profit|mrr|amount|spend)/i.test(c.name)) ??
      cols.find((c) => c.type === 'numeric');
    const dateCol = cols.find((c) => c.type === 'date');

    const qs: string[] = [];
    if (textCol && numCol) {
      qs.push(`Which ${textCol.name} performs best by ${numCol.name}?`);
    }
    if (numCol) {
      qs.push(`What is the average and median ${numCol.name}?`);
    }
    if (dateCol && numCol) {
      qs.push(`Are there any unusual trends in ${numCol.name} over ${dateCol.name}?`);
    }
    qs.push('Are there any data quality issues or anomalies I should address?');
    qs.push('What top 3 recommendations would improve performance based on these metrics?');
    return qs.slice(0, 4);
  }, [activeRecord]);

  if (!activeRecord) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">No Dataset Loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV file to ask natural-language questions grounded in your dataset’s real calculations.
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

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...activeRecord.chatHistory, userMsg];
    onUpdateChat(activeRecord.id, nextHistory);
    setInput('');
    setIsSending(true);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const rows = activeRows.length > 0 ? activeRows : activeRecord.sampleRows;
      const datasetSummary = buildGeminiContextSummary(
        activeRecord.profile,
        rows,
        activeRecord.defaultCharts,
      );

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          datasetSummary,
          history: nextHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from Gemini.');
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: data.answer,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      onUpdateChat(activeRecord.id, [...nextHistory, assistantMsg]);
    } catch (err: unknown) {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now()}_e`,
        role: 'assistant',
        content:
          err instanceof Error
            ? err.message
            : 'Unable to reach the Gemini AI service. Please try again later.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      onUpdateChat(activeRecord.id, [...nextHistory, errMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[520px] flex-col space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            Ask Your Data
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Conversational analysis for {activeRecord.profile.fileName} · Answers strictly cite calculated statistics
          </p>
        </div>

        {activeRecord.chatHistory.length > 0 && (
          <button
            type="button"
            onClick={() => onUpdateChat(activeRecord.id, [])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Conversation</span>
          </button>
        )}
      </div>

      {aiAvailable === false && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Gemini AI is currently unavailable because no API key is configured on the server. Non-AI analytics, profiling, and charts remain available.
          </span>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        {activeRecord.chatHistory.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Bot className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
              Ask a question about {activeRecord.profile.fileName}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Every response is constrained to the actual computed averages, totals, category breakdowns, and data quality facts in your dataset.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendQuestion(q)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/60 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeRecord.chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.isError ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {msg.isError ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : msg.isError
                      ? 'border border-rose-200 bg-rose-50 text-rose-800'
                      : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isSending && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Reviewing dataset statistics...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
          placeholder={`Ask a question about ${activeRecord.profile.fileName}...`}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="h-4 w-4" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
