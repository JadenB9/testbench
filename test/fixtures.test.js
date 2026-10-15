// Checks that the fixtures agree with each other, since every panel on the
// page is derived from them. Run with `node --test`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js/fixtures.js"), "utf8"), { window });
const F = window.FIXTURES;

const TOTAL = F.suites.reduce((n, s) => n + s.total, 0);
const CANCELLED = F.runs.map((r) => r.status === "cancelled");

test("runs are oldest to newest with consecutive ids", () => {
  F.runs.forEach((r, i) => {
    if (i) assert.equal(r.id, F.runs[i - 1].id + 1, `run #${r.id} follows #${F.runs[i - 1].id}`);
    if (i) assert.ok(r.startedAt > F.runs[i - 1].startedAt, `run #${r.id} starts after #${F.runs[i - 1].id}`);
  });
  assert.ok(F.runs[F.runs.length - 1].startedAt <= F.now, "the newest run started before the demo clock");
});

test("every run's counts add up to the suite total", () => {
  for (const r of F.runs) {
    assert.equal(r.passed + r.failed + r.skipped, TOTAL, `run #${r.id} totals`);
    assert.equal(r.stages.length, F.stageNames.length, `run #${r.id} has one time per stage`);
    if (r.status === "failed") {
      const by = Object.values(r.failedBy || {}).reduce((n, v) => n + v, 0);
      assert.equal(by, r.failed, `run #${r.id} failedBy adds up to failed`);
      assert.ok(r.failed > 0);
    } else {
      assert.equal(r.failed, 0, `run #${r.id} is ${r.status} so nothing failed`);
      assert.equal(r.failedBy, undefined);
    }
    if (r.status === "cancelled") assert.equal(r.coverage, null);
    else assert.equal(typeof r.coverage, "number");
  }
});

test("failedBy only names suites that exist", () => {
  const names = new Set(F.suites.map((s) => s.name));
  for (const r of F.runs) for (const name of Object.keys(r.failedBy || {})) assert.ok(names.has(name), `${name} in run #${r.id}`);
});

test("case histories line up with the runs", () => {
  for (const s of F.suites) {
    assert.ok(s.cases.length <= s.total, `${s.name} lists no more cases than it has`);
    for (const c of s.cases) {
      assert.equal(c.history.length, F.runs.length, `${c.name} has one verdict per run`);
      assert.match(c.history, /^[PFS-]+$/, `${c.name} only uses P F S -`);
      [...c.history].forEach((ch, i) => {
        assert.equal(ch === "-", CANCELLED[i], `${c.name} did not run exactly when run #${F.runs[i].id} was cancelled`);
      });
      if (c.history.includes("F")) assert.ok(c.detail, `${c.name} fails somewhere so it needs a detail`);
    }
  }
});

test("listed failures never exceed the run's failedBy for the suite", () => {
  F.runs.forEach((r, i) => {
    for (const s of F.suites) {
      const listed = s.cases.filter((c) => c.history[i] === "F").length;
      const allowed = (r.failedBy || {})[s.name] || 0;
      assert.ok(listed <= allowed, `run #${r.id} ${s.name}: ${listed} listed failures, failedBy says ${allowed}`);
    }
  });
});

test("skips come from the listed skipped cases plus drift on the largest suite", () => {
  const base = F.suites.reduce((n, s) => n + s.skipped, 0);
  for (const s of F.suites) {
    const listedSkips = s.cases.filter((c) => c.history[0] === "S").length;
    assert.ok(listedSkips <= s.skipped, `${s.name} lists at most its skipped count`);
  }
  for (const r of F.runs) {
    if (r.status === "cancelled") continue;
    assert.ok(Math.abs(r.skipped - base) <= 6, `run #${r.id} skip drift is small enough to land on one suite`);
  }
});

test("flaky entries point at real cases that actually flip", () => {
  for (const f of F.flaky) {
    const suite = F.suites.find((s) => s.name === f.suite);
    assert.ok(suite, `${f.suite} exists`);
    const c = suite.cases.find((x) => x.name === f.test);
    assert.ok(c, `${f.test} is listed under ${f.suite}`);
    let flips = 0;
    for (let i = 1; i < c.history.length; i++) {
      if (c.history[i] !== "-" && c.history[i - 1] !== "-" && c.history[i] !== c.history[i - 1]) flips++;
    }
    assert.ok(flips >= 2, `${f.test} flips at least twice`);
  }
});

test("every finding belongs to a rule set and has a three-line snippet", () => {
  for (const f of F.findings) {
    assert.ok(F.rulesets.some((rs) => f.rule.startsWith(rs.prefix)), `${f.rule} has a rule set`);
    assert.ok(["blocker", "major", "minor"].includes(f.sev));
    assert.equal(f.snippet.length, 3, `${f.rule} at ${f.file}:${f.line}`);
    assert.ok(f.line >= 1);
  }
  for (const rs of F.rulesets) {
    const n = F.findings.filter((f) => f.rule.startsWith(rs.prefix)).length;
    assert.ok(n <= rs.count, `${rs.name} has at most as many findings as rules`);
  }
});

test("analysed files are unique and plottable", () => {
  const names = F.files.map((f) => f.file);
  assert.equal(new Set(names).size, names.length, "no duplicate files");
  for (const f of F.files) {
    assert.ok(f.coverage >= 0 && f.coverage <= 100, f.file);
    assert.ok(f.complexity > 0 && f.churn >= 0, f.file);
  }
});
