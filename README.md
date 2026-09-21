# Foil

**Attack your positioning before the market does.**

Foil pressure-tests product positioning for product marketers, founders and product leaders. You enter a positioning statement as April Dunford's five components. Five buyer-side personas attack it, Foil scores it with a transparent model, explains the weak spots and rewrites it.

Designed and built by [Aviv Braun](https://avivbraun.com).

> This demo version runs entirely in the browser with a sample workspace (Northbeam): no backend, no accounts, no API keys. Scoring, objections and rewrites are deterministic, rule-based logic run on your own text. The scores, diffs and objections are computed live from what you type, and the generated copy quotes your own words back.

---

## Run it locally

Requires Node 18+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # tsc --noEmit + production build to dist/
npm run preview      # serve the production build
npm run typecheck    # tsc --noEmit only
```

## Deploy to Vercel

`vercel.json` already contains the SPA rewrite (every path serves `index.html`), so deep links like `/spars/kestrel` and `/share/ldg-7f3k2q` work.

```bash
npm i -g vercel
vercel login
vercel --prod
```

Accept the detected Vite settings (build `npm run build`, output `dist`).

---

## Architecture

```
src/
  logic/        Pure functions, no React
    types.ts        Domain types: Fields, Persona, Objection, ScoreResult, Spar, Report
    text.ts         Tokenising, buzzword matching, quotable phrase extraction, hashing
    compose.ts      Builds the statement from the five components (as colour-coded segments)
    scoring.ts      0–100 per component + weighted overall + readability adjustment
    objections.ts   Lens templates: one objection per persona, quoting the user's text
    rewrite.ts      Rule-based rewrite: strips buzzwords, adds specificity, marks [gaps]
    diff.ts         Word-level LCS diff for the before/after view
    markdown.ts     Report → markdown export
    format.ts       Dates and relative time
  data/         Seed data and all copy
    intro.ts        Every word of the intro overlay
    lexicon.ts      Buzzwords, role/size/industry tokens, 40+ known categories with peers
    personas.ts     The five default personas and the seven lenses
    examples.ts     Weak / okay / strong Kestrel examples + field help text
    seed.ts         Five spars with version history, reports, members, notifications
  store/
    app.ts          Zustand store, persisted to localStorage through a try/catch wrapper
    ui.ts           Toasts, intro (sessionStorage), command palette
  components/   App shell, intro, command palette, UI primitives, spar widgets
  pages/        Spars, New spar, Spar workspace, Personas, Reports, Report, Shared report, Settings, Sign-in
```

**Stack:** Vite, React 18, TypeScript (strict), Tailwind CSS, React Router, Zustand, Recharts, Framer Motion, lucide-react. Fonts: Inter for UI, Fraunces for display.

### How scoring works

Each component starts from a base score, and every rule adds or subtracts points into a visible ledger. Open any bar on the Scorecard tab to see the ledger.

| Component | Rewards | Penalises |
|---|---|---|
| Target customer | buyer role, company size/stage, industry, tech environment | "organizations", "businesses", "all sizes" when unqualified |
| Competitive alternatives | a named vendor, the status quo (spreadsheets, hiring), more than one | "legacy tools", "the competition" |
| Unique attributes | a mechanism ("by…", "using your own…"), integrations, checkable specifics | generic claims (AI, faster, easier), overlap with the alternatives text |
| Value and proof | a number, a quantified outcome, a proof source, cost/payback | "efficiency", "better outcomes", "save time" |
| Market category | a known category box (40+ with named peers), 2–5 words | superlatives ("leading"), made-up categories |

All components pay a buzzword tax (`leading`, `AI-powered`, `end-to-end`, `seamless`, `platform`, `empower`…). The overall score is the weighted average (default weights 20/20/25/20/15, editable in **Settings → Scoring**) plus a readability adjustment. **Pressure mode** scales strictness: Friendly applies penalties at 0.7×, Brutal at 1.4× with bonuses at 0.9×. A soft floor keeps very weak text distinguishable from merely weak text.

Placeholders like `[metric]` earn half credit, so the rewrite's structure is rewarded but only real specifics earn full marks.

### How the panel works

Each persona has a **lens** (Budget, Differentiation, Technical depth, Clarity, Category/evidence, Procurement, Legal). The lens decides which component the persona attacks and which templates they use. Severity (Minor / Serious / Deal-breaker) comes from that component's score against mode-specific thresholds. Custom personas plug into the same lens templates.

### Persistence

State is stored in `localStorage` (key `foil-workspace-v1`), wrapped in try/catch so private windows still work in memory. The intro's dismissed state is kept in `sessionStorage`, so it shows once per session. Seeded reports have fixed share slugs, so their `/share/…` links work in any browser. Reports you create are shareable within the same browser, since there's no server.

---

## 60-second product tour

To start from a clean workspace, open **Settings → Workspace → Reset workspace data**, then open a fresh tab so the intro shows.

| Time | Click | What to say or show |
|---|---|---|
| 0:00 | Intro overlay. Scroll once through the problem, 3 steps and metrics, then **Start exploring** | "Most positioning dies on the first sales call." |
| 0:07 | **Spars** list | Real computed scores, trend sparklines, open deal-breakers |
| 0:10 | Click **Kestrel** | The buzzword statement. Flagged words under each field, score around 11 |
| 0:15 | **Start spar** | "Convening your panel…", then the cards stream in |
| 0:20 | Let Dana, Marcus ("So you're basically 'legacy tools' with a new label") and Tyler's botched cold call play. Click **Show all now** | Every objection quotes my own words |
| 0:32 | **Fix with a rewrite** | Diff: struck buzzwords, highlighted specifics, amber `[gaps]`. Projected score 11 → 58 |
| 0:38 | **Apply rewrite** → **Re-run spar** | Score ring animates, +47 delta, deal-breakers drop to zero |
| 0:45 | Under *Target customer* click **3 gaps to fill** and type over the first gap, e.g. `SOC leads` | Live estimate climbs as you type |
| 0:50 | **Save as version** → **History** tab | Score-trend sparkline |
| 0:54 | **⋯ → Create report** → **Share link** → **Preview as a viewer** | Read-only shared report |
| 0:58 | Press **Ctrl/⌘ K** | "Everything's one keystroke away." |

Optional extras: **Load example → Sales-call ready** (scores about 90), **Personas → Add persona** (a Procurement lens joins the next spar), **Settings → Scoring** (drag a weight and watch every spar re-score in the preview).

## Keyboard shortcuts

`Ctrl/⌘ K` command palette · `/` search · `N` new spar · `G` then `S`/`P`/`R` go to Spars/Personas/Reports · `Ctrl/⌘ Enter` start spar · `?` all shortcuts · `Esc` closes the intro, modals and menus.
