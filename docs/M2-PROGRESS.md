# M2 progress — full committee, decided by code

Date: 2026-11-19 · Snapshot: `product-analytics-eu-series-b@2026-11-19-b69092a140` · Prompt: `committee-v0.3`

## Built

- **Evidence packs** (`api/_lib/evidence.ts`): coverage-first BM25 retrieval per role. Each agent sees ~2.8K chars per vendor, chosen so every requirement's best passage is included first. Same evidence for every model.
- **Per-requirement verdicts** (`api/_lib/agent.ts`): each agent rates every vendor on every requirement (met / not_met / unclear + quote). A "met" without a verified quote is downgraded to "unclear".
- **Requirement owners** (`api/_lib/demo-deal.ts`): EU hosting → security/legal, self-serve → champion, warehouse → technical evaluator, pricing → procurement. For an owner, "unclear" blocks.
- **Committee by code** (`api/_lib/committee.ts`): owner blockers → eligible vendors → role votes → majority → economic-buyer veto. The model's own "preferred" vendor is recorded, never trusted; disagreement with its own verdicts is counted as a contradiction.
- **Stats** (`api/_lib/stats.ts`): Wilson intervals, two-proportion test.
- **Storage**: frozen snapshot + runs in Supabase schema `foil`, written only through secret-checked functions.
- **Batch runner** with free-tier pacing and a scheduled top-up mode.
- 23 unit tests.

## First committee runs

| Run | Model (served) | Outcome | Quotes verified | Downgraded | Contradictions | Tokens/agent |
|---|---|---|---|---|---|---|
| 1 | Groq gpt-oss-120b | no decision: no eligible vendor (7 blockers) | 30/33 | 3 | 2 of 5 agents | ~3.6K |
| 2 | Gemini flash-lite-latest | no decision: economic-buyer veto (PostHog was eligible) | 45/45 | 0 | 0 | ~4K |
| 3 | Gemini 3.5 flash lite | no decision: no eligible vendor | — | — | — | — |

Early signal (n=3, not yet meaningful): different model families agree on "no decision" but disagree on *why*; Groq's model contradicts its own verdicts far more often than Gemini.

## Operational findings

- Evidence packs cut prompts from ~15K to ~3–4K tokens; Groq's 8K tokens/minute limit is no longer a blocker.
- Gemini's free tier returned 503 "high demand" for minutes at a time; with retries a 5-agent committee takes 1–2 minutes, so only 1–3 runs fit in one 5-minute function call.
- `gemini-flash-lite-latest` currently resolves to `gemini-3.5-flash-lite`; the served version is now recorded per call.

## Next

- Unattended runner (scheduler calls the top-up endpoint) to reach N=20 (Gemini) and N=10 (Groq)
- Baseline report: outcome distribution with CIs, blocker frequencies per vendor × requirement, contradiction rate per model, cross-model agreement
