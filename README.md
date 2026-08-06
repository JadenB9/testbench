# testbench

A wireframe for a unified test-run and code-quality dashboard.

**This is a wireframe.** The layout, navigation, and interactions are real and
working; the numbers behind them are fixtures. Nothing is connected to a test
runner or a static analyser yet.

Live: **https://j4den.com/testbench/**

## What it covers

**Test runs** — run history rail, run summary metrics (pass rate, counts,
duration, coverage delta), a stacked pass/fail/skip chart across the last 20
runs, an expandable suite and case tree with filters, a failure detail panel
with expected/received diff and stack trace, and a flaky-test tracker showing
verdict flips over time.

**Code quality** — rule-set toggles, blocker/major/minor counts, debt ratio and
duplication, findings by severity, a coverage-versus-complexity scatter that
flags the bottom-right quadrant, a filterable findings table, and a hotspot list
ranked by churn × complexity.

## Running it

It is a static site with no build step and no dependencies.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Layout

```
index.html            both tabs
css/testbench.css     dark theme, one accent colour
js/fixtures.js        all sample data, isolated in one file
js/testbench.js       rendering and interaction
```

## Connecting real data

Every view renders from `window.FIXTURES` in `js/fixtures.js` and nothing else
reads sample data. Replacing that object with a `fetch()` against a real
endpoint keeps all the existing views working. The shapes it expects:

| key | shape |
|---|---|
| `runs` | `{id, status, branch, sha, author, when, duration, passed, failed, skipped, coverage}` |
| `history` | `{passed, failed, skipped}` oldest → newest |
| `suites` | `{name, passed, failed, skipped, duration, cases[]}` |
| `flaky` | `{test, suite, rate, seq, owner}` |
| `findings` | `{sev, rule, msg, file, line}` |
| `hotspots` | `{file, churn, complexity, coverage, risk}` |
| `scatter` | `{x, y}` — complexity, coverage |

Standard sources map onto these directly: JUnit XML or a runner's JSON reporter
for runs and suites, and SARIF for findings.

## Status

Wireframe. Next: wire `fixtures.js` to a real reporter, then persist run history.

## License

MIT
