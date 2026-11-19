// Model provider adapters. One function, two providers, same return shape,
// so the committee code never knows which model family it is talking to.

export type Provider = 'gemini' | 'groq';

export interface ModelCall {
  provider: Provider;
  model?: string;
  system: string;
  user: string;
  temperature?: number;
  apiKey?: string; // BYOK in live mode; falls back to server env
}

export interface ModelResult {
  provider: Provider;
  model: string;
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  rateLimit: Record<string, string>; // whatever limit headers the provider returns
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: process.env.FOIL_GEMINI_MODEL || 'gemini-3.5-flash-lite',
  groq: process.env.FOIL_GROQ_MODEL || 'openai/gpt-oss-120b',
};

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: Provider,
    public status: number,
    public body: string,
  ) {
    super(message);
  }
}

function pickHeaders(h: Headers, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    if (k.toLowerCase().startsWith(prefix) || k.toLowerCase() === 'retry-after') out[k] = v;
  });
  return out;
}

async function callGemini(c: ModelCall): Promise<ModelResult> {
  const key = c.apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError('GEMINI_API_KEY missing', 'gemini', 500, '');
  const model = c.model || DEFAULT_MODELS.gemini;
  const t0 = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: c.system }] },
        contents: [{ role: 'user', parts: [{ text: c.user }] }],
        generationConfig: {
          temperature: c.temperature ?? 1,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  const body = await res.text();
  if (!res.ok) throw new ProviderError(`Gemini ${res.status}`, 'gemini', res.status, body.slice(0, 2000));
  const json = JSON.parse(body);
  const text = (json.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  return {
    provider: 'gemini',
    model,
    text,
    inputTokens: json.usageMetadata?.promptTokenCount ?? null,
    outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
    latencyMs: Date.now() - t0,
    rateLimit: pickHeaders(res.headers, 'x-ratelimit'),
  };
}

async function callGroq(c: ModelCall): Promise<ModelResult> {
  const key = c.apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new ProviderError('GROQ_API_KEY missing', 'groq', 500, '');
  const model = c.model || DEFAULT_MODELS.groq;
  const t0 = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: c.temperature ?? 1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: c.system },
        { role: 'user', content: c.user },
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new ProviderError(`Groq ${res.status}`, 'groq', res.status, body.slice(0, 2000));
  const json = JSON.parse(body);
  return {
    provider: 'groq',
    model,
    text: json.choices?.[0]?.message?.content ?? '',
    inputTokens: json.usage?.prompt_tokens ?? null,
    outputTokens: json.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - t0,
    rateLimit: pickHeaders(res.headers, 'x-ratelimit'),
  };
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the provider with retries on rate limits and overload (429/5xx).
 * Backoff: honours Retry-After when present, else 2s, 4s, 8s (+ jitter).
 * Each attempt is counted so batch reports can show how often we were throttled.
 */
export async function callModel(c: ModelCall, maxAttempts = 4): Promise<ModelResult & { attempts: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await (c.provider === 'gemini' ? callGemini(c) : callGroq(c));
      return { ...r, attempts: attempt };
    } catch (e) {
      lastErr = e;
      const pe = e as ProviderError;
      if (!(pe instanceof ProviderError) || !RETRYABLE.has(pe.status) || attempt === maxAttempts) throw e;
      const retryAfter = Number(pe.body.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? NaN);
      const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2000 * 2 ** (attempt - 1);
      await sleep(Math.min(wait, 20_000) + Math.random() * 500);
    }
  }
  throw lastErr;
}

/** Parse a model's JSON reply, tolerating ```json fences. */
export function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned) as T;
}
