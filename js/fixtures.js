/* Fixture data for the demo. Nothing else on the page holds sample numbers,
   so replacing this object with a fetch() against a real runner keeps every
   view working. The shapes are documented in the README.

   The rules that keep the views agreeing with each other:
   - `runs` is oldest → newest and IS the chart; every column is a run.
   - a run's `stages` add up to its duration, and passed + failed + skipped
     is the same 493 tests on every complete run.
   - each listed case has a 20-character `history`, one letter per run in
     order: P passed, F failed, S skipped, - did not run (cancelled). The
     tree, the failure panel, the flaky table and every sparkline read it.
   - a run's `failedBy` counts failures per suite (listed cases are only a
     sample of a suite); listed F's never exceed it. test/fixtures.test.js
     checks all of this. */

window.FIXTURES = (() => {
  // The clock the demo runs on. Relative times ("12 min ago") are measured
  // from here rather than from Date.now(), so the page reads the same on any
  // day instead of ageing into "3 years ago".
  const now = "2026-10-15T14:32:00Z";

  // stages are [install, lint, unit, e2e] in seconds
  const runs = [
    { id: 199, status: "failed", branch: "main", sha: "3e51c0a", author: "l.moreau", trigger: "push",
      message: "Add retry budget to ingest batch worker", startedAt: "2026-10-05T15:10:00Z",
      stages: [38, 21, 148, 101], passed: 470, failed: 9, skipped: 14, coverage: 82.1,
      failedBy: { "auth": 2, "api/ledger": 3, "workers/ingest": 4 } },
    { id: 200, status: "failed", branch: "main", sha: "92af7b1", author: "r.okafor", trigger: "push",
      message: "Hash session ids before logging them", startedAt: "2026-10-06T09:42:00Z",
      stages: [36, 20, 141, 96], passed: 474, failed: 5, skipped: 14, coverage: 82.3,
      failedBy: { "workers/ingest": 3, "auth": 2 } },
    { id: 201, status: "failed", branch: "feat/ledger-close", sha: "6d0e4c8", author: "s.iyer", trigger: "pull_request", pr: 412,
      message: "Close a ledger period in one transaction", startedAt: "2026-10-06T14:05:00Z",
      stages: [37, 20, 144, 95], passed: 477, failed: 3, skipped: 13, coverage: 82.4,
      failedBy: { "workers/ingest": 2, "api/ledger": 1 } },
    { id: 202, status: "failed", branch: "main", sha: "c17d9e3", author: "l.moreau", trigger: "push",
      message: "Bump node to 20.11 and pin pnpm", startedAt: "2026-10-07T08:15:00Z",
      stages: [52, 22, 160, 118], passed: 468, failed: 14, skipped: 11, coverage: 81.9,
      failedBy: { "auth": 4, "api/ledger": 3, "workers/ingest": 5, "ui/checkout": 2 } },
    { id: 203, status: "passed", branch: "main", sha: "0b4ee71", author: "r.okafor", trigger: "push",
      message: "Fix lockfile after node bump", startedAt: "2026-10-07T09:50:00Z",
      stages: [35, 20, 135, 92], passed: 482, failed: 0, skipped: 11, coverage: 82.5 },
    { id: 204, status: "passed", branch: "main", sha: "0b4ee71", author: "r.okafor", trigger: "schedule",
      message: "Fix lockfile after node bump", startedAt: "2026-10-08T02:00:00Z",
      stages: [34, 19, 136, 93], passed: 482, failed: 0, skipped: 11, coverage: 82.5 },
    { id: 205, status: "failed", branch: "fix/session", sha: "d8f31a2", author: "s.iyer", trigger: "pull_request", pr: 418,
      message: "Rotate the session cookie on privilege change", startedAt: "2026-10-08T10:20:00Z",
      stages: [36, 20, 151, 102], passed: 473, failed: 8, skipped: 12, coverage: 82.2,
      failedBy: { "workers/ingest": 4, "ui/checkout": 2, "api/ledger": 1, "auth": 1 } },
    { id: 206, status: "passed", branch: "main", sha: "4c9b2d7", author: "j.tanaka", trigger: "push",
      message: "Tighten cart tax rounding to two places", startedAt: "2026-10-08T16:40:00Z",
      stages: [35, 19, 134, 90], passed: 481, failed: 0, skipped: 12, coverage: 82.7 },
    { id: 207, status: "failed", branch: "main", sha: "e2a61f5", author: "m.alvarez", trigger: "push",
      message: "Stream batch parsing instead of buffering", startedAt: "2026-10-09T11:05:00Z",
      stages: [36, 20, 152, 99], passed: 478, failed: 4, skipped: 11, coverage: 82.4,
      failedBy: { "workers/ingest": 2, "auth": 1, "api/ledger": 1 } },
    { id: 208, status: "passed", branch: "main", sha: "7a3c0d9", author: "m.alvarez", trigger: "push",
      message: "Cap the parse buffer at 8 MiB", startedAt: "2026-10-09T13:30:00Z",
      stages: [35, 19, 133, 89], passed: 483, failed: 0, skipped: 10, coverage: 82.8 },
    { id: 209, status: "failed", branch: "release", sha: "b0e8f24", author: "s.iyer", trigger: "push",
      message: "Release 2.14.0", startedAt: "2026-10-10T09:00:00Z",
      stages: [37, 20, 147, 97], passed: 477, failed: 6, skipped: 10, coverage: 82.6,
      failedBy: { "workers/ingest": 3, "api/payments": 2, "auth": 1 } },
    { id: 210, status: "passed", branch: "release", sha: "1f6d3a0", author: "s.iyer", trigger: "push",
      message: "Release 2.14.1: idempotency key check on refunds", startedAt: "2026-10-10T15:25:00Z",
      stages: [36, 20, 136, 91], passed: 481, failed: 0, skipped: 12, coverage: 82.7 },
    { id: 211, status: "passed", branch: "main", sha: "31bb7de", author: "r.okafor", trigger: "push",
      message: "Merge release 2.14.1 back into main", startedAt: "2026-10-13T10:12:00Z",
      stages: [35, 19, 135, 66], passed: 481, failed: 0, skipped: 12, coverage: 82.6 },
    { id: 212, status: "cancelled", branch: "fix/session", sha: "5ea6cc7", author: "s.iyer", trigger: "manual",
      message: "WIP: session refresh race", startedAt: "2026-10-14T17:58:00Z",
      stages: [34, 8, 0, 0], passed: 96, failed: 0, skipped: 397, coverage: null },
    { id: 213, status: "passed", branch: "main", sha: "b91d004", author: "j.tanaka", trigger: "push",
      message: "Restore abandoned carts from the last snapshot", startedAt: "2026-10-14T20:55:00Z",
      stages: [35, 19, 131, 64], passed: 483, failed: 0, skipped: 10, coverage: 82.9 },
    { id: 214, status: "failed", branch: "main", sha: "7f0aa13", author: "l.moreau", trigger: "push",
      message: "Move token expiry checks into middleware", startedAt: "2026-10-15T06:30:00Z",
      stages: [40, 21, 158, 102], passed: 468, failed: 15, skipped: 10, coverage: 82.8,
      failedBy: { "auth": 5, "api/ledger": 4, "workers/ingest": 6 } },
    { id: 215, status: "passed", branch: "release", sha: "cc2b840", author: "s.iyer", trigger: "push",
      message: "Release 2.14.2: pin ingest client", startedAt: "2026-10-15T09:28:00Z",
      stages: [35, 19, 124, 59], passed: 484, failed: 0, skipped: 9, coverage: 83.4 },
    { id: 216, status: "passed", branch: "main", sha: "10c7fa9", author: "r.okafor", trigger: "push",
      message: "Revert token expiry middleware", startedAt: "2026-10-15T11:27:00Z",
      stages: [35, 19, 128, 62], passed: 485, failed: 0, skipped: 8, coverage: 83.9 },
    { id: 217, status: "failed", branch: "main", sha: "8db3e51", author: "l.moreau", trigger: "push",
      message: "Reland token expiry middleware with a grace window", startedAt: "2026-10-15T13:31:00Z",
      stages: [36, 20, 152, 70], passed: 479, failed: 6, skipped: 8, coverage: 83.7,
      failedBy: { "auth": 2, "api/ledger": 1, "workers/ingest": 3 } },
    { id: 218, status: "passed", branch: "main", sha: "a4f19c2", author: "r.okafor", trigger: "push",
      message: "Handle a missing retry-after header", startedAt: "2026-10-15T14:20:00Z",
      stages: [35, 19, 130, 68], passed: 486, failed: 0, skipped: 7, coverage: 84.2 },
  ];

  const stageNames = ["install", "lint", "unit", "e2e"];
  const runner = "ubuntu-22.04 · node 20.11 · pnpm 9.1";

  // `history` is one letter per run above, oldest first (index 13 is the
  // cancelled run). `detail` is what the failure panel shows when the case
  // failed in the selected run. Listed cases are a sample of each suite.
  const suites = [
    {
      name: "auth", total: 44, skipped: 1, duration: 38.4,
      cases: [
        { name: "login.spec.ts › rejects an expired token", duration: "1.24 s", history: "FPPFPPPPPPPPP-PFPPFP",
          detail: {
            assertion: "expected 401, received 200", retries: "2 of 2 failed",
            diff: "- expected\n+ received\n\n- status: 401\n+ status: 200\n- body.error: \"token_expired\"\n+ body.error: undefined",
            stack: "at Object.<anonymous> (tests/auth/login.spec.ts:48:23)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)\nat runNextTicks (node:internal/process/task_queues:64:3)\nat listOnTimeout (node:internal/timers:540:9)",
          } },
        { name: "login.spec.ts › issues a session cookie", duration: "0.31 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "login.spec.ts › locks after 5 attempts", duration: "2.02 s", history: "PFPPPPFPFPPPP-PFPPFP",
          detail: {
            assertion: "expected status 423, received 401", retries: "1 of 2 failed",
            diff: "- expected\n+ received\n\n- status: 423\n+ status: 401\n- headers[\"retry-after\"]: \"900\"\n+ headers[\"retry-after\"]: undefined",
            stack: "at Object.<anonymous> (tests/auth/login.spec.ts:91:27)\nat async Promise.all (index 4)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "refresh.spec.ts › rotates refresh tokens", duration: "0.44 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "mfa.spec.ts › enrols a TOTP device", duration: "—", history: "SSSSSSSSSSSSS-SSSSSS" },
      ],
    },
    {
      name: "api/payments", total: 98, skipped: 2, duration: 72,
      cases: [
        { name: "charge.spec.ts › captures an authorised charge", duration: "0.62 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "charge.spec.ts › refuses a duplicate idempotency key", duration: "0.55 s", history: "PPPPPPPPPPFPP-PPPPPP",
          detail: {
            assertion: "expected 409, received 201", retries: "2 of 2 failed",
            diff: "- expected\n+ received\n\n- status: 409\n+ status: 201\n- body.error: \"duplicate_idempotency_key\"\n+ body.id: \"ch_9f21\"",
            stack: "at Object.<anonymous> (tests/api/payments/charge.spec.ts:77:19)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "refund.spec.ts › issues a partial refund", duration: "0.71 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "webhook.spec.ts › verifies the signature", duration: "—", history: "SSSSSSSSSSSSS-SSSSSS" },
      ],
    },
    {
      name: "api/ledger", total: 75, skipped: 0, duration: 52.1,
      cases: [
        { name: "posting.spec.ts › keeps debits equal to credits", duration: "0.48 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "posting.spec.ts › rejects an unbalanced entry", duration: "0.39 s", history: "FPPFPPPPPPPPP-PFPPFP",
          detail: {
            assertion: "expected promise to reject, it resolved", retries: "2 of 2 failed",
            diff: "- expected\n+ received\n\n- rejects with UnbalancedEntryError\n+ resolved { id: \"je_1042\", debit: 100.00, credit: 99.99 }",
            stack: "at Object.<anonymous> (tests/api/ledger/posting.spec.ts:63:5)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "close.spec.ts › closes a period exactly once", duration: "1.85 s", history: "PPFPPPPPFPPPP-PPPPPP",
          detail: {
            assertion: "expected 1 close event, received 2", retries: "1 of 2 failed",
            diff: "- expected\n+ received\n\n- events.length: 1\n+ events.length: 2\n+ events[1]: { type: \"period.closed\", period: \"2026-09\" }",
            stack: "at Object.<anonymous> (tests/api/ledger/close.spec.ts:41:28)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
      ],
    },
    {
      name: "workers/ingest", total: 63, skipped: 2, duration: 64,
      cases: [
        { name: "batch.spec.ts › drains the queue under backpressure", duration: "4.10 s", history: "FPPPPPFPPPFPP-PFPPFP",
          detail: {
            assertion: "timed out after 4000 ms waiting for queue.depth to be 0", retries: "1 of 2 failed",
            diff: "- expected\n+ received\n\n- queue.depth: 0\n+ queue.depth: 37",
            stack: "at waitFor (tests/helpers/wait.ts:22:11)\nat Object.<anonymous> (tests/workers/ingest/batch.spec.ts:118:9)",
          } },
        { name: "batch.spec.ts › retries a poisoned message thrice", duration: "3.22 s", history: "PPPPPPPPPPPPP-PPPPFP",
          detail: {
            assertion: "expected 3 retries, received 4", retries: "2 of 2 failed",
            diff: "- expected\n+ received\n\n- attempts: 3\n+ attempts: 4\n- deadLettered: true\n+ deadLettered: false",
            stack: "at Object.<anonymous> (tests/workers/ingest/batch.spec.ts:152:30)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "parse.spec.ts › rejects an oversized batch", duration: "0.51 s", history: "PPPFPPPPPPPPP-PFPPFP",
          detail: {
            assertion: "expected PayloadTooLarge, received SyntaxError", retries: "2 of 2 failed",
            diff: "- expected\n+ received\n\n- error.name: \"PayloadTooLarge\"\n+ error.name: \"SyntaxError\"",
            stack: "at Object.<anonymous> (tests/workers/ingest/parse.spec.ts:40:18)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
        { name: "parse.spec.ts › tolerates a truncated payload", duration: "0.28 s", history: "PPPPPPPPPPPPP-PPPPPP" },
      ],
    },
    {
      name: "ui/checkout", total: 126, skipped: 1, duration: 101,
      cases: [
        { name: "cart.spec.tsx › recalculates tax on address change", duration: "0.92 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "cart.spec.tsx › restores an abandoned cart", duration: "0.77 s", history: "PPPPPPFPPPPPP-PPPPPP",
          detail: {
            assertion: "expected cart.items.length 3, received 0", retries: "1 of 2 failed",
            diff: "- expected\n+ received\n\n- items.length: 3\n+ items.length: 0\n- restoredFrom: \"snapshot_88a1\"\n+ restoredFrom: undefined",
            stack: "at Object.<anonymous> (tests/ui/checkout/cart.spec.tsx:204:31)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)",
          } },
      ],
    },
    {
      name: "ui/components", total: 87, skipped: 2, duration: 24.7,
      cases: [
        { name: "button.spec.tsx › forwards a ref", duration: "0.06 s", history: "PPPPPPPPPPPPP-PPPPPP" },
        { name: "modal.spec.tsx › traps focus", duration: "0.14 s", history: "PPPPPPPPPPPPP-PPPPPP" },
      ],
    },
  ];

  // Tests the team has tagged flaky. Their flip rate and verdict strip come
  // from the case history above, so the table can't disagree with the tree.
  const flaky = [
    { suite: "workers/ingest", test: "batch.spec.ts › drains the queue under backpressure", owner: "l.moreau" },
    { suite: "auth",           test: "login.spec.ts › locks after 5 attempts",               owner: "r.okafor" },
    { suite: "api/ledger",     test: "close.spec.ts › closes a period exactly once",          owner: "s.iyer" },
    { suite: "ui/checkout",    test: "cart.spec.tsx › restores an abandoned cart",            owner: "j.tanaka" },
  ];

  // `prefix` is the start of the rule ids a set owns; `count` is rules in the set.
  const rulesets = [
    { name: "correctness",  prefix: "correctness/", count: 14, enabled: true },
    { name: "security",     prefix: "sec/",         count: 6,  enabled: true },
    { name: "performance",  prefix: "perf/",        count: 9,  enabled: true },
    { name: "style",        prefix: "style/",       count: 41, enabled: true },
    { name: "accessibility",prefix: "a11y/",        count: 12, enabled: false },
  ];

  // `snippet` is three lines of the file starting one line above `line`.
  const findings = [
    { sev: "blocker", rule: "sec/no-hardcoded-secret", msg: "API key committed in source", file: "workers/ingest/client.ts", line: 22,
      snippet: ["const client = new IngestClient({", "  apiKey: \"ik_live_4f9c2a7e1b0d\",", "  region: env.REGION,"] },
    { sev: "blocker", rule: "sec/sql-injection", msg: "Query built by string concatenation", file: "api/ledger/report.ts", line: 118,
      snippet: ["const where = req.query.period;", "const rows = await db.query(\"SELECT * FROM entries WHERE period = '\" + where + \"'\");", "return rows.map(toReportLine);"] },
    { sev: "blocker", rule: "sec/open-redirect", msg: "Redirect target taken from the query string unchecked", file: "auth/login.ts", line: 73,
      snippet: ["const next = url.searchParams.get(\"next\") ?? \"/\";", "return Response.redirect(next, 302);", "}"] },
    { sev: "blocker", rule: "correctness/await-missing", msg: "Promise not awaited; errors are swallowed", file: "api/payments/charge.ts", line: 64,
      snippet: ["if (charge.status === \"captured\") {", "  ledger.post(charge);", "}"] },
    { sev: "major", rule: "correctness/no-floating-null", msg: "Possible null dereference on `session`", file: "auth/refresh.ts", line: 41,
      snippet: ["const session = await store.get(token.sid);", "if (session.expiresAt < now()) {", "  throw new ExpiredError();"] },
    { sev: "major", rule: "correctness/unhandled-rejection", msg: "Promise rejection has no handler", file: "workers/ingest/queue.ts", line: 140,
      snippet: ["for (const msg of batch) {", "  handle(msg).then(ack);", "}"] },
    { sev: "major", rule: "perf/n-plus-one", msg: "Query executed inside a loop", file: "api/ledger/posting.ts", line: 87,
      snippet: ["for (const line of entry.lines) {", "  const acct = await db.accounts.findById(line.accountId);", "  totals[acct.kind] += line.amount;"] },
    { sev: "major", rule: "perf/sync-fs-in-request", msg: "Synchronous file read on the request path", file: "api/payments/webhook.ts", line: 31,
      snippet: ["export async function verify(req) {", "  const secret = fs.readFileSync(SECRET_PATH, \"utf8\");", "  const sig = req.headers.get(\"x-signature\");"] },
    { sev: "major", rule: "correctness/exhaustive-deps", msg: "Effect is missing a dependency", file: "ui/checkout/Cart.tsx", line: 132,
      snippet: ["useEffect(() => {", "  recalculate(cart, address);", "}, [cart]);"] },
    { sev: "major", rule: "sec/weak-hash", msg: "MD5 used for a security purpose", file: "auth/legacy.ts", line: 19,
      snippet: ["export function legacyToken(userId) {", "  return createHash(\"md5\").update(userId + SALT).digest(\"hex\");", "}"] },
    { sev: "major", rule: "sec/insecure-cookie", msg: "Session cookie set without the Secure flag", file: "auth/session.ts", line: 58,
      snippet: ["res.cookie(\"sid\", session.id, {", "  httpOnly: true, sameSite: \"lax\",", "});"] },
    { sev: "major", rule: "a11y/label-required", msg: "Form control has no label", file: "ui/checkout/AddressForm.tsx", line: 44,
      snippet: ["<div className=\"field\">", "  <input name=\"postcode\" value={postcode} onChange={onPostcode} />", "</div>"] },
    { sev: "major", rule: "a11y/click-handler-on-div", msg: "Click handler on a non-interactive element", file: "ui/components/Card.tsx", line: 18,
      snippet: ["return (", "  <div className=\"card\" onClick={onOpen}>", "    {children}"] },
    { sev: "minor", rule: "style/max-complexity", msg: "Function complexity 24 exceeds 15", file: "workers/ingest/batch.ts", line: 8,
      snippet: ["", "export async function drain(queue, opts = {}) {", "  let attempts = 0, depth = queue.depth();"] },
    { sev: "minor", rule: "style/max-lines", msg: "File has 412 lines, limit is 400", file: "api/ledger/report.ts", line: 1,
      snippet: ["", "import { db } from \"../db\";", "import { toReportLine } from \"./lines\";"] },
    { sev: "minor", rule: "style/no-console", msg: "Unexpected console statement", file: "api/payments/webhook.ts", line: 55,
      snippet: ["if (!valid) {", "  console.log(\"bad signature\", sig);", "  return new Response(null, { status: 400 });"] },
    { sev: "minor", rule: "style/prefer-const", msg: "`total` is never reassigned", file: "ui/checkout/tax.ts", line: 12,
      snippet: ["export function taxFor(items, rate) {", "  let total = items.reduce((n, i) => n + i.price * i.qty, 0);", "  return round2(total * rate);"] },
    { sev: "minor", rule: "style/no-nested-ternary", msg: "Nested ternary", file: "ui/checkout/tax.ts", line: 27,
      snippet: ["const band =", "  rate > 0.2 ? \"high\" : rate > 0.1 ? \"standard\" : \"reduced\";", "return band;"] },
    { sev: "minor", rule: "perf/array-includes-in-loop", msg: "includes() inside a loop over the same array", file: "workers/ingest/dedupe.ts", line: 19,
      snippet: ["for (const id of ids) {", "  if (seen.includes(id)) continue;", "  seen.push(id);"] },
    { sev: "minor", rule: "style/no-unused-vars", msg: "`legacyMode` is declared but never used", file: "api/config.ts", line: 7,
      snippet: ["export const region = env.REGION ?? \"eu-west-1\";", "export const legacyMode = env.LEGACY === \"1\";", "export const batchSize = Number(env.BATCH_SIZE ?? 500);"] },
    { sev: "minor", rule: "a11y/alt-text", msg: "Image has no alt text", file: "ui/checkout/Summary.tsx", line: 72,
      snippet: ["<li key={item.id}>", "  <img src={item.thumb} width=\"40\" height=\"40\" />", "  <span>{item.name}</span>"] },
  ];

  // One row per analysed file worth plotting. The scatter is x = complexity,
  // y = coverage; the hotspot list is the same rows ranked by churn × complexity.
  const files = [
    { file: "workers/ingest/batch.ts",      churn: 46, complexity: 24, coverage: 61 },
    { file: "api/ledger/posting.ts",        churn: 38, complexity: 19, coverage: 72 },
    { file: "auth/refresh.ts",              churn: 31, complexity: 16, coverage: 68 },
    { file: "api/payments/charge.ts",       churn: 27, complexity: 14, coverage: 88 },
    { file: "ui/checkout/Cart.tsx",         churn: 22, complexity: 12, coverage: 79 },
    { file: "api/payments/refund.ts",       churn: 14, complexity: 11, coverage: 91 },
    { file: "auth/session.ts",              churn: 18, complexity: 9,  coverage: 84 },
    { file: "ui/components/Modal.tsx",      churn: 7,  complexity: 8,  coverage: 93 },
    { file: "workers/ingest/dedupe.ts",     churn: 11, complexity: 7,  coverage: 76 },
    { file: "api/payments/webhook.ts",      churn: 9,  complexity: 6,  coverage: 97 },
    { file: "ui/checkout/tax.ts",           churn: 12, complexity: 5,  coverage: 89 },
    { file: "api/config.ts",                churn: 9,  complexity: 4,  coverage: 95 },
    { file: "api/ledger/report.ts",         churn: 29, complexity: 21, coverage: 44 },
    { file: "workers/ingest/queue.ts",      churn: 33, complexity: 18, coverage: 52 },
    { file: "auth/login.ts",                churn: 26, complexity: 15, coverage: 58 },
    { file: "ui/components/Button.tsx",     churn: 4,  complexity: 3,  coverage: 99 },
    { file: "workers/ingest/parse.ts",      churn: 24, complexity: 13, coverage: 66 },
    { file: "auth/mfa.ts",                  churn: 8,  complexity: 10, coverage: 81 },
    { file: "auth/legacy.ts",               churn: 6,  complexity: 22, coverage: 55 },
    { file: "ui/checkout/AddressForm.tsx",  churn: 15, complexity: 6,  coverage: 70 },
  ];

  const scan = { files: 412, lines: 38204, took: "6.2 s", sha: "a4f19c2", debt: "4.1%", debtTime: "est. 3d 2h",
    duplication: "2.8%", duplicatedLines: 1069, maintainability: "B", previousGrade: "A" };

  return { now, runs, stageNames, runner, suites, flaky, rulesets, findings, files, scan };
})();
