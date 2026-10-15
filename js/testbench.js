/* testbench — rendering and interaction.
   Everything on the page is derived from window.FIXTURES; swap that for a
   fetch() against a real runner and the views keep working. */
(() => {
  "use strict";

  const F = window.FIXTURES;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const NEWEST = F.runs[F.runs.length - 1];
  let currentRun = NEWEST;
  let activeTab = "runs";
  let runFilter = "all";     // all | failed | main
  let runQuery = "";
  let suiteFilter = "all";   // all | failed | slow
  let sevFilter = "all";     // all | blocker | major | minor
  let findingQuery = "";
  let openFinding = -1;      // index into F.findings whose snippet is expanded
  let selectedCase = null;   // { suite, case } shown in the failure panel
  let toastTimer = null;

  /* ── theme ──────────────────────────────────────────────────── */
  // Same contract as the rest of j4den.com: data-theme="light" on <html>
  // for light, no attribute for dark, the choice saved as localStorage.theme.
  // The inline script in <head> already applied it before paint.
  const THEME_COLOR = { dark: "#121215", light: "#fbfbf9" };

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(name) {
    if (name === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = THEME_COLOR[name]; });
    const b = $("theme-toggle");
    b.setAttribute("aria-label", name === "light" ? "Switch to dark theme" : "Switch to light theme");
    b.title = b.getAttribute("aria-label");
  }

  function toggleTheme() {
    const next = currentTheme() === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
  }

  function initTheme() {
    applyTheme(currentTheme());
    $("theme-toggle").addEventListener("click", toggleTheme);
    // with nothing saved, keep following the device if it changes
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");
    if (mq && mq.addEventListener) {
      mq.addEventListener("change", (e) => {
        let saved = null;
        try { saved = localStorage.getItem("theme"); } catch (err) { /* ignore */ }
        if (!saved) applyTheme(e.matches ? "light" : "dark");
      });
    }
  }

  /* ── small helpers ──────────────────────────────────────────── */
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-shown"), 2600);
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Relative times are measured from the fixture clock, not Date.now(), so
  // the demo reads the same on any day.
  const NOW = Date.parse(F.now);
  function ago(iso) {
    const mins = Math.round((NOW - Date.parse(iso)) / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    const days = Math.round(hrs / 24);
    return days === 1 ? "yesterday" : `${days} days ago`;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(ms) {
    const d = new Date(ms);
    const two = (n) => String(n).padStart(2, "0");
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
  }

  function fmtSecs(secs) {
    if (secs < 60) return `${Number.isInteger(secs) ? secs : secs.toFixed(1)} s`;
    const m = Math.floor(secs / 60);
    return `${m}m ${String(Math.round(secs - m * 60)).padStart(2, "0")}s`;
  }

  const durationOf = (run) => run.stages.reduce((n, s) => n + s, 0);
  const runIndex = (run) => F.runs.indexOf(run);
  const parseCaseDuration = (d) => (/([\d.]+)\s*s/.test(d) ? Number(RegExp.$1) : 0);

  const VERDICT = { P: "passed", F: "failed", S: "skipped", "-": "not run" };
  const TRIGGER = {
    push: (r) => `push to ${r.branch}`,
    pull_request: (r) => `pull request #${r.pr}`,
    schedule: () => "nightly schedule",
    manual: (r) => `started by ${r.author}`,
  };

  // A verdict strip: one tick per run, oldest first. The big version carries
  // a title per tick so hovering says which run it was.
  function strip(hist, cur, big) {
    const cls = { P: "h-p", F: "h-f", S: "h-s", "-": "h-x" };
    const fails = [...hist].filter((ch) => ch === "F").length;
    const ticks = [...hist].map((ch, i) => {
      const t = big ? ` title="#${F.runs[i].id} ${VERDICT[ch]}"` : "";
      return `<i class="${cls[ch]}${i === cur ? " is-now" : ""}"${t}></i>`;
    }).join("");
    return `<span class="hist${big ? " hist-big" : ""}" role="img" aria-label="last ${hist.length} runs: ${fails} failed">${ticks}</span>`;
  }

  function flipsOf(hist) {
    let flips = 0, pairs = 0;
    for (let i = 1; i < hist.length; i++) {
      if (hist[i] === "-" || hist[i - 1] === "-") continue;
      pairs++;
      if (hist[i] !== hist[i - 1]) flips++;
    }
    return { flips, pairs };
  }

  // Tiny line for a metric card, stretched to the card's width. The stroke
  // is non-scaling so the stretch doesn't fatten it, and the current run is
  // a vertical tick rather than a dot (a dot would stretch with it).
  function spark(values, cur) {
    const W = 100, H = 22, pad = 2;
    const nums = values.filter((v) => v != null);
    if (!nums.length) return "";
    const min = Math.min(...nums), max = Math.max(...nums);
    const x = (i) => pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = (v) => (max === min ? H / 2 : pad + (1 - (v - min) / (max - min)) * (H - pad * 2));
    let d = "", pen = false;
    values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    const tick = `<line class="spark-now" x1="${x(cur).toFixed(1)}" x2="${x(cur).toFixed(1)}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
      `${tick}<path d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ── url state ──────────────────────────────────────────────── */
  // Everything you can click into is in the query string, so a link to a
  // failing run opens on that run. Defaults are left out to keep it short.
  function readState() {
    const p = new URLSearchParams(location.search);
    activeTab = p.get("tab") === "quality" || location.hash === "#quality" ? "quality" : "runs";
    currentRun = F.runs.find((r) => String(r.id) === p.get("run")) || NEWEST;
    runFilter = ["failed", "main"].includes(p.get("runs")) ? p.get("runs") : "all";
    runQuery = p.get("q") || "";
    suiteFilter = ["failed", "slow"].includes(p.get("suites")) ? p.get("suites") : "all";
    sevFilter = ["blocker", "major", "minor"].includes(p.get("sev")) ? p.get("sev") : "all";
    findingQuery = p.get("find") || "";
    selectedCase = firstFailure(currentRun);
    const c = /^(.+):(\d+)$/.exec(p.get("case") || "");
    if (c) {
      const suite = F.suites.find((s) => s.name === c[1]);
      const cs = suite && suite.cases[Number(c[2])];
      if (cs) selectedCase = { suite: suite.name, case: withStatus(cs, currentRun) };
    }
    return p.get("details") === "1";
  }

  function writeState() {
    const p = new URLSearchParams();
    if (activeTab !== "runs") p.set("tab", activeTab);
    if (currentRun !== NEWEST) p.set("run", currentRun.id);
    if (runFilter !== "all") p.set("runs", runFilter);
    if (runQuery) p.set("q", runQuery);
    if (suiteFilter !== "all") p.set("suites", suiteFilter);
    const first = firstFailure(currentRun);
    if (selectedCase && !(first && first.case.name === selectedCase.case.name && first.suite === selectedCase.suite)) {
      const suite = F.suites.find((s) => s.name === selectedCase.suite);
      p.set("case", `${suite.name}:${suite.cases.findIndex((c) => c.name === selectedCase.case.name)}`);
    }
    if (sevFilter !== "all") p.set("sev", sevFilter);
    if (findingQuery) p.set("find", findingQuery);
    if ($("drawer").open) p.set("details", "1");
    const qs = p.toString();
    window.history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  /* ── top-level tabs ─────────────────────────────────────────── */
  function showTab(name, focus) {
    activeTab = name;
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("is-active", p.dataset.pane === name));
    writeState();
  }

  function initTabs() {
    const tabs = [...document.querySelectorAll(".tab")];
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        showTab(tab.dataset.tab);
        window.scrollTo({ top: 0 });
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.click();
        next.focus();
      });
    });
  }

  /* ── per-run suite results ──────────────────────────────────── */
  // A case's verdict in a run is its history letter for that run. Suite
  // failure counts come from the run's `failedBy` (listed cases are a
  // sample), and any change in the skip count lands on the largest suite so
  // the suite totals always add up to the run's own numbers.
  function withStatus(c, run) {
    return { ...c, status: VERDICT[c.history[runIndex(run)]] };
  }

  function suitesFor(run) {
    const failedBy = run.failedBy || {};
    const baseSkipped = F.suites.reduce((n, s) => n + s.skipped, 0);
    const largest = F.suites.reduce((a, b) => (b.total > a.total ? b : a));
    return F.suites.map((s) => {
      const failed = failedBy[s.name] || 0;
      const skipped = s.skipped + (s === largest ? run.skipped - baseSkipped : 0);
      return {
        name: s.name, duration: s.duration, total: s.total,
        failed, skipped, passed: s.total - failed - skipped,
        cases: s.cases.map((c) => withStatus(c, run)),
      };
    });
  }

  function firstFailure(run) {
    for (const s of suitesFor(run)) {
      const c = s.cases.find((x) => x.status === "failed");
      if (c) return { suite: s.name, case: c };
    }
    return null;
  }

  function findCase(suiteName, caseName) {
    const s = F.suites.find((x) => x.name === suiteName);
    return s && s.cases.find((c) => c.name === caseName);
  }

  /* ── run list ───────────────────────────────────────────────── */
  function selectRun(run) {
    currentRun = run;
    selectedCase = firstFailure(run);
    renderRunsTab();
  }

  function renderRunsTab() {
    renderRuns();
    renderRunHeader();
    renderMetrics();
    renderChart();
    renderCoverage();
    renderTree();
    renderDetail();
    renderFlaky();
    if ($("drawer").open) renderDrawer();
    writeState();
  }

  function visibleRuns() {
    const q = runQuery.trim().toLowerCase();
    return F.runs.slice().reverse().filter((r) => {
      if (runFilter === "failed" && r.status !== "failed") return false;
      if (runFilter === "main" && r.branch !== "main") return false;
      if (!q) return true;
      return [`#${r.id}`, r.sha, r.branch, r.author, r.message, r.status].some((s) => s.toLowerCase().includes(q));
    });
  }

  function renderRuns() {
    const box = $("run-list");
    box.innerHTML = "";
    const list = visibleRuns();
    list.forEach((run) => {
      const active = run.id === currentRun.id;
      const b = el("button", "run-item" + (active ? " is-active" : ""));
      if (active) b.setAttribute("aria-current", "true");
      b.innerHTML =
        `<div class="ri-top"><span class="ri-id">#${run.id}</span>` +
        `<span class="ri-status st-${esc(run.status)}">${esc(run.status)}</span>` +
        `<span class="ri-when">${esc(ago(run.startedAt))}</span></div>` +
        `<div class="ri-msg">${esc(run.message)}</div>` +
        `<div class="ri-meta"><span>${esc(run.sha)}</span><span>${esc(run.branch)}</span><span>${esc(run.author)}</span></div>`;
      b.addEventListener("click", () => selectRun(run));
      box.appendChild(b);
    });
    if (!list.length) box.appendChild(el("div", "empty", "No runs match."));

    const failed = F.runs.filter((r) => r.status === "failed").length;
    $("run-count").textContent = list.length === F.runs.length
      ? `${F.runs.length} runs · ${failed} failed`
      : `${list.length} of ${F.runs.length} runs`;
  }

  function renderRunHeader() {
    const r = currentRun;
    $("run-title").textContent = `Run #${r.id}`;
    const v = $("run-verdict");
    v.textContent = r.status;
    v.dataset.status = r.status;
    $("run-msg").textContent = r.message;
    $("run-sub").innerHTML =
      `${esc(r.branch)} · <code>${esc(r.sha)}</code> · ${esc(r.author)} · ${esc(TRIGGER[r.trigger](r))} · ` +
      `${esc(ago(r.startedAt))} · took ${esc(fmtSecs(durationOf(r)))}`;
    // nothing to re-run on a green build
    $("btn-rerun").disabled = !r.failed;
  }

  function renderMetrics() {
    const r = currentRun;
    const i = runIndex(r);
    const total = r.passed + r.failed + r.skipped;
    const ran = r.passed + r.failed;
    const rate = ran ? ((r.passed / ran) * 100).toFixed(1) : "0.0";
    const prev = F.runs[i - 1];
    const covDelta =
      prev && prev.coverage != null && r.coverage != null
        ? (r.coverage - prev.coverage).toFixed(1)
        : null;
    const durations = F.runs.map((x) => (x.status === "cancelled" ? null : durationOf(x)));
    const coverages = F.runs.map((x) => x.coverage);
    const rates = F.runs.map((x) => (x.status === "cancelled" ? null : (x.passed / (x.passed + x.failed)) * 100));

    const cards = [
      r.status === "cancelled"
        ? { label: "pass rate", value: "—", cls: "", delta: `cancelled · ${total} total`, spark: spark(rates, i) }
        : { label: "pass rate", value: `${rate}%`, cls: r.failed ? "is-warn" : "is-pass",
            delta: `of ${ran} run · ${total} total`, spark: spark(rates, i) },
      { label: "passed", value: r.passed, cls: "is-pass", delta: "" },
      { label: "failed", value: r.failed, cls: r.failed ? "is-fail" : "", delta: r.failed ? "needs triage" : "none" },
      { label: "skipped", value: r.skipped, cls: "", delta: r.status === "cancelled" ? "never ran" : "" },
      { label: "duration", value: fmtSecs(durationOf(r)).replace(" ", ""), cls: "", delta: "wall clock", spark: spark(durations, i) },
      { label: "coverage", value: r.coverage != null ? `${r.coverage}%` : "—", cls: "",
        delta: covDelta != null ? `${covDelta >= 0 ? "+" : ""}${covDelta} pts` : "not collected",
        deltaCls: covDelta == null ? "" : covDelta >= 0 ? "up" : "down", spark: spark(coverages, i) },
    ];

    $("metrics").innerHTML = cards
      .map(
        (c) =>
          `<div class="metric"><div class="m-label">${c.label}</div>` +
          `<div class="m-value ${c.cls || ""}">${esc(c.value)}</div>` +
          `<div class="m-delta ${c.deltaCls || ""}">${esc(c.delta)}</div>${c.spark || ""}</div>`
      )
      .join("");
  }

  /* ── results chart ──────────────────────────────────────────── */
  function renderChart() {
    const box = $("chart");
    box.innerHTML = "";
    const max = Math.max(...F.runs.map((r) => r.passed + r.failed + r.skipped));
    F.runs.forEach((run) => {
      const col = el("button", "bar-col" + (run === currentRun ? " is-current" : ""));
      const total = run.passed + run.failed + run.skipped;
      const label = `Run #${run.id}: ${run.passed} passed · ${run.failed} failed · ${run.skipped} skipped`;
      col.title = label;
      col.setAttribute("aria-label", label);
      col.addEventListener("click", () => selectRun(run));
      [["skip", run.skipped], ["fail", run.failed], ["pass", run.passed]].forEach(([k, v]) => {
        if (!v) return;
        const seg = el("div", `bar-seg bar-${k}`);
        seg.style.height = `${(v / max) * 100}%`;
        col.appendChild(seg);
      });
      col.style.minHeight = `${(total / max) * 100}%`;
      box.appendChild(col);
    });
  }

  /* ── coverage trend ─────────────────────────────────────────── */
  // Sized to the card at render time (and again on resize) so the labels
  // stay 10px instead of scaling with a viewBox.
  function renderCoverage() {
    const box = $("coverage");
    const W = Math.max(240, box.clientWidth || 600), H = 150, L = 38, R = 12, T = 10, B = 22;
    const vals = F.runs.map((r) => r.coverage);
    const nums = vals.filter((v) => v != null);
    const min = Math.floor(Math.min(...nums)) - 0.5;
    const max = Math.ceil(Math.max(...nums)) + 0.5;
    const x = (i) => L + (i / (vals.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);

    let grid = "";
    for (let g = Math.ceil(min); g <= Math.floor(max); g++) {
      grid += `<line class="cov-grid" x1="${L}" x2="${W - R}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/>` +
        `<text class="cov-label" x="${L - 7}" y="${(y(g) + 3.5).toFixed(1)}" text-anchor="end">${g}%</text>`;
    }
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    const dots = F.runs.map((r, i) =>
      r.coverage == null
        ? `<line class="cov-gap" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}"><title>#${r.id} cancelled, no coverage</title></line>`
        : `<circle class="cov-dot${r === currentRun ? " is-current" : ""}" cx="${x(i).toFixed(1)}" cy="${y(r.coverage).toFixed(1)}" r="3.5" data-run="${r.id}"><title>#${r.id} · ${r.coverage}%</title></circle>`
    ).join("");
    const first = nums[0], last = nums[nums.length - 1];
    box.innerHTML =
      `<svg class="cov" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" ` +
      `aria-label="coverage went from ${first}% to ${last}% over the last ${F.runs.length} runs">` +
      `${grid}<path class="cov-line" d="${d}"/>${dots}` +
      `<text class="cov-label" x="${L}" y="${H - 6}">#${F.runs[0].id}</text>` +
      `<text class="cov-label" x="${W - R}" y="${H - 6}" text-anchor="end">#${NEWEST.id}</text></svg>`;
    $("coverage-note").textContent = `${first}% → ${last}% · ${(last - first >= 0 ? "+" : "")}${(last - first).toFixed(1)} pts`;
  }

  /* ── suite tree ─────────────────────────────────────────────── */
  function visibleSuites(list) {
    if (suiteFilter === "failed") return list.filter((s) => s.failed > 0);
    if (suiteFilter === "slow") return list.slice().sort((a, b) => b.duration - a.duration).slice(0, 3);
    return list;
  }

  function renderTree() {
    const box = $("tree");
    box.innerHTML = "";
    const r = currentRun;
    const i = runIndex(r);

    if (r.status === "cancelled") {
      $("suite-note").textContent = "";
      box.innerHTML =
        `<div class="empty">Run #${r.id} was cancelled after ${esc(fmtSecs(durationOf(r)))}. ` +
        `${r.passed} tests passed before it stopped; ${r.skipped} never ran.</div>`;
      return;
    }

    const all = suitesFor(r);
    const failing = all.filter((s) => s.failed).length;
    $("suite-note").textContent = failing ? `· ${failing} failing` : "· all green";
    const list = visibleSuites(all);

    if (!list.length) {
      box.innerHTML = '<div class="empty">No suites match this filter.</div>';
      return;
    }

    list.forEach((suite) => {
      const open = selectedCase && selectedCase.suite === suite.name;
      const wrap = el("div", "tree-suite" + (open ? " is-open" : ""));

      const row = el("button", "suite-row");
      row.setAttribute("aria-expanded", String(open));
      row.innerHTML =
        `<span class="caret" aria-hidden="true">›</span><span class="suite-name">${esc(suite.name)}</span>` +
        `<span class="suite-counts">` +
        `<span class="sc-pass" title="passed">${suite.passed}✓</span>` +
        (suite.failed ? `<span class="sc-fail" title="failed">${suite.failed}✗</span>` : "") +
        (suite.skipped ? `<span class="sc-skip" title="skipped">${suite.skipped}−</span>` : "") +
        `</span><span class="suite-dur">${esc(fmtSecs(suite.duration))}</span>`;
      row.addEventListener("click", () => {
        const now = wrap.classList.toggle("is-open");
        row.setAttribute("aria-expanded", String(now));
      });
      wrap.appendChild(row);

      const cases = el("div", "case-list");
      suite.cases.forEach((c) => {
        const picked = selectedCase && selectedCase.suite === suite.name && selectedCase.case.name === c.name;
        const cr = el("button", "case-row" + (c.status === "failed" ? " is-failed" : "") + (picked ? " is-picked" : ""));
        cr.innerHTML =
          `<span class="case-dot cd-${esc(c.status.replace(" ", "-"))}" aria-hidden="true"></span>` +
          `<span class="case-name">${esc(c.name)}</span>` +
          strip(c.history, i, false) +
          `<span class="case-dur">${esc(c.duration)}</span>`;
        cr.setAttribute("aria-label", `${c.name}, ${c.status}`);
        cr.addEventListener("click", () => {
          selectedCase = { suite: suite.name, case: c };
          renderTree();
          renderDetail();
          writeState();
        });
        cases.appendChild(cr);
      });
      const hidden = suite.total - suite.cases.length;
      if (hidden > 0) cases.appendChild(el("div", "case-more", `+ ${hidden} more tests not listed in the fixtures`));
      wrap.appendChild(cases);
      box.appendChild(wrap);
    });
  }

  /* ── failure detail ─────────────────────────────────────────── */
  function historyLine(c, i) {
    const fails = [...c.history].filter((ch) => ch === "F").length;
    const ran = [...c.history].filter((ch) => ch === "P" || ch === "F").length;
    const firstFail = c.history.indexOf("F");
    const { flips, pairs } = flipsOf(c.history);
    const flaky = F.flaky.some((f) => f.test === c.name);
    const words = fails
      ? `failed ${fails} of the last ${ran} runs · first seen #${F.runs[firstFail].id}` +
        (flaky ? ` · tagged flaky, flips ${Math.round((flips / pairs) * 100)}%` : "")
      : `passed every run it ran in`;
    return `<div class="fail-hist">${strip(c.history, i, true)}<span class="dim">${esc(words)}</span></div>`;
  }

  function renderDetail() {
    const body = $("detail-body");
    const r = currentRun;
    const i = runIndex(r);
    if (!selectedCase) {
      $("detail-case").textContent = "";
      body.innerHTML = r.status === "cancelled"
        ? `<div class="empty">Cancelled runs don't produce failure detail.</div>`
        : `<div class="empty">No failures in run #${r.id}. Pick a run marked failed, or any test in the tree, to see its history.</div>`;
      return;
    }
    const { suite, case: c } = selectedCase;
    const file = c.name.split(" › ")[0];
    $("detail-case").textContent = `${suite}/${file}`;
    if (c.status !== "failed" || !c.detail) {
      body.innerHTML =
        `<div class="fail-meta"><div><span class="k">test</span><span class="v">${esc(c.name)}</span></div>` +
        `<div><span class="k">result</span><span class="v">${esc(c.status)}</span></div>` +
        `<div><span class="k">duration</span><span class="v">${esc(c.duration)}</span></div></div>` +
        historyLine(c, i) +
        `<div class="empty">Nothing to show: this test ${c.status === "skipped" ? "was skipped" : "passed"} in run #${r.id}.</div>`;
      return;
    }
    const d = c.detail;
    body.innerHTML =
      `<div class="fail-meta">` +
      `<div><span class="k">assertion</span><span class="v">${esc(d.assertion)}</span></div>` +
      `<div><span class="k">duration</span><span class="v">${esc(c.duration)}</span></div>` +
      `<div><span class="k">retries</span><span class="v">${esc(d.retries)}</span></div>` +
      `<div><span class="k">first seen</span><span class="v">run #${F.runs[c.history.indexOf("F")].id}</span></div>` +
      `</div>` +
      historyLine(c, i) +
      `<div class="code-block"><div class="cb-head">expected / received</div><pre>${diffHTML(d.diff)}</pre></div>` +
      `<div class="code-block"><div class="cb-head">stack trace</div><pre>${esc(d.stack)}</pre></div>`;
  }

  function diffHTML(text) {
    return text.split("\n").map((line) => {
      const cls = line.startsWith("- ") ? "d-del" : line.startsWith("+ ") ? "d-add" : "";
      return cls ? `<span class="${cls}">${esc(line)}</span>` : esc(line);
    }).join("\n");
  }

  /* ── flaky tests ────────────────────────────────────────────── */
  function renderFlaky() {
    const i = runIndex(currentRun);
    const rows = F.flaky
      .map((f) => ({ ...f, case: findCase(f.suite, f.test) }))
      .map((f) => ({ ...f, rate: (({ flips, pairs }) => flips / pairs)(flipsOf(f.case.history)) }))
      .sort((a, b) => b.rate - a.rate);
    $("flaky-body").innerHTML = rows
      .map(
        (f) =>
          `<tr><td>${esc(f.test.split(" › ")[1])}</td><td class="file">${esc(f.suite)}</td>` +
          `<td class="num">${(f.rate * 100).toFixed(0)}%</td>` +
          `<td class="num">${strip(f.case.history, i, true)}</td>` +
          `<td class="file">${esc(f.owner)}</td></tr>`
      )
      .join("");
  }

  /* ── run details drawer ─────────────────────────────────────── */
  function openDrawer() {
    const d = $("drawer");
    if (d.open) return;
    renderDrawer();
    d.showModal();
    writeState();
  }

  function renderDrawer() {
    const r = currentRun;
    const i = runIndex(r);
    const prev = F.runs[i - 1];
    const dur = durationOf(r);
    const start = Date.parse(r.startedAt);
    $("drawer-title").textContent = `Run #${r.id}`;

    const stages = r.stages.map((s, k) =>
      `<span class="stage stage-${F.stageNames[k]}" style="flex-grow:${s || 0.001}" title="${F.stageNames[k]} ${fmtSecs(s)}"></span>`).join("");
    const stageList = r.stages.map((s, k) =>
      `<div><span class="k"><i class="stage-key stage-${F.stageNames[k]}"></i>${F.stageNames[k]}</span>` +
      `<span class="v">${s ? fmtSecs(s) : (r.status === "cancelled" ? "did not run" : "0 s")}</span></div>`).join("");

    let changes = "";
    if (prev) {
      const delta = (k) => { const n = r[k] - prev[k]; return `${n >= 0 ? "+" : ""}${n}`; };
      const cov = r.coverage != null && prev.coverage != null ? `${(r.coverage - prev.coverage) >= 0 ? "+" : ""}${(r.coverage - prev.coverage).toFixed(1)} pts` : "—";
      const moved = [];
      F.suites.forEach((s) => s.cases.forEach((c) => {
        const a = c.history[i - 1], b = c.history[i];
        if (a !== b && a !== "-" && b !== "-") moved.push(`<div><span class="k">${esc(s.name)}</span><span class="v">${esc(c.name)} <b class="chg chg-${VERDICT[b]}">${VERDICT[a]} → ${VERDICT[b]}</b></span></div>`);
      }));
      changes =
        `<h3>Since #${prev.id}</h3>` +
        `<div class="fail-meta drawer-grid">` +
        `<div><span class="k">passed</span><span class="v">${delta("passed")}</span></div>` +
        `<div><span class="k">failed</span><span class="v">${delta("failed")}</span></div>` +
        `<div><span class="k">skipped</span><span class="v">${delta("skipped")}</span></div>` +
        `<div><span class="k">coverage</span><span class="v">${cov}</span></div></div>` +
        (moved.length
          ? `<div class="changed">${moved.join("")}</div>`
          : `<div class="empty">No listed test changed verdict between #${prev.id} and #${r.id}.</div>`);
    }

    $("drawer-body").innerHTML =
      `<p class="drawer-msg">${esc(r.message)}</p>` +
      `<div class="fail-meta drawer-grid">` +
      `<div><span class="k">commit</span><span class="v"><code>${esc(r.sha)}</code> on ${esc(r.branch)}</span></div>` +
      `<div><span class="k">author</span><span class="v">${esc(r.author)}</span></div>` +
      `<div><span class="k">trigger</span><span class="v">${esc(TRIGGER[r.trigger](r))}</span></div>` +
      `<div><span class="k">result</span><span class="v">${esc(r.status)}</span></div>` +
      `<div><span class="k">started</span><span class="v">${esc(fmtDate(start))}</span></div>` +
      `<div><span class="k">finished</span><span class="v">${esc(fmtDate(start + dur * 1000))}</span></div>` +
      `<div><span class="k">runner</span><span class="v">${esc(F.runner)}</span></div>` +
      `<div><span class="k">coverage</span><span class="v">${r.coverage != null ? r.coverage + "%" : "not collected"}</span></div>` +
      `</div>` +
      `<h3>Stages <span class="dim">${esc(fmtSecs(dur))} total</span></h3>` +
      `<div class="stages" role="img" aria-label="${r.stages.map((s, k) => `${F.stageNames[k]} ${fmtSecs(s)}`).join(", ")}">${stages}</div>` +
      `<div class="fail-meta drawer-grid">${stageList}</div>` +
      changes +
      `<h3>Artifacts</h3>` +
      `<div class="artifacts">` +
      `<button class="btn" id="art-log">run-${r.id}.log</button>` +
      `<button class="btn" id="art-junit">junit-${r.id}.xml</button>` +
      `<button class="btn" data-demo="Coverage reports aren't in the demo fixtures.">coverage/index.html</button>` +
      `</div>`;

    $("art-log").addEventListener("click", () => {
      download(`run-${r.id}.log`, runLog(r), "text/plain");
      toast(`Downloaded run-${r.id}.log (built from fixtures)`);
    });
    $("art-junit").addEventListener("click", () => {
      download(`junit-${r.id}.xml`, junitXML(r), "application/xml");
      toast(`Downloaded junit-${r.id}.xml (built from fixtures)`);
    });
    $("drawer-body").querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.demo)));
  }

  function runLog(run) {
    const lines = [
      "# testbench demo: generated from fixture data, no real runner involved",
      `run #${run.id}  ${run.status}  ${run.branch}@${run.sha}  by ${run.author}  (${fmtSecs(durationOf(run))})`,
      `# ${run.message}`,
      "",
    ];
    run.stages.forEach((s, k) => lines.push(`stage ${F.stageNames[k].padEnd(8)} ${s ? fmtSecs(s) : "skipped"}`));
    lines.push("");
    if (run.status === "cancelled") {
      lines.push(`cancelled: ${run.passed} passed, ${run.skipped} never ran`);
    } else {
      suitesFor(run).forEach((s) => {
        lines.push(`${s.failed ? "FAIL" : "PASS"}  ${s.name.padEnd(16)} ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped  ${fmtSecs(s.duration)}`);
        s.cases.filter((c) => c.status === "failed" && c.detail).forEach((c) => {
          lines.push(`      ✗ ${c.name}`, `        ${c.detail.assertion}`);
        });
      });
    }
    lines.push("", `${run.passed} passed, ${run.failed} failed, ${run.skipped} skipped`);
    return lines.join("\n") + "\n";
  }

  // Real JUnit XML for the run, the shape most CI tools ingest.
  function junitXML(run) {
    const x = (s) => String(s).replace(/[<>&"']/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
    const out = [`<?xml version="1.0" encoding="UTF-8"?>`,
      `<!-- testbench demo: built from fixture data; ${run.status === "cancelled" ? "run was cancelled" : "listed cases are a sample of each suite"} -->`,
      `<testsuites name="run-${run.id}" tests="${run.passed + run.failed + run.skipped}" failures="${run.failed}" skipped="${run.skipped}" time="${durationOf(run)}">`];
    if (run.status !== "cancelled") {
      suitesFor(run).forEach((s) => {
        out.push(`  <testsuite name="${x(s.name)}" tests="${s.total}" failures="${s.failed}" skipped="${s.skipped}" time="${s.duration}">`);
        s.cases.forEach((c) => {
          const open = `    <testcase classname="${x(s.name)}" name="${x(c.name)}" time="${parseCaseDuration(c.duration)}"`;
          if (c.status === "failed" && c.detail) {
            out.push(`${open}>`, `      <failure message="${x(c.detail.assertion)}">${x(c.detail.stack)}</failure>`, `    </testcase>`);
          } else if (c.status === "skipped") {
            out.push(`${open}><skipped/></testcase>`);
          } else {
            out.push(`${open}/>`);
          }
        });
        const hidden = s.total - s.cases.length;
        if (hidden > 0) out.push(`    <!-- ${hidden} more tests in ${x(s.name)} are not listed in the fixtures -->`);
        out.push(`  </testsuite>`);
      });
    }
    out.push(`</testsuites>`);
    return out.join("\n") + "\n";
  }

  /* ── code quality ───────────────────────────────────────────── */
  // Turning a rule set off hides its findings everywhere on the tab.
  function activeFindings() {
    const on = F.rulesets.filter((rs) => rs.enabled).map((rs) => rs.prefix);
    return F.findings.filter((f) => on.some((p) => f.rule.startsWith(p)));
  }

  function severityCounts(list) {
    const counts = { blocker: 0, major: 0, minor: 0 };
    list.forEach((f) => counts[f.sev]++);
    return counts;
  }

  function renderQuality() {
    renderRulesets();
    renderQualityMetrics();
    renderSevBars();
    renderFindings();
  }

  function renderRulesets() {
    const box = $("ruleset-list");
    box.innerHTML = "";
    F.rulesets.forEach((rs) => {
      const n = F.findings.filter((f) => f.rule.startsWith(rs.prefix)).length;
      const d = el("button", "rs-item" + (rs.enabled ? "" : " is-off"));
      d.setAttribute("aria-pressed", String(rs.enabled));
      d.innerHTML =
        `<span class="rs-name"><span class="rs-toggle" aria-hidden="true"></span>${esc(rs.name)}</span>` +
        `<span class="rs-count">${rs.count} rules · ${n} hit${n === 1 ? "" : "s"}</span>`;
      d.addEventListener("click", () => {
        rs.enabled = !rs.enabled;
        renderQuality();
      });
      box.appendChild(d);
    });
    const on = F.rulesets.filter((rs) => rs.enabled).length;
    $("ruleset-count").textContent = `${on} of ${F.rulesets.length} sets enabled`;
  }

  function renderQualityMetrics() {
    const counts = severityCounts(activeFindings());
    const s = F.scan;
    const v = $("q-verdict");
    v.textContent = counts.blocker ? `${counts.blocker} blocking` : "nothing blocking";
    v.classList.toggle("verdict-warn", counts.blocker > 0);
    $("scan-sub").innerHTML =
      `analysed ${s.files} files · ${s.lines.toLocaleString("en-US")} lines · scan took ${esc(s.took)} · commit <code>${esc(s.sha)}</code>`;
    const cards = [
      { label: "blockers", value: counts.blocker, cls: counts.blocker ? "is-fail" : "is-pass", delta: "must fix to merge" },
      { label: "major", value: counts.major, cls: counts.major ? "is-warn" : "", delta: "fix this sprint" },
      { label: "minor", value: counts.minor, cls: "", delta: "backlog" },
      { label: "debt ratio", value: s.debt, cls: "", delta: s.debtTime },
      { label: "duplication", value: s.duplication, cls: "", delta: `${s.duplicatedLines.toLocaleString("en-US")} lines` },
      { label: "maintainability", value: s.maintainability, cls: "is-warn", delta: `was ${s.previousGrade} last scan` },
    ];
    $("q-metrics").innerHTML = cards
      .map(
        (c) =>
          `<div class="metric"><div class="m-label">${c.label}</div>` +
          `<div class="m-value ${c.cls}">${esc(c.value)}</div>` +
          `<div class="m-delta">${esc(c.delta)}</div></div>`
      )
      .join("");
  }

  function renderSevBars() {
    const counts = severityCounts(activeFindings());
    // an all-zero tab used to divide by zero and paint NaN widths
    const max = Math.max(1, ...Object.values(counts));
    $("sev-bars").innerHTML = ["blocker", "major", "minor"]
      .map(
        (k) =>
          `<div class="sev-row"><span class="sev-label">${k}</span>` +
          `<span class="sev-track"><span class="sev-fill ${k}" style="width:${(counts[k] / max) * 100}%"></span></span>` +
          `<span class="sev-num">${counts[k]}</span></div>`
      )
      .join("");
  }

  function snippetHTML(f) {
    const start = Math.max(1, f.line - 1);
    return `<span class="sn-file">${esc(f.file)}:${f.line}</span>\n` + f.snippet.map((text, k) => {
      const n = start + k;
      return `<span class="sn-line${n === f.line ? " is-hit" : ""}"><span class="sn-no">${n}</span>${esc(text) || " "}</span>`;
    }).join("\n");
  }

  function renderFindings() {
    const q = findingQuery.trim().toLowerCase();
    const rows = activeFindings()
      .filter((f) => sevFilter === "all" || f.sev === sevFilter)
      .filter((f) => !q || [f.rule, f.msg, f.file].some((s) => s.toLowerCase().includes(q)));
    $("findings-count").textContent = `${rows.length} of ${activeFindings().length}`;
    $("findings-body").innerHTML = rows.length
      ? rows
          .map((f) => {
            const i = F.findings.indexOf(f);
            const open = i === openFinding;
            return `<tr class="finding${open ? " is-open" : ""}" data-i="${i}">` +
              `<td><span class="sev-tag sev-${f.sev}">${f.sev}</span></td>` +
              `<td><button class="finding-toggle" aria-expanded="${open}" aria-controls="snippet-${i}">${esc(f.rule)}</button></td>` +
              `<td>${esc(f.msg)}</td>` +
              `<td class="file">${esc(f.file)}</td><td class="num">${f.line}</td></tr>` +
              (open
                ? `<tr class="snippet-row" id="snippet-${i}"><td colspan="5"><pre class="snippet">${snippetHTML(f)}</pre></td></tr>`
                : "");
          })
          .join("")
      : `<tr><td colspan="5" class="empty-cell">No findings match from the enabled rule sets.</td></tr>`;
  }

  // Real SARIF 2.1.0 built from whatever the table is showing, so the
  // shape is ready for when findings come from an actual analyser.
  function sarif() {
    const list = activeFindings();
    const level = { blocker: "error", major: "warning", minor: "note" };
    return {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: { driver: { name: "testbench", informationUri: "https://github.com/JadenB9/testbench",
          rules: [...new Set(list.map((f) => f.rule))].map((id) => ({ id })) } },
        properties: { note: "demo export generated from fixture data" },
        results: list.map((f) => ({
          ruleId: f.rule,
          level: level[f.sev],
          message: { text: f.msg },
          locations: [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line } } }],
        })),
      }],
    };
  }

  function renderScatter() {
    const box = $("scatter");
    box.querySelectorAll(".pt").forEach((n) => n.remove());
    const maxX = Math.max(...F.files.map((f) => f.complexity)) + 2;
    F.files.forEach((p) => {
      const dot = el("span", "pt" + (p.complexity > 14 && p.coverage < 70 ? " is-risk" : ""));
      dot.style.left = `${(p.complexity / maxX) * 100}%`;
      dot.style.bottom = `${p.coverage}%`;
      dot.title = `${p.file} · complexity ${p.complexity} · coverage ${p.coverage}%`;
      box.appendChild(dot);
    });
  }

  function renderHotspots() {
    const scored = F.files.map((f) => ({ ...f, score: f.churn * f.complexity }));
    const max = Math.max(...scored.map((f) => f.score));
    $("hotspots").innerHTML = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((h) => {
        const risk = h.score / max;
        return `<div class="hotspot"><span class="hs-file">${esc(h.file)}</span>` +
          `<span class="hs-bar-track" title="risk ${Math.round(risk * 100)}%"><span class="hs-bar ${risk > 0.5 ? "high" : ""}" style="width:${risk * 100}%"></span></span>` +
          `<span class="hs-stat">cx ${h.complexity} · ch ${h.churn}</span>` +
          `<span class="hs-stat">${h.coverage}% cov</span></div>`;
      })
      .join("");
  }

  /* ── filters & buttons ──────────────────────────────────────── */
  function chips(groupId, onPick) {
    const group = $(groupId);
    const all = group.querySelectorAll(".chip");
    const set = (value) => all.forEach((c) => {
      const on = c.dataset.value === value;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      set(chip.dataset.value);
      onPick(chip.dataset.value);
    });
    return set;
  }

  function initFilters() {
    const setRunChip = chips("run-filter", (v) => { runFilter = v; renderRuns(); writeState(); });
    const setSuiteChip = chips("suite-filter", (v) => { suiteFilter = v; renderTree(); writeState(); });
    const setSevChip = chips("finding-filter", (v) => { sevFilter = v; renderFindings(); writeState(); });
    setRunChip(runFilter);
    setSuiteChip(suiteFilter);
    setSevChip(sevFilter);

    const rs = $("run-search");
    rs.value = runQuery;
    rs.addEventListener("input", () => { runQuery = rs.value; renderRuns(); writeState(); });
    const fs = $("finding-search");
    fs.value = findingQuery;
    fs.addEventListener("input", () => { findingQuery = fs.value; renderFindings(); writeState(); });

    // Buttons for features that need a real backend say so instead of doing nothing.
    document.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.demo)));

    $("btn-log").addEventListener("click", () => {
      download(`run-${currentRun.id}.log`, runLog(currentRun), "text/plain");
      toast(`Downloaded run-${currentRun.id}.log (built from fixtures)`);
    });
    $("btn-details").addEventListener("click", openDrawer);
    $("drawer-close").addEventListener("click", () => $("drawer").close());
    $("drawer").addEventListener("close", writeState);
    // a click on the backdrop lands on the dialog element itself
    $("drawer").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $("help").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $("help-close").addEventListener("click", () => $("help").close());
    $("btn-help").addEventListener("click", () => $("help").showModal());

    $("btn-sarif").addEventListener("click", () => {
      download("testbench.sarif", JSON.stringify(sarif(), null, 2), "application/sarif+json");
      toast(`Exported ${activeFindings().length} findings as SARIF 2.1.0`);
    });

    $("findings-body").addEventListener("click", (e) => {
      const row = e.target.closest("tr.finding");
      if (!row) return;
      const i = Number(row.dataset.i);
      openFinding = openFinding === i ? -1 : i;
      renderFindings();
      const btn = $("findings-body").querySelector(`tr[data-i="${i}"] .finding-toggle`);
      if (btn && e.target.closest(".finding-toggle")) btn.focus();
    });

    $("coverage").addEventListener("click", (e) => {
      const dot = e.target.closest(".cov-dot");
      if (!dot) return;
      const run = F.runs.find((r) => String(r.id) === dot.dataset.run);
      if (run) selectRun(run);
    });

    const repo = $("repo-select");
    const first = repo.value;
    repo.addEventListener("change", () => {
      toast(`Fixtures only cover ${first}; ${repo.value} would load from the API.`);
      repo.value = first;
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCoverage, 120);
    });
  }

  /* ── keyboard ───────────────────────────────────────────────── */
  function stepRun(delta, focusItem) {
    const list = visibleRuns();
    const next = list[list.indexOf(currentRun) + delta];
    if (!next) return;
    selectRun(next);
    const item = $("run-list").querySelector(".run-item.is-active");
    if (item) {
      item.scrollIntoView({ block: "nearest" });
      if (focusItem) item.focus();
    }
  }

  function initKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const typing = t && ["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName);
      if (typing) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (document.querySelector("dialog[open]")) return; // dialogs handle Escape themselves
      const inRail = t && t.closest && t.closest("#run-list");
      switch (e.key) {
        case "j": if (activeTab === "runs") stepRun(1, inRail); break;
        case "k": if (activeTab === "runs") stepRun(-1, inRail); break;
        case "ArrowDown": if (inRail) { e.preventDefault(); stepRun(1, true); } break;
        case "ArrowUp": if (inRail) { e.preventDefault(); stepRun(-1, true); } break;
        case "1": showTab("runs"); break;
        case "2": showTab("quality"); break;
        case "i": if (activeTab === "runs") openDrawer(); break;
        case "/": e.preventDefault(); (activeTab === "runs" ? $("run-search") : $("finding-search")).focus(); break;
        case "t": toggleTheme(); break;
        case "?": $("help").showModal(); break;
        default: return;
      }
    });
  }

  /* ── boot ───────────────────────────────────────────────────── */
  initTheme();
  initTabs();
  const wantDrawer = readState();
  initFilters();
  initKeys();
  showTab(activeTab);
  renderRunsTab();
  renderQuality();
  renderScatter();
  renderHotspots();
  if (wantDrawer) openDrawer();
})();
