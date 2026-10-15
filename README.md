# testbench

A dashboard for test runs and code quality, demoed on fixture data.

**This is a demo, not a connected tool.** Every panel is real and works, but
the numbers come from one fixture file. Nothing talks to a test runner or a
static analyser, and the page says so in a banner.

Live: **https://j4den.com/testbench/**

![testbench, test runs tab](https://j4den.com/shots/testbench.jpg)

## What it does

**Test runs** — twenty runs in a rail with a text filter and status chips.
Picking one updates everything: the summary metrics (with a 20-run trend line
under pass rate, duration and coverage), the stacked pass/fail/skip chart,
the coverage trend, the suite tree, the failure panel and the flaky table. Each
test in the tree carries a verdict strip for the last twenty runs. The failure
panel shows the assertion, an expected/received diff, the stack trace and when
the test first broke. A details drawer gives the commit, trigger, runner, a
stage timing bar, what changed since the previous run, and downloads for the
run log and a JUnit XML file.

**Code quality** — rule-set toggles, blocker/major/minor counts, findings by
severity, a coverage-versus-complexity scatter (hover a point for the file), a
findings table with a text filter and severity chips where each row expands to
the flagged lines, and a hotspot list ranked by churn × complexity. *export
SARIF* writes a valid SARIF 2.1.0 file from the findings showing.

**Everything else** — light and dark themes with a toggle (it reads the same
`localStorage.theme` key as the rest of j4den.com and follows the device when
nothing is saved), keyboard shortcuts (`?` lists them), and the state in the
URL so a link opens on the same run, tab, filter and test.

Buttons that would need a live backend (re-run, re-scan, refresh, configure,
the coverage report) say so in a short notice instead of doing nothing.

## Running it

A static site with no build step and no dependencies.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

The one test checks that the fixtures agree with each other (run counts add
up, histories line up with runs, failed cases never exceed the suite's count,
flaky tests really flip, every finding belongs to a rule set):

```bash
node --test test/fixtures.test.js
```

## Layout

```
index.html              both tabs, the drawer and the shortcut list
css/testbench.css       dark and light token sets, one accent colour
js/fixtures.js          all sample data, isolated in one file
js/testbench.js         rendering and interaction
test/fixtures.test.js   consistency checks on the fixtures
```

## How the data fits together

Every view renders from `window.FIXTURES` in `js/fixtures.js` and nothing
else holds sample numbers. The rules that keep the panels agreeing:

- `runs` is oldest → newest and *is* the chart; each column is a run.
- a run's `stages` add up to its duration, and passed + failed + skipped is
  the same total on every complete run.
- each listed case has a `history` string with one letter per run (`P`, `F`,
  `S`, or `-` for a cancelled run). The tree, the failure panel, the flaky
  table and the verdict strips all read it. First-seen and flip rate are
  computed from it, never typed in.
- a run's `failedBy` counts failures per suite because the listed cases are a
  sample; listed failures never exceed it.
- relative times ("12 min ago") are measured from `now` in the fixtures, so
  the demo reads the same on any day.

Shapes, for wiring a real source later:

| key | shape |
|---|---|
| `runs` | `{id, status, branch, sha, author, trigger, pr?, message, startedAt, stages[], passed, failed, skipped, coverage, failedBy?}` |
| `suites` | `{name, total, skipped, duration, cases[]}`, a case is `{name, duration, history, detail?}` |
| `flaky` | `{suite, test, owner}` |
| `rulesets` | `{name, prefix, count, enabled}` |
| `findings` | `{sev, rule, msg, file, line, snippet[3]}` |
| `files` | `{file, churn, complexity, coverage}` — feeds the scatter and the hotspots |
| `scan` | the figures in the code-quality header and metric cards |

JUnit XML or a runner's JSON reporter map onto runs and suites; SARIF maps
onto findings.

## Status

Demo on fixtures. Next would be a small adapter that builds this object from
a real reporter, then persisting run history.

## License

MIT
