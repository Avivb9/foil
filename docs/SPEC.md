# Foil v2 — Spec & Architecture

**One line:** Foil runs your positioning through a simulated B2B buying committee — real LLM agents reading a frozen snapshot of you and your competitors — many times, across two model families, and tells you whether you win, lose, or (most often) get "no decision", why, and whether a rewrite actually moves the number.

Status: draft v0.1 · 2026-11-19 · owner: Aviv Braun

---

## 1. Why this exists (the PMM problem)

- Buyers now shortlist with AI before talking to sales. PMMs can't interview those buyers.
- Most "AI visibility" tools measure brand mentions. A PMM needs **deal-level** answers: *for this buyer, with these constraints, against these competitors — do we win, and what proof is missing?*
- Synthetic buyers are known to be too agreeable (they almost never say no). Any tool that ignores this produces flattering, useless numbers.

## 2. What it does — the loop

1. **Brief** — positioning (April Dunford's 5 components, as in v1) + a deal brief: company size, stack, budget band, must-haves, deal-breakers, status quo.
2. **Snapshot** — fetch 3–6 pages per vendor (home, product, pricing, security/trust, integrations). Store text + hash + timestamp. All agents read the same frozen copy.
3. **Committee** — 4–5 role agents (economic buyer, technical evaluator, champion, procurement, legal/security). Each reads pages via a tool, writes a memo, scores vendors on *its own* criteria, and votes: a vendor or **no decision**.
4. **Decide** — committee rules: economic buyer can veto, any hard blocker from procurement/legal = blocked, otherwise majority. Outcome: win / loss (to whom) / no decision.
5. **Repeat** — N runs × 2 model families (Gemini Flash, Llama 3.3 70B via Groq).
6. **Readout** — win rate with confidence intervals, loss reasons clustered, the missing claim/proof, quotes the agents relied on.
7. **Fix & prove** — generate a rewrite of *your* page only, re-run against the same snapshot (counterfactual A/B), report whether the change is real or noise.

## 3. What makes it rigorous (the engineering)

| Problem | How Foil v2 handles it |
|---|---|
| Agents agree with everything | "No decision" is always an option; a **placebo vendor** (deliberately weak page) is included in calibration runs; we report raw and bias-adjusted win rates |
| LLM output is random | N repeats per model; Wilson 95% CIs; two-proportion test / bootstrap for before-vs-after |
| One model's quirks | Two model families; cross-model agreement (Cohen's kappa) reported |
| Hallucinated reasons | Every reason must quote the snapshot; **citation check is deterministic string-match**, no LLM. Uncited reasons are dropped and counted |
| The judge grades itself | Positioning judge is validated against ~30 statements hand-labelled by a PMM; reported as rank correlation |
| Is the AI even needed? | v1's rule-based scorer (`src/logic/scoring.ts`) stays as a **baseline**; the LLM judge must beat it on the labelled set |
| Live web changes under you | Frozen snapshot = controlled experiment; only the variable you change differs |

## 4. Architecture

```
Browser (existing Vite/React UI)
   │  brief, positioning, vendor URLs
   ▼
Vercel Functions (/api)
   ├─ snapshot   → fetch + extract text → store
   ├─ run        → one committee run (agents in parallel) → store
   ├─ batch      → queue N×models runs (background, rate-limit aware)
   ├─ judge      → Dunford-component scoring (LLM) vs baseline
   └─ rewrite    → proposes page rewrite → triggers counterfactual batch
   ▼
Model providers: Gemini (free tier) · Groq (free tier) · BYOK in live mode
Storage: Supabase (free tier) — snapshots, runs, verdicts, labels, costs
```

- Every model call logs: model, tokens, latency, cost estimate, prompt version → trace view + eval page.
- Prompts are versioned files; changing one creates a new prompt version so results stay comparable.

## 5. Cost model (budget: $3/month)

- Billing stays **off** on both providers → no charges possible.
- Big experiments run in the background within free-tier rate limits and are stored; the public demo shows stored runs.
- Live "try it" mode: visitor pastes their own Gemini key (kept in their browser only), capped run size.
- **Open risk:** free-tier daily limits may be low for some models. M1 measures real limits and sets N accordingly (may mean experiments spread over days).

## 6. Evals page (public)

1. Judge vs PMM labels (rank correlation) — LLM judge vs rule-based baseline
2. Citation validity rate (share of reasons with a verifiable quote)
3. Run-to-run variance and CI width vs N
4. Cross-model agreement
5. Placebo adoption rate (the "yes-bias" number), before and after correction
6. Cost and latency per committee run

## 7. Packaging

- Web app (existing UI, upgraded)
- Public GitHub repo: README with 30-second setup, architecture diagram, eval results, limits
- Phase 2: MCP server + Claude Code skill (`foil run <brief>`)

## 8. Milestones

| # | Deliverable | Done when |
|---|---|---|
| M1 | Snapshot + one agent + citation check, both providers | One agent memo with verified quotes; real rate limits measured |
| M2 | Full committee + decision rules + N repeats + CIs | Win/loss/no-decision distribution for a demo deal |
| M3 | Judge + labelling screen for Aviv + baseline comparison | Correlation numbers on ~30 labels |
| M4 | Diagnose + rewrite + counterfactual A/B | Before/after with significance |
| M5 | Evals page, README, deploy, site card | Public demo with stored runs |
| M6 | MCP server + Claude Code skill | Installable |

## 9. Known limits (to publish, not hide)

- Agents read text snapshots, not the full visual page; real buyers also use reviews, peers, analysts.
- Simulated committees approximate decision dynamics; they are a rehearsal, not ground truth.
- Free-tier models are not the strongest available; results reflect those models.
- Demo deals use public companies' public pages only.
