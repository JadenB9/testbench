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

  /* ── top-level tabs ─────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
        document.querySelectorAll(".pane").forEach((p) => p.classList.remove("is-active"));
        tab.classList.add("is-active");
        document.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add("is-active");
        window.scrollTo({ top: 0 });
      });
    });
  }

  /* ── run list ───────────────────────────────────────────────── */
  function renderRuns() {
    const box = $("run-list");
    box.innerHTML = "";
    F.runs.forEach((run) => {
      const b = el("button", "run-item" + (run.id === currentRun.id ? " is-active" : ""));
      b.innerHTML =
        `<div class="ri-top"><span class="ri-id">#${run.id}</span>` +
        `<span class="ri-status st-${run.status}">${run.status}</span></div>` +
        `<div class="ri-meta"><span>${esc(run.sha)}</span><span>${esc(run.branch)}</span>` +
        `<span>${esc(run.when)}</span></div>`;
      b.addEventListener("click", () => {
        currentRun = run;
        renderRuns();
        renderRunHeader();
        renderMetrics();
        renderChart();
      });
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
  }

  function renderMetrics() {
    const r = currentRun;
    const total = r.passed + r.failed + r.skipped;
    const rate = total ? ((r.passed / total) * 100).toFixed(1) : "0.0";
    const prev = F.runs[F.runs.indexOf(r) + 1];
    const covDelta =
      prev && prev.coverage != null && r.coverage != null
        ? (r.coverage - prev.coverage).toFixed(1)
        : null;

    const cards = [
      { label: "pass rate", value: `${rate}%`, cls: r.failed ? "is-warn" : "is-pass",
        delta: `${total} tests total` },
      { label: "passed", value: r.passed, cls: "is-pass", delta: "" },
      { label: "failed", value: r.failed, cls: r.failed ? "is-fail" : "", delta: r.failed ? "needs triage" : "none" },
      { label: "skipped", value: r.skipped, cls: "", delta: "" },
      { label: "duration", value: r.duration.replace(" ", ""), cls: "", delta: "wall clock" },
      { label: "coverage", value: r.coverage != null ? `${r.coverage}%` : "—", cls: "",
        delta: covDelta != null ? `${covDelta >= 0 ? "+" : ""}${covDelta} pts` : "not collected",
        deltaCls: covDelta == null ? "" : covDelta >= 0 ? "up" : "down" },
    ];

    $("metrics").innerHTML = cards
      .map(
        (c) =>
          `<div class="metric"><div class="m-label">${c.label}</div>` +
          `<div class="m-value ${c.cls || ""}">${c.value}</div>` +
          `<div class="m-delta ${c.deltaCls || ""}">${c.delta}</div></div>`
      )
      .join("");
  }

  /* ── pass-rate chart ────────────────────────────────────────── */
  function renderChart() {
    const box = $("chart");
    box.innerHTML = "";
    const max = Math.max(...F.history.map((h) => h.passed + h.failed + h.skipped));
    const currentIdx = F.history.length - 1 - F.runs.indexOf(currentRun);

    F.history.forEach((h, i) => {
      const col = el("div", "bar-col" + (i === currentIdx ? " is-current" : ""));
      const total = h.passed + h.failed + h.skipped;
      col.title = `${h.passed} passed · ${h.failed} failed · ${h.skipped} skipped`;
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
  function visibleSuites() {
    if (suiteFilter === "failed") return F.suites.filter((s) => s.failed > 0);
    if (suiteFilter === "slow") {
      return F.suites
        .slice()
        .sort((a, b) => parseDuration(b.duration) - parseDuration(a.duration))
        .slice(0, 3);
    }
    return F.suites;
  }

  function parseDuration(d) {
    const m = /(?:(\d+)m\s*)?([\d.]+)\s*s/.exec(d);
    return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : 0;
  }

  function renderTree() {
    const box = $("tree");
    box.innerHTML = "";
    const list = visibleSuites();

    if (!list.length) {
      box.innerHTML = '<div style="padding:14px 13px;color:var(--dimmer);font-size:11.5px">No suites match this filter.</div>';
      return;
    }

    list.forEach((suite, idx) => {
      const wrap = el("div", "tree-suite" + (suite.failed > 0 && idx === 0 ? " is-open" : ""));

      const row = el("button", "suite-row");
      row.innerHTML =
        `<span class="caret">›</span><span class="suite-name">${esc(suite.name)}</span>` +
        `<span class="suite-counts">` +
        `<span class="sc-pass">${suite.passed}✓</span>` +
        (suite.failed ? `<span class="sc-fail">${suite.failed}✗</span>` : "") +
        (suite.skipped ? `<span class="sc-skip">${suite.skipped}−</span>` : "") +
        `</span><span class="suite-dur">${esc(suite.duration)}</span>`;
      row.addEventListener("click", () => wrap.classList.toggle("is-open"));
      wrap.appendChild(row);

      const cases = el("div", "case-list");
      suite.cases.forEach((c) => {
        const cr = el("div", "case-row" + (c.status === "failed" ? " is-failed" : ""));
        cr.innerHTML =
          `<span class="case-dot cd-${c.status}"></span>` +
          `<span class="case-name">${esc(c.name)}</span>` +
          `<span class="case-dur">${esc(c.duration)}</span>`;
        cr.addEventListener("click", () => {
          $("detail-case").textContent = `${suite.name}/${c.name.split(" › ")[0]}`;
        });
        cases.appendChild(cr);
      });
      wrap.appendChild(cases);
      box.appendChild(wrap);
    });
  }

  function renderFlaky() {
    $("flaky-body").innerHTML = F.flaky
      .map(
        (f) =>
          `<tr><td>${esc(f.test)}</td><td class="file">${esc(f.suite)}</td>` +
          `<td class="num">${(f.rate * 100).toFixed(0)}%</td>` +
          `<td class="num seq">${f.seq
            .split("")
            .map((ch) => `<span class="${ch === "P" ? "p" : "f"}">${ch}</span>`)
            .join("")}</td>` +
          `<td class="file">${esc(f.owner)}</td></tr>`
      )
      .join("");
  }

  /* ── code quality ───────────────────────────────────────────── */
  function renderRulesets() {
    const box = $("ruleset-list");
    box.innerHTML = "";
    F.rulesets.forEach((rs) => {
      const d = el("div", "rs-item" + (rs.enabled ? "" : " is-off"));
      d.innerHTML =
        `<span class="rs-name"><span class="rs-toggle"></span>${esc(rs.name)}</span>` +
        `<span class="rs-count">${rs.count}</span>`;
      d.addEventListener("click", () => {
        rs.enabled = !rs.enabled;
        renderRulesets();
      });
      box.appendChild(d);
    });
  }

  function renderQualityMetrics() {
    const counts = { blocker: 0, major: 0, minor: 0 };
    F.findings.forEach((f) => counts[f.sev]++);
    const cards = [
      { label: "blockers", value: counts.blocker, cls: "is-fail", delta: "must fix to merge" },
      { label: "major", value: counts.major, cls: "is-warn", delta: "fix this sprint" },
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
    const counts = { blocker: 0, major: 0, minor: 0 };
    F.findings.forEach((f) => counts[f.sev]++);
    const max = Math.max(...Object.values(counts));
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
    const rows = F.findings.filter((f) => sevFilter === "all" || f.sev === sevFilter);
    $("findings-body").innerHTML = rows.length
      ? rows
          .map(
            (f) =>
              `<tr><td><span class="sev-tag sev-${f.sev}">${f.sev}</span></td>` +
              `<td>${esc(f.rule)}</td><td>${esc(f.msg)}</td>` +
              `<td class="file">${esc(f.file)}</td><td class="num">${f.line}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="color:var(--dimmer)">No findings at this severity.</td></tr>`;
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
          `<span class="hs-bar-track"><span class="hs-bar ${h.risk > 0.7 ? "high" : ""}" style="width:${h.risk * 100}%"></span></span>` +
          `<span class="hs-stat">cx ${h.complexity} · ch ${h.churn}</span>` +
          `<span class="hs-stat">${h.coverage}% cov</span></div>`
      )
      .join("");
  }

  /* ── filters ────────────────────────────────────────────────── */
  function initFilters() {
    $("suite-filter").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      suiteFilter = chip.dataset.filter;
      $("suite-filter").querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      renderTree();
    });

    $("finding-filter").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      sevFilter = chip.dataset.sev;
      $("finding-filter").querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      renderFindings();
    });

    $("btn-refresh").addEventListener("click", (e) => {
      const b = e.currentTarget;
      b.style.opacity = "0.4";
      setTimeout(() => (b.style.opacity = ""), 400);
    });
  }

  /* ── boot ───────────────────────────────────────────────────── */
  initTabs();
  initFilters();
  renderRuns();
  renderRunHeader();
  renderMetrics();
  renderChart();
  renderTree();
  renderFlaky();
  renderRulesets();
  renderQualityMetrics();
  renderSevBars();
  renderFindings();
  renderScatter();
  renderHotspots();
})();
