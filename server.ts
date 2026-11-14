import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isTransient =
        message.includes('429') ||
        message.includes('503') ||
        message.includes('500') ||
        message.toLowerCase().includes('unavailable') ||
        message.toLowerCase().includes('timeout');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function classifyGeminiError(err: unknown): { status: number; message: string; code: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message: 'The configured Gemini API key was rejected or lacks permission. Please verify the key in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'QUOTA_EXHAUSTED',
      message: 'Gemini API rate limit or quota has been reached. Please wait a moment and try again.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: 'The requested Gemini model endpoint could not be reached. Please try again later.',
    };
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return {
      status: 503,
      code: 'MODEL_UNAVAILABLE',
      message: 'The Gemini AI service is temporarily experiencing high demand. Please wait a few seconds and try again.',
    };
  }
  return {
    status: 500,
    code: 'GEMINI_ERROR',
    message: 'An unexpected error occurred while contacting the Gemini AI service. Please try again.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    const client = getGeminiClient();
    res.json({
      status: 'ok',
      aiAvailable: Boolean(client),
      model: MODEL_NAME,
    });
  });

  app.post('/api/ai/analyze', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'AI_UNAVAILABLE',
        error: 'Gemini AI integration is not configured in this environment. CSV processing, statistics, and interactive charts remain fully available.',
      });
      return;
    }

    const { datasetSummary } = req.body as { datasetSummary?: unknown };
    if (!datasetSummary) {
      res.status(400).json({ error: 'Missing datasetSummary payload.' });
      return;
    }

    const systemInstruction = [
      'You are a senior business intelligence analyst and data scientist.',
      'Examine the provided JSON dataset summary, calculated descriptive statistics, automated KPIs, correlations, category breakdowns, time-series summaries, data quality metrics, and sample rows.',
      'STRICT GROUNDING RULES:',
      '1. Every numerical claim, metric, percentage, range, or comparison MUST be directly traceable to the provided statistics or aggregated summaries.',
      '2. NEVER invent, guess, or extrapolate uncalculated statistics. If you cannot verify a number from the input, do not state it.',
      '3. If the dataset lacks certain dimensions (e.g., no date column for time trends, no cost column for margin, small row count), explicitly note that in evidenceLimitations and avoid fabricating trends.',
      '4. Tailor your analysis to the actual domain of the dataset (sales, marketing, finance, customer, operations, product, etc.).',
      '5. Write crisp, executive-grade prose with concrete evidence citations.',
    ].join('\n');

    try {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Analyze this dataset profile and return a structured executive report:\n\n${JSON.stringify(datasetSummary)}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: {
                  type: Type.STRING,
                  description: 'Concise 3-4 sentence executive overview grounded in exact dataset metrics.',
                },
                keyFindings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                      evidence: { type: Type.STRING, description: 'Exact figures or column metrics from the provided summary.' },
                    },
                    required: ['title', 'detail', 'evidence'],
                  },
                },
                importantTrends: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                      evidence: { type: Type.STRING },
                    },
                    required: ['title', 'detail', 'evidence'],
                  },
                },
                anomalies: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                      evidence: { type: Type.STRING },
                    },
                    required: ['title', 'detail', 'evidence'],
                  },
                },
                businessImplications: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      priority: { type: Type.STRING, description: 'High, Medium, or Low' },
                      action: { type: Type.STRING },
                      expectedImpact: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                    },
                    required: ['priority', 'action', 'expectedImpact', 'rationale'],
                  },
                },
                evidenceLimitations: {
                  type: Type.STRING,
                  description: 'Explicit statement of missing dimensions, data quality caveats, or claims that cannot be verified from summary statistics.',
                },
              },
              required: [
                'executiveSummary',
                'keyFindings',
                'importantTrends',
                'anomalies',
                'businessImplications',
                'recommendations',
                'evidenceLimitations',
              ],
            },
          },
        }),
      );

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json({
        ...parsed,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        code: classified.code,
        error: classified.message,
      });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: 'AI_UNAVAILABLE',
        error: 'Gemini AI integration is not configured in this environment. Please verify your API key in Settings > Secrets.',
      });
      return;
    }

    const { question, datasetSummary, history } = req.body as {
      question?: string;
      datasetSummary?: unknown;
      history?: Array<{ role: string; content: string }>;
    };

    if (!question || !datasetSummary) {
      res.status(400).json({ error: 'Missing question or datasetSummary payload.' });
      return;
    }

    const systemInstruction = [
      'You are AI Decision Copilot, an analytical assistant answering questions strictly about the user’s currently loaded CSV dataset.',
      'You are provided with the exact dataset schema, computed column statistics (mean, median, min, max, stdDev, sum, missing counts, unique counts), automated KPIs, category aggregations, time-series summaries, correlations, and sample rows.',
      'RULES:',
      '1. Answer directly and concisely using ONLY facts and computed numbers present in the provided dataset context.',
      '2. Quote exact numbers, column names, and units when answering.',
      '3. NEVER fabricate numbers, rows, or calculations that were not computed in the context. If a user asks for a granular slice or calculation not available in the provided summary/aggregations, clearly explain what IS known and what cannot be confirmed from the precomputed summary.',
      '4. Do not invent trends or external facts.',
    ].join('\n');

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const formattedHistory = recentHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
      .join('\n\n');

    const prompt = [
      'DATASET CONTEXT (JSON):',
      JSON.stringify(datasetSummary),
      formattedHistory ? `\nCONVERSATION HISTORY:\n${formattedHistory}` : '',
      `\nCURRENT USER QUESTION:\n${question}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      res.json({
        answer: response.text?.trim() || 'No response generated.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        code: classified.code,
        error: classified.message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Decision Copilot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
