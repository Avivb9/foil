# Before / after: posthog-proof-v1

Model: gemini · before: `before (original page)` (n=20) · after: `after (page + proof)` (n=18)

**The only change:** Baseline blockers for PostHog were the warehouse requirement (technical evaluator) and predictable pricing (procurement). The test adds one proof block for each to PostHog's pricing page; the other five pages are byte-identical.

Text added to the page (hypothetical copy written for this test, not the vendor's real page):

> Works with your data warehouse
>
> Keep Snowflake as your source of truth. Connect Snowflake, BigQuery or Redshift and query those tables next to your product events, and export PostHog events back to Snowflake on a schedule, so your data team models everything in one place.
>
> Pricing you can predict
>
> Set a hard monthly spending cap for each product. When you reach it we stop billing, not your dashboards, so your invoice never exceeds the cap you set. Use the calculator to see your exact monthly price at your event volume before you sign up.

## Did PostHog move?

| Measure | Before | After | Change |
|---|---|---|---|
| PostHog wins the deal | 0% (0/20, CI 0%–16%) | 6% (1/18, CI 1%–26%) | +6 pts, p=0.285 |
| PostHog clears every requirement owner | 10% (2/20, CI 3%–30%) | 6% (1/18, CI 1%–26%) | -4 pts, p=0.612 |
| Blocked on Predictable pricing (procurement) | 70% (14/20, CI 48%–85%) | 94% (17/18, CI 74%–99%) | +24 pts, p=0.052 |
| Blocked on EU data hosting (security legal) | 0% (0/20, CI 0%–16%) | 0% (0/18, CI 0%–18%) | +0 pts, p=1.000 |
| Blocked on Self-serve for PMs (champion) | 0% (0/20, CI 0%–16%) | 0% (0/18, CI 0%–18%) | +0 pts, p=1.000 |
| Blocked on Works with Snowflake (technical evaluator) | 80% (16/20, CI 58%–92%) | 0% (0/18, CI 0%–18%) | -80 pts, p=<0.001 |
| Committee members voting PostHog (avg of 5) | 1.0 | 3.1 | |
| Committee ends in no decision | 100% (20/20, CI 84%–100%) | 94% (17/18, CI 74%–99%) | -6 pts, p=0.285 |

## Placebo check: vendors that were not edited

If the experiment is clean, these should not move much.

| Vendor | Blocked by any owner, before | After | Change |
|---|---|---|---|
| Mixpanel | 100% (20/20, CI 84%–100%) | 100% (18/18, CI 82%–100%) | +0 pts, p=1.000 |
| Amplitude | 100% (20/20, CI 84%–100%) | 100% (18/18, CI 82%–100%) | +0 pts, p=1.000 |

p-values are two-proportion z-tests; with n≈20 per arm only large effects are detectable, so a non-significant change is "not shown", not "no effect".

