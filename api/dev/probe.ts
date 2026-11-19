// GET /api/dev/probe — which providers/models answer with the configured keys,
// plus whatever rate-limit headers they expose.
import { devOnly } from '../_lib/guard.js';
import { callModel, DEFAULT_MODELS, ProviderError, type Provider } from '../_lib/providers.js';

export async function GET(): Promise<Response> {
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
