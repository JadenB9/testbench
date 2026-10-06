/* Fixture data for the wireframe.
   Replace this file with real API responses when a runner is connected. */

window.FIXTURES = (() => {
  const runs = [
    { id: 218, status: "passed", branch: "main",    sha: "a4f19c2", author: "r.okafor",  when: "12 min ago",  duration: "4m 12s", passed: 486, failed: 0,  skipped: 7,  coverage: 84.2 },
    { id: 217, status: "failed", branch: "main",    sha: "8db3e51", author: "l.moreau",  when: "1 h ago",     duration: "4m 38s", passed: 479, failed: 6,  skipped: 8,  coverage: 83.7,
      failedBy: { "auth": 2, "api/ledger": 1, "workers/ingest": 3 } },
    { id: 216, status: "passed", branch: "main",    sha: "10c7fa9", author: "r.okafor",  when: "3 h ago",     duration: "4m 04s", passed: 485, failed: 0,  skipped: 8,  coverage: 83.9 },
    { id: 215, status: "passed", branch: "release", sha: "cc2b840", author: "s.iyer",    when: "5 h ago",     duration: "3m 57s", passed: 484, failed: 0,  skipped: 9,  coverage: 83.4 },
    { id: 214, status: "failed", branch: "main",    sha: "7f0aa13", author: "l.moreau",  when: "8 h ago",     duration: "5m 21s", passed: 468, failed: 15, skipped: 10, coverage: 82.8,
      failedBy: { "auth": 5, "api/ledger": 4, "workers/ingest": 6 } },
    { id: 213, status: "passed", branch: "main",    sha: "b91d004", author: "j.tanaka",  when: "yesterday",   duration: "4m 09s", passed: 483, failed: 0,  skipped: 10, coverage: 82.9 },
    { id: 212, status: "cancelled", branch: "fix/session", sha: "5ea6cc7", author: "s.iyer", when: "yesterday", duration: "0m 42s", passed: 96, failed: 0, skipped: 397, coverage: null },
    { id: 211, status: "passed", branch: "main",    sha: "31bb7de", author: "r.okafor",  when: "2 days ago",  duration: "4m 15s", passed: 481, failed: 0,  skipped: 12, coverage: 82.6 },
  ];

  // Older → newer, for the pass-rate chart. The last eight are the runs
  // above (#211 → #218), so the chart and the rail agree.
  const history = [
    { passed: 470, failed: 9,  skipped: 14 }, { passed: 474, failed: 5,  skipped: 14 },
    { passed: 477, failed: 3,  skipped: 13 }, { passed: 468, failed: 14, skipped: 11 },
    { passed: 482, failed: 0,  skipped: 11 }, { passed: 482, failed: 0,  skipped: 11 },
    { passed: 473, failed: 8,  skipped: 12 }, { passed: 481, failed: 0,  skipped: 12 },
    { passed: 478, failed: 4,  skipped: 11 }, { passed: 483, failed: 0,  skipped: 10 },
    { passed: 477, failed: 6,  skipped: 10 }, { passed: 481, failed: 0,  skipped: 12 },
    { passed: 481, failed: 0,  skipped: 12 }, { passed: 96,  failed: 0,  skipped: 397 },
    { passed: 483, failed: 0,  skipped: 10 }, { passed: 468, failed: 15, skipped: 10 },
    { passed: 484, failed: 0,  skipped: 9  }, { passed: 485, failed: 0,  skipped: 8  },
    { passed: 479, failed: 6,  skipped: 8  }, { passed: 486, failed: 0,  skipped: 7  },
  ];

  // Each suite runs the same number of tests every time; how many of them
  // failed comes from the run's `failedBy`, and the skips drift a little
  // run to run. The listed cases are a sample, not the whole suite.
  // `detail` is what the failure panel shows for a failing case.
  const suites = [
    {
      name: "auth", total: 44, skipped: 1, duration: "38.4 s",
      cases: [
        { name: "login.spec.ts › rejects an expired token", status: "failed",  duration: "1.24 s",
          detail: {
            assertion: "expected 401, received 200", retries: "2 of 2 failed", firstSeen: 214,
            diff: "- expected\n+ received\n\n- status: 401\n+ status: 200\n- body.error: \"token_expired\"\n+ body.error: undefined",
            stack: "at Object.<anonymous> (tests/auth/login.spec.ts:48:23)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)\nat runNextTicks (node:internal/process/task_queues:64:3)\nat listOnTimeout (node:internal/timers:540:9)",
          } },
        { name: "login.spec.ts › issues a session cookie",  status: "passed",  duration: "0.31 s" },
        { name: "login.spec.ts › locks after 5 attempts",   status: "failed",  duration: "2.02 s",
          detail: {
            assertion: "expected status 423, received 401", retries: "1 of 2 failed", firstSeen: 214,
            diff: "- expected\n+ received\n\n- status: 423\n+ status: 401\n- headers[\"retry-after\"]: \"900\"\n+ headers[\"retry-after\"]: undefined",
            stack: "at Object.<anonymous> (tests/auth/login.spec.ts:91:27)\nat async Promise.all (index 4)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "refresh.spec.ts › rotates refresh tokens", status: "passed",  duration: "0.44 s" },
        { name: "mfa.spec.ts › enrols a TOTP device",       status: "skipped", duration: "—" },
      ],
    },
    {
      name: "api/payments", total: 98, skipped: 2, duration: "1m 12s",
      cases: [
        { name: "charge.spec.ts › captures an authorised charge", status: "passed", duration: "0.62 s" },
        { name: "charge.spec.ts › refuses a duplicate idempotency key", status: "passed", duration: "0.55 s" },
        { name: "refund.spec.ts › issues a partial refund", status: "passed", duration: "0.71 s" },
        { name: "webhook.spec.ts › verifies the signature", status: "skipped", duration: "—" },
      ],
    },
    {
      name: "api/ledger", total: 75, skipped: 0, duration: "52.1 s",
      cases: [
        { name: "posting.spec.ts › keeps debits equal to credits", status: "passed", duration: "0.48 s" },
        { name: "posting.spec.ts › rejects an unbalanced entry",   status: "failed", duration: "0.39 s",
          detail: {
            assertion: "expected promise to reject, it resolved", retries: "2 of 2 failed", firstSeen: 214,
            diff: "- expected\n+ received\n\n- rejects with UnbalancedEntryError\n+ resolved { id: \"je_1042\", debit: 100.00, credit: 99.99 }",
            stack: "at Object.<anonymous> (tests/api/ledger/posting.spec.ts:63:5)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "close.spec.ts › closes a period exactly once",    status: "passed", duration: "1.85 s" },
      ],
    },
    {
      name: "workers/ingest", total: 63, skipped: 2, duration: "1m 04s",
      cases: [
        { name: "batch.spec.ts › drains the queue under backpressure", status: "failed", duration: "4.10 s",
          detail: {
            assertion: "timed out after 4000 ms waiting for queue.depth to be 0", retries: "1 of 2 failed", firstSeen: 209,
            diff: "- expected\n+ received\n\n- queue.depth: 0\n+ queue.depth: 37",
            stack: "at waitFor (tests/helpers/wait.ts:22:11)\nat Object.<anonymous> (tests/workers/ingest/batch.spec.ts:118:9)",
          } },
        { name: "batch.spec.ts › retries a poisoned message thrice",   status: "failed", duration: "3.22 s",
          detail: {
            assertion: "expected 3 retries, received 4", retries: "2 of 2 failed", firstSeen: 217,
            diff: "- expected\n+ received\n\n- attempts: 3\n+ attempts: 4\n- deadLettered: true\n+ deadLettered: false",
            stack: "at Object.<anonymous> (tests/workers/ingest/batch.spec.ts:152:30)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "parse.spec.ts › rejects an oversized batch",          status: "failed", duration: "0.51 s",
          detail: {
            assertion: "expected PayloadTooLarge, received SyntaxError", retries: "2 of 2 failed", firstSeen: 214,
            diff: "- expected\n+ received\n\n- error.name: \"PayloadTooLarge\"\n+ error.name: \"SyntaxError\"",
            stack: "at Object.<anonymous> (tests/workers/ingest/parse.spec.ts:40:18)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "parse.spec.ts › tolerates a truncated payload",       status: "passed", duration: "0.28 s" },
      ],
    },
    {
      name: "ui/checkout", total: 126, skipped: 1, duration: "1m 41s",
      cases: [
        { name: "cart.spec.tsx › recalculates tax on address change", status: "passed", duration: "0.92 s" },
        { name: "cart.spec.tsx › restores an abandoned cart",         status: "passed", duration: "0.77 s" },
      ],
    },
    {
      name: "ui/components", total: 87, skipped: 2, duration: "24.7 s",
      cases: [
        { name: "button.spec.tsx › forwards a ref", status: "passed", duration: "0.06 s" },
        { name: "modal.spec.tsx › traps focus",     status: "passed", duration: "0.14 s" },
      ],
    },
  ];

  const flaky = [
    { test: "drains the queue under backpressure", suite: "workers/ingest", rate: 0.42, seq: "PFPPFPFPPPFPPFPPPFPP", owner: "l.moreau" },
    { test: "locks after 5 attempts",              suite: "auth",           rate: 0.28, seq: "PPFPPPFPPPPFPPPPFPPP", owner: "r.okafor" },
    { test: "closes a period exactly once",        suite: "api/ledger",     rate: 0.17, seq: "PPPPFPPPPPPFPPPPPPPP", owner: "s.iyer" },
    { test: "restores an abandoned cart",          suite: "ui/checkout",    rate: 0.11, seq: "PPPPPPFPPPPPPPPPPFPP", owner: "j.tanaka" },
  ];

  // `prefix` is the start of the rule ids a set owns; `count` is rules in the set.
  const rulesets = [
    { name: "correctness",  prefix: "correctness/", count: 14, enabled: true },
    { name: "security",     prefix: "sec/",         count: 6,  enabled: true },
    { name: "performance",  prefix: "perf/",        count: 9,  enabled: true },
    { name: "style",        prefix: "style/",       count: 41, enabled: true },
    { name: "accessibility",prefix: "a11y/",        count: 0,  enabled: false },
  ];

  const findings = [
    { sev: "blocker", rule: "sec/no-hardcoded-secret", msg: "API key committed in source", file: "workers/ingest/client.ts", line: 22 },
    { sev: "blocker", rule: "sec/sql-injection",       msg: "Query built by string concatenation", file: "api/ledger/report.ts", line: 118 },
    { sev: "blocker", rule: "correctness/await-missing",msg: "Promise not awaited; errors are swallowed", file: "api/payments/charge.ts", line: 64 },
    { sev: "major",   rule: "correctness/no-floating-null", msg: "Possible null dereference on `session`", file: "auth/refresh.ts", line: 41 },
    { sev: "major",   rule: "perf/n-plus-one",         msg: "Query executed inside a loop", file: "api/ledger/posting.ts", line: 87 },
    { sev: "major",   rule: "correctness/exhaustive-deps", msg: "Effect is missing a dependency", file: "ui/checkout/Cart.tsx", line: 132 },
    { sev: "major",   rule: "sec/weak-hash",           msg: "MD5 used for a security purpose", file: "auth/legacy.ts", line: 19 },
    { sev: "minor",   rule: "style/max-complexity",    msg: "Function complexity 24 exceeds 15", file: "workers/ingest/batch.ts", line: 8 },
    { sev: "minor",   rule: "style/no-console",        msg: "Unexpected console statement", file: "api/payments/webhook.ts", line: 55 },
    { sev: "minor",   rule: "style/prefer-const",      msg: "`total` is never reassigned", file: "ui/checkout/tax.ts", line: 12 },
    { sev: "minor",   rule: "style/no-unused-vars",    msg: "`legacyMode` is declared but never used", file: "api/config.ts", line: 7 },
  ];

  const hotspots = [
    { file: "workers/ingest/batch.ts",  churn: 46, complexity: 24, coverage: 61, risk: 0.94 },
    { file: "api/ledger/posting.ts",    churn: 38, complexity: 19, coverage: 72, risk: 0.81 },
    { file: "auth/refresh.ts",          churn: 31, complexity: 16, coverage: 68, risk: 0.74 },
    { file: "api/payments/charge.ts",   churn: 27, complexity: 14, coverage: 88, risk: 0.52 },
    { file: "ui/checkout/Cart.tsx",     churn: 22, complexity: 12, coverage: 79, risk: 0.44 },
    { file: "api/config.ts",            churn: 9,  complexity: 4,  coverage: 95, risk: 0.12 },
  ];

  // x = complexity, y = coverage
  const scatter = [
    { x: 24, y: 61 }, { x: 19, y: 72 }, { x: 16, y: 68 }, { x: 14, y: 88 },
    { x: 12, y: 79 }, { x: 11, y: 91 }, { x: 9,  y: 84 }, { x: 8,  y: 93 },
    { x: 7,  y: 76 }, { x: 6,  y: 97 }, { x: 5,  y: 89 }, { x: 4,  y: 95 },
    { x: 21, y: 44 }, { x: 18, y: 52 }, { x: 15, y: 58 }, { x: 3,  y: 99 },
    { x: 13, y: 66 }, { x: 10, y: 81 }, { x: 22, y: 55 }, { x: 6,  y: 70 },
  ];

  return { runs, history, suites, flaky, rulesets, findings, hotspots, scatter };
})();
