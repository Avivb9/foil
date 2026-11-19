# Judge evaluation — judge-v1

Snapshot `product-analytics-eu-series-b@2026-11-19-b69092a140` · judge prompt `judge-v0.1` · 30 items (3 vendors × 10 requirements)

**Answer key:** labelled by a PMM (the author). Every label is in `data/judge-eval-v1.json`.

Question: given the same excerpts, does the AI judge reach the same verdict (met / not met / unclear)?

## Accuracy against the answer key

| Judge | Agreement | 95% CI | Cohen's κ |
|---|---|---|---|
| gemini (majority of 3 runs) | 87% (26/30) | 70%–95% | 0.73 |
| gemini (single run, average) | 88% | — | 0.75 |
| keyword baseline | 77% (23/30) | 59%–88% | 0.37 |

κ corrects for chance: 0 = no better than guessing the label mix, 1 = perfect. The keyword baseline says "met" whenever a related word appears, which is right more often than you would think, but its κ is less than half that of the model.

## Self-consistency across repeats

- **gemini:** gave the same verdict in every repeat on 27 of 30 items (90%).

## Where gemini disagrees with the answer key

| Item | Answer key | Model (all repeats) |
|---|---|---|
| PostHog:D1 | met | unclear, unclear, met |
| Mixpanel:M3 | not_met | unclear, unclear, not_met |
| Mixpanel:D1 | unclear | not_met, not_met, not_met |
| Amplitude:D1 | met | not_met, not_met, not_met |

Confusion (rows = answer key, columns = model majority):

| | met | not_met | unclear |
|---|---|---|---|
| **met** | 18 | 1 | 1 |
| **not_met** | 0 | 0 | 1 |
| **unclear** | 0 | 1 | 8 |

