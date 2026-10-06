/* testbench — wireframe interactions.
   Rendering is driven entirely by window.FIXTURES; swap that for a fetch()
   against a real runner and the views keep working. */
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

  let currentRun = F.runs[0];
  let suiteFilter = "all";
  let sevFilter = "all";
  let selectedCase = null;   // { suite, case } shown in the failure panel
  let toastTimer = null;

  /* ── wireframe feedback ─────────────────────────────────────── */
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

  /* ── top-level tabs ─────────────────────────────────────────── */
  function showTab(name, focus) {
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("is-active", p.dataset.pane === name));
  }

  function initTabs() {
    const tabs = [...document.querySelectorAll(".tab")];
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        showTab(tab.dataset.tab);
        history.replaceState(null, "", tab.dataset.tab === "runs" ? location.pathname : "#" + tab.dataset.tab);
        window.scrollTo({ top: 0 });
      });
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.click();
        next.focus();
      });
    });
    if (location.hash === "#quality") showTab("quality");
  }

  /* ── per-run suite results ──────────────────────────────────── */
  // A suite runs the same tests every time; the run's `failedBy` says how many
  // failed and any change in the skip count lands on the largest suite, so the
  // suite totals always add up to the run's own numbers.
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
        cases: s.cases.map((c) => (c.status === "failed" && !failed ? { ...c, status: "passed", detail: null } : c)),
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

  /* ── run list ───────────────────────────────────────────────── */
  function selectRun(run) {
    currentRun = run;
    selectedCase = firstFailure(run);
    renderRuns();
    renderRunHeader();
    renderMetrics();
    renderChart();
    renderTree();
    renderDetail();
  }

  function renderRuns() {
    const box = $("run-list");
    box.innerHTML = "";
    F.runs.forEach((run) => {
      const active = run.id === currentRun.id;
      const b = el("button", "run-item" + (active ? " is-active" : ""));
      if (active) b.setAttribute("aria-current", "true");
      b.innerHTML =
        `<div class="ri-top"><span class="ri-id">#${run.id}</span>` +
        `<span class="ri-status st-${esc(run.status)}">${esc(run.status)}</span></div>` +
        `<div class="ri-meta"><span>${esc(run.sha)}</span><span>${esc(run.branch)}</span>` +
        `<span>${esc(run.when)}</span></div>`;
      b.addEventListener("click", () => selectRun(run));
      box.appendChild(b);
    });
  }

  function renderRunHeader() {
    const r = currentRun;
    $("run-title").textContent = `Run #${r.id}`;
    const v = $("run-verdict");
    v.textContent = r.status;
    v.dataset.status = r.status;
    $("run-sub").innerHTML =
      `${esc(r.branch)} · <code>${esc(r.sha)}</code> · ${esc(r.author)} · ` +
      `${esc(r.when)} · took ${esc(r.duration)}`;
    // nothing to re-run on a green build
    $("btn-rerun").disabled = !r.failed;
  }

  function renderMetrics() {
    const r = currentRun;
    const total = r.passed + r.failed + r.skipped;
    const ran = r.passed + r.failed;
    const rate = ran ? ((r.passed / ran) * 100).toFixed(1) : "0.0";
    const prev = F.runs[F.runs.indexOf(r) + 1];
    const covDelta =
      prev && prev.coverage != null && r.coverage != null
        ? (r.coverage - prev.coverage).toFixed(1)
        : null;

    const cards = [
      r.status === "cancelled"
        ? { label: "pass rate", value: "—", cls: "", delta: `cancelled · ${total} total` }
        : { label: "pass rate", value: `${rate}%`, cls: r.failed ? "is-warn" : "is-pass",
            delta: `of ${ran} run · ${total} total` },
      { label: "passed", value: r.passed, cls: "is-pass", delta: "" },
      { label: "failed", value: r.failed, cls: r.failed ? "is-fail" : "", delta: r.failed ? "needs triage" : "none" },
      { label: "skipped", value: r.skipped, cls: "", delta: r.status === "cancelled" ? "never ran" : "" },
      { label: "duration", value: r.duration.replace(" ", ""), cls: "", delta: "wall clock" },
      { label: "coverage", value: r.coverage != null ? `${r.coverage}%` : "—", cls: "",
        delta: covDelta != null ? `${covDelta >= 0 ? "+" : ""}${covDelta} pts` : "not collected",
        deltaCls: covDelta == null ? "" : covDelta >= 0 ? "up" : "down" },
    ];

    $("metrics").innerHTML = cards
      .map(
        (c) =>
          `<div class="metric"><div class="m-label">${c.label}</div>` +
          `<div class="m-value ${c.cls || ""}">${esc(c.value)}</div>` +
          `<div class="m-delta ${c.deltaCls || ""}">${esc(c.delta)}</div></div>`
      )
      .join("");
  }

  /* ── results chart ──────────────────────────────────────────── */
  function renderChart() {
    const box = $("chart");
    box.innerHTML = "";
    const max = Math.max(...F.history.map((h) => h.passed + h.failed + h.skipped));
    // the newest entries are the runs in the rail, newest last
    const runAt = (i) => F.runs[F.history.length - 1 - i];

    F.history.forEach((h, i) => {
      const run = runAt(i);
      const col = el(run ? "button" : "div", "bar-col" + (run ? " is-run" : "") + (run === currentRun ? " is-current" : ""));
      const total = h.passed + h.failed + h.skipped;
      const label = `${run ? "Run #" + run.id + ": " : ""}${h.passed} passed · ${h.failed} failed · ${h.skipped} skipped`;
      col.title = label;
      if (run) {
        col.setAttribute("aria-label", label);
        col.addEventListener("click", () => selectRun(run));
      }
      [["skip", h.skipped], ["fail", h.failed], ["pass", h.passed]].forEach(([k, v]) => {
        if (!v) return;
        const seg = el("div", `bar-seg bar-${k}`);
        seg.style.height = `${(v / max) * 100}%`;
        col.appendChild(seg);
      });
      col.style.minHeight = `${(total / max) * 100}%`;
      box.appendChild(col);
    });
  }

  /* ── suite tree ─────────────────────────────────────────────── */
  function visibleSuites(list) {
    if (suiteFilter === "failed") return list.filter((s) => s.failed > 0);
    if (suiteFilter === "slow") {
      return list
        .slice()
        .sort((a, b) => parseDuration(b.duration) - parseDuration(a.duration))
        .slice(0, 3);
    }
    return list;
  }

  function parseDuration(d) {
    const m = /(?:(\d+)m\s*)?([\d.]+)\s*s/.exec(d);
    return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : 0;
  }

  function renderTree() {
    const box = $("tree");
    box.innerHTML = "";
    const r = currentRun;

    if (r.status === "cancelled") {
      $("suite-note").textContent = "";
      box.innerHTML =
        `<div class="empty">Run #${r.id} was cancelled after ${esc(r.duration)}. ` +
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
        `</span><span class="suite-dur">${esc(suite.duration)}</span>`;
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
          `<span class="case-dot cd-${esc(c.status)}" aria-hidden="true"></span>` +
          `<span class="case-name">${esc(c.name)}</span>` +
          `<span class="case-dur">${esc(c.duration)}</span>`;
        cr.setAttribute("aria-label", `${c.name}, ${c.status}`);
        cr.addEventListener("click", () => {
          selectedCase = { suite: suite.name, case: c };
          renderTree();
          renderDetail();
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
  function renderDetail() {
    const body = $("detail-body");
    const r = currentRun;
    if (!selectedCase) {
      $("detail-case").textContent = "";
      body.innerHTML = r.status === "cancelled"
        ? `<div class="empty">Cancelled runs don't produce failure detail.</div>`
        : `<div class="empty">No failures in run #${r.id}. Pick a run marked failed to see one.</div>`;
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
        `<div class="empty">Nothing to show: this test ${c.status === "skipped" ? "was skipped" : "passed"} in run #${r.id}.</div>`;
      return;
    }
    const d = c.detail;
    body.innerHTML =
      `<div class="fail-meta">` +
      `<div><span class="k">assertion</span><span class="v">${esc(d.assertion)}</span></div>` +
      `<div><span class="k">duration</span><span class="v">${esc(c.duration)}</span></div>` +
      `<div><span class="k">retries</span><span class="v">${esc(d.retries)}</span></div>` +
      `<div><span class="k">first seen</span><span class="v">run #${esc(d.firstSeen)}</span></div>` +
      `</div>` +
      `<div class="code-block"><div class="cb-head">expected / received</div><pre>${diffHTML(d.diff)}</pre></div>` +
      `<div class="code-block"><div class="cb-head">stack trace</div><pre>${esc(d.stack)}</pre></div>`;
  }

  function diffHTML(text) {
    return text.split("\n").map((line) => {
      const cls = line.startsWith("- ") ? "d-del" : line.startsWith("+ ") ? "d-add" : "";
      return cls ? `<span class="${cls}">${esc(line)}</span>` : esc(line);
    }).join("\n");
  }

  function runLog(run) {
    const lines = [
      "# testbench wireframe: generated from fixture data, no real runner involved",
      `run #${run.id}  ${run.status}  ${run.branch}@${run.sha}  by ${run.author}  (${run.duration})`,
      "",
    ];
    if (run.status === "cancelled") {
      lines.push(`cancelled: ${run.passed} passed, ${run.skipped} never ran`);
    } else {
      suitesFor(run).forEach((s) => {
        lines.push(`${s.failed ? "FAIL" : "PASS"}  ${s.name.padEnd(16)} ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped  ${s.duration}`);
        s.cases.filter((c) => c.status === "failed" && c.detail).forEach((c) => {
          lines.push(`      ✗ ${c.name}`, `        ${c.detail.assertion}`);
        });
      });
    }
    lines.push("", `${run.passed} passed, ${run.failed} failed, ${run.skipped} skipped`);
    return lines.join("\n") + "\n";
  }

  function renderFlaky() {
    $("flaky-body").innerHTML = F.flaky
      .map(
        (f) =>
          `<tr><td>${esc(f.test)}</td><td class="file">${esc(f.suite)}</td>` +
          `<td class="num">${(f.rate * 100).toFixed(0)}%</td>` +
          `<td class="num seq" aria-label="${esc(f.seq.replace(/P/g, "pass ").replace(/F/g, "fail "))}">${f.seq
            .split("")
            .map((ch) => `<span class="${ch === "P" ? "p" : "f"}">${ch}</span>`)
            .join("")}</td>` +
          `<td class="file">${esc(f.owner)}</td></tr>`
      )
      .join("");
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
      const d = el("button", "rs-item" + (rs.enabled ? "" : " is-off"));
      d.setAttribute("aria-pressed", String(rs.enabled));
      d.innerHTML =
        `<span class="rs-name"><span class="rs-toggle" aria-hidden="true"></span>${esc(rs.name)}</span>` +
        `<span class="rs-count">${rs.count} rules</span>`;
      d.addEventListener("click", () => {
        rs.enabled = !rs.enabled;
        renderQuality();
      });
      box.appendChild(d);
    });
    const n = F.rulesets.filter((rs) => rs.enabled).length;
    $("ruleset-count").textContent = `${n} of ${F.rulesets.length} sets enabled`;
  }

  function renderQualityMetrics() {
    const counts = severityCounts(activeFindings());
    const v = $("q-verdict");
    v.textContent = counts.blocker ? `${counts.blocker} blocking` : "nothing blocking";
    v.classList.toggle("verdict-warn", counts.blocker > 0);
    const cards = [
      { label: "blockers", value: counts.blocker, cls: counts.blocker ? "is-fail" : "is-pass", delta: "must fix to merge" },
      { label: "major", value: counts.major, cls: counts.major ? "is-warn" : "", delta: "fix this sprint" },
      { label: "minor", value: counts.minor, cls: "", delta: "backlog" },
      { label: "debt ratio", value: "4.1%", cls: "", delta: "est. 3d 2h" },
      { label: "duplication", value: "2.8%", cls: "", delta: "1,069 lines" },
      { label: "maintainability", value: "B", cls: "is-warn", delta: "was A last scan" },
    ];
    $("q-metrics").innerHTML = cards
      .map(
        (c) =>
          `<div class="metric"><div class="m-label">${c.label}</div>` +
          `<div class="m-value ${c.cls}">${c.value}</div>` +
          `<div class="m-delta">${c.delta}</div></div>`
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

  function renderFindings() {
    const rows = activeFindings().filter((f) => sevFilter === "all" || f.sev === sevFilter);
    $("findings-body").innerHTML = rows.length
      ? rows
          .map(
            (f) =>
              `<tr><td><span class="sev-tag sev-${f.sev}">${f.sev}</span></td>` +
              `<td>${esc(f.rule)}</td><td>${esc(f.msg)}</td>` +
              `<td class="file">${esc(f.file)}</td><td class="num">${f.line}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="empty-cell">No findings at this severity from the enabled rule sets.</td></tr>`;
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
        properties: { note: "wireframe export generated from fixture data" },
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
    const maxX = 26;
    F.scatter.forEach((p) => {
      const dot = el("span", "pt" + (p.x > 14 && p.y < 70 ? " is-risk" : ""));
      dot.style.left = `${(p.x / maxX) * 100}%`;
      dot.style.bottom = `${p.y}%`;
      dot.title = `complexity ${p.x} · coverage ${p.y}%`;
      box.appendChild(dot);
    });
  }

  function renderHotspots() {
    $("hotspots").innerHTML = F.hotspots
      .map(
        (h) =>
          `<div class="hotspot"><span class="hs-file">${esc(h.file)}</span>` +
          `<span class="hs-bar-track" title="risk ${Math.round(h.risk * 100)}%"><span class="hs-bar ${h.risk > 0.7 ? "high" : ""}" style="width:${h.risk * 100}%"></span></span>` +
          `<span class="hs-stat">cx ${h.complexity} · ch ${h.churn}</span>` +
          `<span class="hs-stat">${h.coverage}% cov</span></div>`
      )
      .join("");
  }

  /* ── filters & buttons ──────────────────────────────────────── */
  function initFilters() {
    const chips = (groupId, onPick) => {
      const group = $(groupId);
      const all = group.querySelectorAll(".chip");
      all.forEach((c) => c.setAttribute("aria-pressed", String(c.classList.contains("is-active"))));
      group.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        all.forEach((c) => { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");
        onPick(chip);
      });
    };
    chips("suite-filter", (chip) => { suiteFilter = chip.dataset.filter; renderTree(); });
    chips("finding-filter", (chip) => { sevFilter = chip.dataset.sev; renderFindings(); });

    // Buttons for features that need a real backend say so instead of doing nothing.
    document.querySelectorAll("[data-wf]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.wf)));

    $("btn-log").addEventListener("click", () => {
      download(`run-${currentRun.id}.log`, runLog(currentRun), "text/plain");
      toast(`Downloaded run-${currentRun.id}.log (built from fixtures)`);
    });
    $("btn-sarif").addEventListener("click", () => {
      download("testbench.sarif", JSON.stringify(sarif(), null, 2), "application/sarif+json");
      toast(`Exported ${activeFindings().length} findings as SARIF 2.1.0`);
    });

    const repo = $("repo-select");
    const first = repo.value;
    repo.addEventListener("change", () => {
      toast(`Fixtures only cover ${first}; ${repo.value} would load from the API.`);
      repo.value = first;
    });
  }

  /* ── boot ───────────────────────────────────────────────────── */
  initTabs();
  initFilters();
  selectRun(currentRun);
  renderFlaky();
  renderQuality();
  renderScatter();
  renderHotspots();
})();
