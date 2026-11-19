# M1 results — snapshot → one agent → citation check

Date: 2026-11-19 · Deal: `product-analytics-eu-series-b` (EU Series B SaaS choosing between PostHog, Mixpanel, Amplitude) · Role: economic buyer · Prompt: `committee-v0.2`

## What was built

- `api/_lib/snapshot.ts` — fetch + extract page text, sha256, `truncated` flag
- `api/_lib/extract.ts` — HTML→text, drops nav/footer/scripts and repeated menu labels
- `api/_lib/providers.ts` — Gemini + Groq adapters, retries on 429/5xx with backoff, traces (tokens, latency, attempts)
- `api/_lib/agent.ts` — role agent returning a structured memo; `no_decision` always allowed
- `api/_lib/citations.ts` — deterministic quote check (normalised string match, stitched-fragment rule); 12 unit tests
- Dev-only endpoints (blocked in production): `/api/dev/probe`, `/api/dev/m1`

## Runs

| Run | Model | Snapshot | Quotes verified | Vote | Blocker named | Latency | Tokens in/out |
|---|---|---|---|---|---|---|---|
| 1 | gemini-2.5-flash | v1 extractor, 8k cap (5/6 pages cut) | 6/9 (67%) | no_decision | EU hosting | 28.6s | 12.2k / 1.3k |
| 2 | gemini-2.5-flash | v2 extractor, 14k cap (1/6 cut, flagged) | 11/13 (85%) | no_decision | EU hosting, Snowflake, pricing | 45.4s | 14.1k / 1.8k |
| 3 | gemini-3.5-flash-lite | v2 | 4/4 (100%) | no_decision | Snowflake as source of truth | 6.5s | 14.1k / 1.0k |

## Findings

1. **"Missing proof" vs "cut off" must be separated.** Run 1 blamed every vendor for lacking EU hosting; two of them show it on their pricing pages, which the 8k cap had cut. Snapshots now record `truncated`, and the agent is told when absence may be a cut-off.
2. **Agents stitch quotes.** Two of run 1's failures were fragments joined with "…". The checker now accepts these only if every fragment is long and appears in order on one page; the prompt asks for one continuous excerpt.
3. **The model contradicts itself.** Run 2 quotes PostHog's EU (Frankfurt) hosting as a strength, then says no vendor shows EU hosting. → M2 design change: agents judge each must-have separately (met / not met / unclear + quote), and the vote is computed by code from those verdicts, not taken from the model's summary.
4. **Models disagree on *why*.** Both models vote no_decision, but for different reasons. This is the case for N repeats × multiple models and for reporting reason frequencies, not single answers.
5. **"No decision" dominates.** Matches real B2B buying, and is the most useful PMM signal so far: on public pages alone, none of the three vendors clears this buyer's must-haves.

## Model availability (free tier, this key, 2026-11-19)

| Model | Status |
|---|---|
| gemini-2.5-flash | works |
| gemini-3.5-flash-lite | works, fastest |
| gemini-flash-lite-latest | works |
| gemini-3.5-flash, gemini-flash-latest | 503 "high demand" at test time |
| gemini-2.5-flash-lite | 404, retired for new users |
| Groq llama-3.3-70b | not tested yet (key not set) |

Gemini returns no rate-limit headers; daily quotas must be read from the AI Studio dashboard.

## Open for M2

- Per-must-have verdicts + deterministic vote
- All five roles + committee decision rules
- N repeats, Wilson CIs, reason frequencies
- Groq as second model family
- Store runs (JSON in repo for the demo; DB later if needed)
