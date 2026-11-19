# Judge evaluation — judge-v1

Snapshot `product-analytics-eu-series-b@2026-11-19-b69092a140` · judge prompt `judge-v0.1` · 30 items (3 vendors × 10 requirements)

**Reference labels:** claude (Claude Opus 5.5, labelled strictly from the same excerpts; one-line reason per item; had seen Gemini's answers before labelling). Every label and its reason is in `data/judge-eval-v1.json`.

Question: given the same excerpts, does the AI judge reach the same verdict (met / not met / unclear)?

## Accuracy against the reference labels

| Judge | Agreement | 95% CI | Cohen's κ |
|---|---|---|---|
| gemini (majority of 3 runs) | 87% (26/30) | 70%–95% | 0.74 |
| gemini (single run, average) | 88% | — | 0.76 |
| keyword baseline | 73% (22/30) | 56%–86% | 0.33 |

κ corrects for chance: 0 = no better than guessing the label mix, 1 = perfect. The keyword baseline says "met" whenever a related word appears, which is right more often than you would think and still has near-zero κ.

## Self-consistency across repeats

- **gemini:** gave the same verdict in every repeat on 27 of 30 items (90%).

## Where gemini disagrees with the reference

| Item | Reference | Model (all repeats) | Reference reason |
|---|---|---|---|
| PostHog:D1 | met | unclear, unclear, met | "set billing limits on most products so you never get a surprise bill" |
| Mixpanel:M3 | not_met | unclear, unclear, not_met | Connectors "bring warehouse data into Mixpanel" and count toward the event limit: a second copy |
| Mixpanel:D1 | unclear | not_met, not_met, not_met | Volume-tiered pricing with annual savings; no caps or limits shown either way |
| Amplitude:D1 | unclear | not_met, not_met, not_met | "scales with your event volume"; real-time usage tracking but no caps shown |

Confusion (rows = reference, columns = model majority):

| | met | not_met | unclear |
|---|---|---|---|
| **met** | 18 | 0 | 1 |
| **not_met** | 0 | 0 | 1 |
| **unclear** | 0 | 2 | 8 |

## Human spot-check

- Amplitude:D1: human said **met**, reference says **unclear** (disagree: a borderline item, see reason).

