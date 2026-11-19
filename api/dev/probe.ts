// GET /api/dev/probe — which providers/models answer with the configured keys,
// plus whatever rate-limit headers they expose.
import { devOnly } from '../_lib/guard.js';
import { callModel, DEFAULT_MODELS, ProviderError, type Provider } from '../_lib/providers.js';

export const config = { maxDuration: 60 };

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;

  const out: Record<string, unknown> = { defaults: DEFAULT_MODELS };

  // list Gemini models available to this key (names only)
  if (process.env.GEMINI_API_KEY) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      });
      const j = await r.json();
      out.geminiModels = (j.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string }) => m.name.replace('models/', ''));
    } catch (e) {
      out.geminiModels = `error: ${(e as Error).message}`;
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      });
      const j = await r.json();
      out.groqModels = (j.data ?? []).map((m: { id: string }) => m.id);
    } catch (e) {
      out.groqModels = `error: ${(e as Error).message}`;
    }
  }

  // ?models=a,b,c probes extra Gemini models with one tiny call each
  const extra = (new URL(request.url).searchParams.get('models') || '').split(',').filter(Boolean);
  if (extra.length) {
    out.models = Object.fromEntries(
      await Promise.all(
        extra.map(async (model) => {
          try {
            const r = await callModel({ provider: 'gemini', model, system: 'Reply with JSON only.', user: 'Return {"ok":true}', temperature: 0 });
            return [model, { ok: true, latencyMs: r.latencyMs }];
          } catch (e) {
            const pe = e as ProviderError;
            return [model, { ok: false, status: pe.status, body: pe.body?.slice(0, 300) }];
          }
        }),
      ),
    );
    return Response.json(out);
  }

  for (const provider of ['gemini', 'groq'] as Provider[]) {
    try {
      const r = await callModel({
        provider,
        system: 'Reply with JSON only.',
        user: 'Return {"ok":true}',
        temperature: 0,
      });
      out[provider] = { ok: true, model: r.model, latencyMs: r.latencyMs, text: r.text.slice(0, 80), rateLimit: r.rateLimit };
    } catch (e) {
      const pe = e as ProviderError;
      out[provider] = { ok: false, status: pe.status, error: pe.message, body: pe.body?.slice(0, 600) };
    }
  }
  return Response.json(out);
}
