/**
 * Live dashboard for anush.wiki/blog/raft.
 * Talks to the control plane via same-origin /api/raft/* (Next rewrite).
 */
(function () {
  "use strict";

  const KILL_COOLDOWN_MS = 2000;

  const root = document.getElementById("raft-lab");
  if (!root) return;

  const API = (root.getAttribute("data-api-base") || "/api/raft").replace(/\/$/, "");
  const nodesEl = root.querySelector("[data-nodes]");
  const toastEl = root.querySelector("[data-toast]");
  const statusEl = root.querySelector("[data-status-text]");
  const dotEl = root.querySelector("[data-status-dot]");
  const usersEl = root.querySelector("[data-users]");
  const uptimeEl = root.querySelector("[data-uptime]");
  const sinceLossEl = root.querySelector("[data-since-loss]");
  const writesEl = root.querySelector("[data-writes]");
  const readsEl = root.querySelector("[data-reads]");
  const hostCpuEl = root.querySelector("[data-host-cpu]");
  const hostMemEl = root.querySelector("[data-host-mem]");
  const hudEl = root.querySelector("[data-hud]");
  const electSvg = root.querySelector("[data-elect-svg]");
  const electTermsEl = root.querySelector("[data-elect-terms]");
  const electLanesEl = root.querySelector("[data-elect-lanes]");
  const electMarksEl = root.querySelector("[data-elect-marks]");
  const electAxisEl = root.querySelector("[data-elect-axis]");

  let lastSnapshot = null;
  let es = null;
  let reconnectTimer = null;
  let killReadyAt = 0;
  let cooldownTimer = null;
  let killInFlight = false;

  function setToast(msg, opts) {
    if (!toastEl) return;
    const text = msg || "";
    toastEl.textContent = text;
    const cooldown = !!(opts && opts.cooldown) || /^wait /.test(text);
    toastEl.classList.toggle("is-cooldown", cooldown);
  }

  function cooldownRemainingMs() {
    return Math.max(0, killReadyAt - Date.now());
  }

  function formatCooldownWait(ms) {
    if (ms <= 0) return "wait 0s";
    if (ms >= 1000) return "wait " + Math.ceil(ms / 1000) + "s";
    return "wait " + (ms / 1000).toFixed(1) + "s";
  }

  function parseRetryMs(text) {
    const m = /retry in (\d+)ms/i.exec(text || "");
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  function tickCooldown() {
    const left = cooldownRemainingMs();
    if (left <= 0) {
      killReadyAt = 0;
      if (cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
      if (toastEl && /^wait /.test(toastEl.textContent || "")) {
        setToast("");
      }
      return;
    }
    setToast(formatCooldownWait(left), { cooldown: true });
  }

  function startKillCooldown(ms) {
    const duration = ms > 0 ? ms : KILL_COOLDOWN_MS;
    killReadyAt = Date.now() + duration;
    if (cooldownTimer) clearInterval(cooldownTimer);
    tickCooldown();
    cooldownTimer = setInterval(tickCooldown, 250);
  }

  function fmtUptime(ms) {
    if (!ms || ms < 0) return "-";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + sec + "s";
    return sec + "s";
  }

  function fmtRate(n) {
    if (n == null || Number.isNaN(n)) return "-";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return Math.round(n).toString();
  }

  /** Three significant figures, so 1.25B / 12.5M / 125k all fit a tile. */
  function sig3(x) {
    if (x >= 100) return x.toFixed(0);
    if (x >= 10) return x.toFixed(1);
    return x.toFixed(2);
  }

  /**
   * The raft commit index never resets: compaction shortens the log, not the
   * counter. After a few weeks of load it is ten digits and it is the widest
   * thing on a tile, so the tile carries the short form and the exact value
   * lives in the title attribute.
   */
  function fmtCount(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "-";
    if (v >= 1e9) return sig3(v / 1e9) + "B";
    if (v >= 1e6) return sig3(v / 1e6) + "M";
    if (v >= 1000) return sig3(v / 1000) + "k";
    return String(Math.round(v));
  }

  function fmtExact(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "-";
    return v.toLocaleString("en-US");
  }

  function fmtCpuPct(n) {
    if (n == null || Number.isNaN(n)) return "-";
    return Math.round(n) + "%";
  }

  function fmtBytes(n) {
    if (n == null || Number.isNaN(n) || n < 0) return "-";
    const gib = n / (1024 * 1024 * 1024);
    if (gib >= 10) return gib.toFixed(0) + " GiB";
    if (gib >= 1) return gib.toFixed(1) + " GiB";
    const mib = n / (1024 * 1024);
    if (mib >= 1) return Math.round(mib) + " MiB";
    return Math.round(n / 1024) + " KiB";
  }

  function fmtMemPair(used, total) {
    if (used == null || total == null || Number.isNaN(used) || Number.isNaN(total)) {
      return "-";
    }
    return fmtBytes(used) + " / " + fmtBytes(total);
  }

  /* ------------------------------------------------------------------
     Election strip.

     Thirty minutes of every machine's role, loaded with history on arrival
     and kept moving after that. An election here happens every few minutes,
     so a shorter window is empty most of the time a visitor looks at it.

     Two sources, stitched at the moment the first live frame lands:
       - the past: the control plane's audit log (every leader change with
         its term, days deep) plus the snapshot's own event ring (every kill
         and heal, about half an hour deep);
       - the present: the per-node roles in each live frame, twice a second.
     Both feed the same function, electApply, so history and live data
     cannot be drawn by two different rules.

     The grid above is rebuilt with innerHTML on every frame. This is not.
     The SVG elements are created once and only their attributes move.
     ------------------------------------------------------------------ */

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ELECT_WINDOW_MS = 30 * 60 * 1000;
  const ELECT_RENDER_MS = 1000;
  const ELECT_AUDIT_LIMIT = 100; // ~8 hours at the chaos rate; the window needs one entry before it
  const ELECT_HISTORY_WAIT_MS = 6000;
  const ELECT_VB_W = 960;
  const ELECT_X0 = 52;
  const ELECT_X1 = 944;
  const ELECT_LANE_Y0 = 40;
  const ELECT_LANE_PITCH = 22;
  const ELECT_MAX_MARKS = 80;
  const ELECT_MAX_TICKS = 40;
  const ELECT_LABEL_GAP_PX = 30;
  // At thirty minutes a campaign is a few pixels; never let one vanish.
  const ELECT_MIN_SEG_PX = 4;
  // A new leader is linked to the old one's exit only if it arrives this soon after.
  const ELECT_CAMPAIGN_MAX_MS = 60000;
  // Fallback width of an unsampled campaign when the old leader's exit is unknown.
  const ELECT_INFERRED_MS = 600;

  let laneIds = [];
  let lanes = []; // {id, y, paths, runs: [{role, t0, t1, inferredFrom?}]}
  let markPool = [];
  let tickPool = [];
  let termMarks = []; // {t, term}
  let lastTerm = 0;
  let lastRoles = {};
  let leaderEnd = null; // {id, t}: when the last leader stopped leading
  let historyState = "idle"; // idle -> loading -> done
  let pendingSamples = [];

  // Start fetching history immediately, in parallel with the first snapshot.
  const auditPromise = electSvg
    ? fetch(API + "/audit?limit=" + ELECT_AUDIT_LIMIT, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => (body && Array.isArray(body.entries) ? body.entries : []))
        .catch(() => [])
    : Promise.resolve([]);

  function svgEl(name, attrs, text) {
    const el = document.createElementNS(SVG_NS, name);
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    if (text != null) el.textContent = text;
    return el;
  }

  function r1(n) {
    return Math.round(n * 10) / 10;
  }

  function roleOf(n) {
    if (!n.running || n.partitioned) return "down";
    const r = n.role || (n.isLeader ? "leader" : "follower");
    return r === "leader" || r === "candidate" ? r : "follower";
  }

  /** Build the lanes once. Called again only if the node set itself changes. */
  function electBuild(ids) {
    if (!electSvg) return;
    laneIds = ids.slice();
    lanes = [];
    markPool = [];
    tickPool = [];
    termMarks = [];
    lastTerm = 0;
    lastRoles = {};
    leaderEnd = null;
    electLanesEl.textContent = "";
    electMarksEl.textContent = "";
    electTermsEl.textContent = "";
    electAxisEl.textContent = "";

    const axisY = ELECT_LANE_Y0 + (ids.length - 1) * ELECT_LANE_PITCH + 18;
    electSvg.setAttribute("viewBox", "0 0 " + ELECT_VB_W + " " + (axisY + 20));

    ids.forEach(function (id, i) {
      const y = ELECT_LANE_Y0 + i * ELECT_LANE_PITCH;
      electLanesEl.appendChild(
        svgEl(
          "text",
          { class: "raft-elect__lane-label", x: ELECT_X0 - 10, y: y + 4, "text-anchor": "end" },
          "m" + id
        )
      );
      electLanesEl.appendChild(
        svgEl("line", { class: "raft-elect__track", x1: ELECT_X0, y1: y, x2: ELECT_X1, y2: y })
      );
      const paths = {};
      ["follower", "inferred", "candidate", "leader"].forEach(function (kind) {
        const el = svgEl("path", { class: "raft-elect__seg raft-elect__seg--" + kind, d: "" });
        electLanesEl.appendChild(el);
        paths[kind] = el;
      });
      lanes.push({ id: id, y: y, paths: paths, runs: [] });
    });

    for (let i = 0; i < ELECT_MAX_MARKS; i++) {
      const el = svgEl("path", { class: "raft-elect__x", d: "" });
      electMarksEl.appendChild(el);
      markPool.push(el);
    }
    for (let i = 0; i < ELECT_MAX_TICKS; i++) {
      const line = svgEl("line", {
        class: "raft-elect__tick",
        x1: 0,
        y1: 22,
        x2: 0,
        y2: axisY - 6,
        visibility: "hidden",
      });
      const label = svgEl("text", {
        class: "raft-elect__tick-label",
        x: 0,
        y: 14,
        "text-anchor": "middle",
        visibility: "hidden",
      });
      electTermsEl.appendChild(line);
      electTermsEl.appendChild(label);
      tickPool.push({ line: line, label: label });
    }

    const mid = (ELECT_X0 + ELECT_X1) / 2;
    electAxisEl.appendChild(
      svgEl("line", { class: "raft-elect__track", x1: ELECT_X0, y1: axisY, x2: ELECT_X1, y2: axisY })
    );
    [
      [ELECT_X0, "start", "30m ago"],
      [mid, "middle", "15m"],
      [ELECT_X1, "end", "now"],
    ].forEach(function (a) {
      electAxisEl.appendChild(
        svgEl(
          "text",
          { class: "raft-elect__axis-label", x: a[0], y: axisY + 15, "text-anchor": a[1] },
          a[2]
        )
      );
    });
  }

  /**
   * Record one observed state of the cluster at time t. The single writer for
   * both history and live frames. Runs are contiguous: a change observed at t
   * closes the previous run at t and opens the next one there.
   */
  function electApply(t, roles, term) {
    let prevLeader = 0;
    for (const id of laneIds) if (lastRoles[id] === "leader") prevLeader = id;
    if (prevLeader && roles[prevLeader] !== "leader") leaderEnd = { id: prevLeader, t: t };

    lanes.forEach(function (lane) {
      const role = roles[lane.id] || "down";
      const last = lane.runs[lane.runs.length - 1];
      if (last && last.role === role) {
        last.t1 = t;
        return;
      }
      if (last) last.t1 = t;
      const run = { role: role, t0: t, t1: t };
      // Became leader with no candidate observed: the campaign happened
      // between two observations. Remember the window it fell inside - from
      // the old leader's exit, when that is recent enough to be the cause.
      if (role === "leader" && last && last.role !== "candidate") {
        const from =
          leaderEnd && leaderEnd.id !== lane.id && t - leaderEnd.t <= ELECT_CAMPAIGN_MAX_MS
            ? leaderEnd.t
            : t - ELECT_INFERRED_MS;
        run.inferredFrom = Math.max(last.t0, from);
      }
      lane.runs.push(run);
    });

    if (term > lastTerm) {
      if (lastTerm) termMarks.push({ t: t, term: term });
      lastTerm = term;
    }
    lastRoles = roles;
  }

  function electPrune(now) {
    const cutoff = now - ELECT_WINDOW_MS - 5000;
    lanes.forEach(function (lane) {
      while (lane.runs.length > 1 && lane.runs[0].t1 < cutoff) lane.runs.shift();
    });
    while (termMarks.length && termMarks[0].t < cutoff) termMarks.shift();
  }

  /** "Machine 4 killed", "Machine 4 killed by the chaos monkey", "Machine 4 partitioned". */
  function ringDown(ev) {
    if (ev.kind !== "kill" && ev.kind !== "chaos" && ev.kind !== "partition") return 0;
    const m = /^Machine (\d+) (?:killed|partitioned)\b/.exec(ev.message || "");
    return m ? Number(m[1]) : 0;
  }

  /** "Node 4 auto-healed (restarted)", "Node 4 reconciled (...)", "Machine 4 restarted". */
  function ringUp(ev) {
    if (ev.kind !== "heal" && ev.kind !== "restart") return 0;
    if (/failed/i.test(ev.message || "")) return 0;
    const m = /^(?:Node|Machine) (\d+)\b/.exec(ev.message || "");
    return m ? Number(m[1]) : 0;
  }

  /**
   * Rebuild the window before the first live frame from what the control
   * plane remembers, replaying it through electApply in time order. Nothing
   * at or after `untilT` is used: from there the live frames are the truth.
   */
  function electReplayHistory(entries, ring, untilT) {
    const windowStart = untilT - ELECT_WINDOW_MS;
    const changes = [];
    let seed = null;

    (entries || []).forEach(function (e) {
      if (e.kind !== "leader_changed" || !e.leader || !e.term) return;
      const t = Date.parse(e.t);
      if (!Number.isFinite(t) || t >= untilT) return;
      if (t <= windowStart) {
        if (!seed || t > seed.t) seed = { t: t, leader: Number(e.leader), term: Number(e.term) };
      } else {
        changes.push({ t: t, type: "leader", id: Number(e.leader), term: Number(e.term) });
      }
    });

    const down = new Set();
    (ring || []).forEach(function (ev) {
      const t = Date.parse(ev.time);
      if (!Number.isFinite(t) || t >= untilT) return;
      const d = ringDown(ev);
      const u = ringUp(ev);
      if (!d && !u) return;
      if (t <= windowStart) {
        if (d) down.add(d);
        if (u) down.delete(u);
      } else {
        changes.push({ t: t, type: d ? "down" : "up", id: d || u });
      }
    });

    changes.sort(function (a, b) {
      return a.t - b.t;
    });

    let leader = seed ? seed.leader : 0;
    let term = seed ? seed.term : 0;
    const rolesNow = function () {
      const roles = {};
      laneIds.forEach(function (id) {
        roles[id] = down.has(id) ? "down" : id === leader ? "leader" : "follower";
      });
      return roles;
    };

    electApply(windowStart, rolesNow(), term);
    changes.forEach(function (c) {
      if (c.type === "down") {
        down.add(c.id);
        if (c.id === leader) leader = 0; // a dead leader leads nothing, even after it heals
      } else if (c.type === "up") {
        down.delete(c.id);
      } else {
        leader = c.id;
        term = Math.max(term, c.term);
        down.delete(c.id);
      }
      electApply(c.t, rolesNow(), term);
    });
  }

  function electStartHistory(snap) {
    historyState = "loading";
    const timeout = new Promise(function (resolve) {
      setTimeout(function () {
        resolve([]);
      }, ELECT_HISTORY_WAIT_MS);
    });
    Promise.race([auditPromise, timeout]).then(function (entries) {
      const untilT = pendingSamples.length ? pendingSamples[0].t : Date.now();
      electReplayHistory(entries, snap.events, untilT);
      pendingSamples.forEach(function (s) {
        electApply(s.t, s.roles, s.term);
      });
      pendingSamples = [];
      historyState = "done";
      const now = Date.now();
      electPrune(now);
      electRender(now);
    });
  }

  function electPush(snap) {
    if (!electSvg) return;
    const nodes = (snap.nodes || []).slice().sort(function (a, b) {
      return a.id - b.id;
    });
    if (!nodes.length) return;

    const ids = nodes.map(function (n) {
      return n.id;
    });
    if (ids.join(",") !== laneIds.join(",")) {
      electBuild(ids);
      historyState = "idle";
      pendingSamples = [];
    }

    const roles = {};
    nodes.forEach(function (n) {
      roles[n.id] = roleOf(n);
    });
    const sample = { t: Date.now(), roles: roles, term: Number(snap.term) || 0 };

    if (historyState !== "done") {
      pendingSamples.push(sample);
      if (historyState === "idle") electStartHistory(snap);
      return;
    }
    electApply(sample.t, sample.roles, sample.term);
    electPrune(sample.t);
    electRender(sample.t);
  }

  function electRender(now) {
    if (!lanes.length || historyState !== "done") return;
    const t0 = now - ELECT_WINDOW_MS;
    const xOf = function (t) {
      const v = ELECT_X0 + ((t - t0) / ELECT_WINDOW_MS) * (ELECT_X1 - ELECT_X0);
      return Math.max(ELECT_X0, Math.min(ELECT_X1, v));
    };
    const seg = function (a, b, y) {
      return "M" + r1(a) + " " + y + "H" + r1(b);
    };

    let marks = [];
    lanes.forEach(function (lane) {
      const d = { follower: "", candidate: "", inferred: "", leader: "" };
      const runs = lane.runs;
      runs.forEach(function (run, i) {
        // The newest run is still happening: it reaches the right edge.
        const end = i === runs.length - 1 ? Math.max(run.t1, now) : run.t1;
        if (end < t0) return;
        const a = xOf(run.t0);
        let b = xOf(end);

        if (run.role === "down") {
          if (i > 0 && run.t0 >= t0) marks.push({ x: a, y: lane.y });
          return;
        }
        if (run.role === "candidate") b = Math.min(ELECT_X1, Math.max(b, a + ELECT_MIN_SEG_PX));
        if (b > a) d[run.role] += seg(a, b, lane.y);

        if (run.inferredFrom != null && run.t0 >= t0) {
          const from = Math.max(ELECT_X0, Math.min(xOf(run.inferredFrom), a - ELECT_MIN_SEG_PX));
          if (a > from) d.inferred += seg(from, a, lane.y);
        }
      });
      lane.paths.follower.setAttribute("d", d.follower);
      lane.paths.candidate.setAttribute("d", d.candidate);
      lane.paths.leader.setAttribute("d", d.leader);
      lane.paths.inferred.setAttribute("d", d.inferred);
    });

    marks = marks.slice(-ELECT_MAX_MARKS);
    for (let i = 0; i < markPool.length; i++) {
      const m = marks[i];
      if (!m) {
        markPool[i].setAttribute("d", "");
        continue;
      }
      const s = 4;
      markPool[i].setAttribute(
        "d",
        "M" + r1(m.x - s) + " " + (m.y - s) + "L" + r1(m.x + s) + " " + (m.y + s) +
          "M" + r1(m.x - s) + " " + (m.y + s) + "L" + r1(m.x + s) + " " + (m.y - s)
      );
    }

    const shown = termMarks
      .filter(function (tm) {
        return tm.t >= t0;
      })
      .slice(-ELECT_MAX_TICKS);
    let lastLabelX = -Infinity;
    for (let i = 0; i < tickPool.length; i++) {
      const tick = shown[i];
      const slot = tickPool[i];
      if (!tick) {
        slot.line.setAttribute("visibility", "hidden");
        slot.label.setAttribute("visibility", "hidden");
        continue;
      }
      const x = xOf(tick.t);
      slot.line.setAttribute("x1", r1(x));
      slot.line.setAttribute("x2", r1(x));
      slot.line.setAttribute("visibility", "visible");
      // Under a storm the ticks crowd; keep every line, drop crowded labels.
      if (x - lastLabelX < ELECT_LABEL_GAP_PX) {
        slot.label.setAttribute("visibility", "hidden");
        continue;
      }
      lastLabelX = x;
      slot.label.setAttribute("x", r1(x));
      slot.label.textContent = "term " + tick.term;
      slot.label.setAttribute("visibility", "visible");
    }
  }

  // Keep the strip moving between frames, and while the stream reconnects.
  if (electSvg) {
    setInterval(function () {
      if (document.hidden) return;
      const now = Date.now();
      electPrune(now);
      electRender(now);
    }, ELECT_RENDER_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) electRender(Date.now());
    });
  }

  function setLive(live, text) {
    if (dotEl) dotEl.classList.toggle("is-live", !!live);
    if (statusEl) statusEl.textContent = text;
  }

  function renderHud(snap) {
    if (usersEl) usersEl.textContent = String(snap.activeUsers ?? 0);
    if (uptimeEl) uptimeEl.textContent = fmtUptime(snap.uptimeMs);
    if (sinceLossEl) {
      const ms = snap.sinceLastQuorumLossMs;
      sinceLossEl.textContent =
        ms == null || ms < 0 ? "never" : fmtUptime(ms);
    }
    if (writesEl) writesEl.textContent = fmtRate(snap.writesPerSec);
    if (readsEl) readsEl.textContent = fmtRate(snap.readsPerSec);
    if (hostCpuEl) hostCpuEl.textContent = fmtCpuPct(snap.hostCpuBusyPct);
    if (hostMemEl) {
      hostMemEl.textContent = fmtMemPair(
        snap.hostMemUsedBytes,
        snap.hostMemTotalBytes
      );
    }
    if (hudEl) hudEl.hidden = false;
  }

  /**
   * A machine that came back from the dead inside `withinMs`. The strip's
   * history already knows this, and it is the only reliable way to
   * say "this one is catching up".
   *
   * Why not just compare commit indexes: the control plane probes the seven
   * machines one at a time, so their commit indexes are not read at the same
   * instant, and the gap that opens is large and variable. Measured against
   * the live cluster on 2026-09-10, all seven healthy: the spread ran 1,977
   * to 4,496 entries, and the sort order was machine id ascending in every
   * sample. That is the probe order, not replication lag. A healed machine
   * measured 10,796 behind, which overlaps it. So the delta cannot detect
   * lag - it can only size it once something else has established there is
   * any, and a restart is that something else.
   */
  function recentlyBack(id, withinMs, now) {
    const lane = lanes[laneIds.indexOf(id)];
    if (!lane) return false;
    const runs = lane.runs;
    for (let i = runs.length - 1; i > 0; i--) {
      if (runs[i].t0 < now - withinMs) break;
      if (runs[i].role !== "down" && runs[i - 1].role === "down") return true;
    }
    return false;
  }

  /**
   * How far apart the machines that have been up all along are sitting. That
   * is the measurement's own noise floor, computed fresh every frame, so it
   * tracks the control plane whether it is idle or throttled.
   */
  function probeSpread(nodes, now) {
    const settled = nodes
      .filter((n) => !!n.running && !n.partitioned && n.commitIndex && !recentlyBack(n.id, 20000, now))
      .map((n) => Number(n.commitIndex));
    if (settled.length < 2) return Infinity;
    return Math.max.apply(null, settled) - Math.min.apply(null, settled);
  }

  function fmtBehind(n) {
    return n >= 1e5 ? fmtCount(n) : fmtExact(n);
  }

  function commitCell(n) {
    const commit = Number(n.commitIndex) || 0;
    if (!commit) return "<span>commit -</span>";
    return (
      '<span title="commit index ' + fmtExact(commit) + '">commit ' + fmtCount(commit) + "</span>"
    );
  }

  /**
   * Seven machines agreeing is the whole point of the demo, and a ten-digit
   * counter hides it. So the tile says whether this machine is with the pack.
   * "catching up" is claimed only for a machine that actually just restarted
   * and is further behind than the healthy machines are from each other:
   * see recentlyBack for why the gap alone proves nothing.
   */
  function syncCell(n, head, floor, now, alive) {
    const commit = Number(n.commitIndex) || 0;
    if (!alive || !commit || !head) return '<span class="raft-lab__node-sync">&nbsp;</span>';
    const behind = head - commit;
    if (recentlyBack(n.id, 20000, now) && behind > Math.max(floor * 1.5, 2000)) {
      return (
        '<span class="raft-lab__node-sync is-behind">catching up · ' +
        fmtBehind(behind) +
        " behind</span>"
      );
    }
    return '<span class="raft-lab__node-sync">in sync</span>';
  }

  function renderNodes(snap) {
    if (!nodesEl) return;
    const nodes = snap.nodes || [];
    const loss = !snap.quorum;
    const commits = nodes
      .filter((n) => !!n.running && !n.partitioned)
      .map((n) => Number(n.commitIndex) || 0);
    const head = commits.length ? Math.max.apply(null, commits) : 0;
    const now = Date.now();
    const floor = probeSpread(nodes, now);
    nodesEl.innerHTML = nodes
      .map((n) => {
        const alive = !!n.running && !n.partitioned;
        const role = !alive ? "down" : n.role || (n.isLeader ? "leader" : "follower");
        const isLeader = alive && (n.isLeader || n.id === snap.leaderId);
        const cls = [
          "raft-lab__node",
          isLeader ? "is-leader" : "",
          !alive ? "is-dead" : "",
          n.partitioned ? "is-partitioned" : "",
          loss ? "is-quorum-loss" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const quorumLine = loss
          ? '<div class="raft-lab__node-quorum">quorum loss!</div>'
          : "";
        return (
          '<div class="' +
          cls +
          '">' +
          '<div class="raft-lab__node-id">machine ' +
          n.id +
          (isLeader ? " · leader" : "") +
          "</div>" +
          quorumLine +
          '<div class="raft-lab__node-role">' +
          role +
          "</div>" +
          '<div class="raft-lab__node-meta">' +
          "<span>term " +
          (n.term || 0) +
          "</span>" +
          commitCell(n) +
          syncCell(n, head, floor, now, alive) +
          "</div>" +
          '<button type="button" class="raft-lab__kill" data-kill="' +
          n.id +
          '" ' +
          (alive ? "" : "disabled ") +
          ">kill</button>" +
          "</div>"
        );
      })
      .join("");
  }

  function applySnapshot(snap) {
    lastSnapshot = snap;
    renderHud(snap);
    electPush(snap);
    renderNodes(snap);
    if (!snap.quorum) {
      setLive(false, "no quorum · need 4 of 7 alive");
    } else {
      setLive(true, "live · term " + (snap.term || "?") + " · leader " + (snap.leaderId || "?"));
    }
  }

  /** One-shot JSON snapshot (same payload as SSE frames). */
  async function pullSnapshot() {
    try {
      const res = await fetch(API + "/nodes", { cache: "no-store" });
      if (!res.ok) return false;
      applySnapshot(await res.json());
      return true;
    } catch (_) {
      return false;
    }
  }

  let pollTimer = null;
  let sseAlive = false;

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(function () {
      pullSnapshot();
    }, 1000);
  }

  function stopPoll() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  function connect() {
    if (es) {
      es.close();
      es = null;
    }
    sseAlive = false;
    es = new EventSource(API + "/stream");
    es.onopen = function () {
      if (cooldownRemainingMs() <= 0) setToast("");
    };
    es.onmessage = function (ev) {
      sseAlive = true;
      stopPoll();
      try {
        applySnapshot(JSON.parse(ev.data));
      } catch (_) {
        /* ignore bad frames */
      }
    };
    es.onerror = function () {
      sseAlive = false;
      startPoll();
      setLive(false, lastSnapshot ? "reconnecting…" : "offline");
      if (hudEl) hudEl.hidden = false;
      if (!lastSnapshot && usersEl) usersEl.textContent = "-";
      es.close();
      es = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
    // Next rewrites sometimes buffer SSE; poll until the first frame lands.
    setTimeout(function () {
      if (!sseAlive) startPoll();
    }, 1200);
  }

  root.addEventListener("click", async function (ev) {
    const t = /** @type {HTMLElement} */ (ev.target);
    const btn = t.closest("[data-kill]");
    if (!btn || !(btn instanceof HTMLButtonElement)) return;
    const id = btn.getAttribute("data-kill");
    if (!id) return;

    const left = cooldownRemainingMs();
    if (left > 0) {
      setToast(formatCooldownWait(left), { cooldown: true });
      return;
    }
    if (killInFlight) return;

    killInFlight = true;
    setToast("killing machine " + id + "…");
    try {
      const res = await fetch(API + "/nodes/" + id + "/kill", { method: "POST" });
      const text = await res.text();
      if (res.status === 429) {
        const retry = parseRetryMs(text);
        startKillCooldown(retry != null ? retry : KILL_COOLDOWN_MS);
        return;
      }
      if (!res.ok) {
        setToast("kill failed");
        return;
      }
      setToast("machine " + id + " killed");
      startKillCooldown(KILL_COOLDOWN_MS);
    } catch (err) {
      setToast("kill failed: network error");
    } finally {
      killInFlight = false;
    }
  });

  // Offline shell until first snapshot (JSON or SSE).
  setLive(false, "connecting…");
  if (nodesEl) {
    nodesEl.innerHTML = Array.from({ length: 7 }, (_, i) => {
      const id = i + 1;
      return (
        '<div class="raft-lab__node">' +
        '<div class="raft-lab__node-id">machine ' +
        id +
        "</div>" +
        '<div class="raft-lab__node-role">…</div>' +
        '<div class="raft-lab__node-meta"><span>term -</span><span>commit -</span>' +
        '<span class="raft-lab__node-sync">&nbsp;</span></div>' +
        '<button type="button" class="raft-lab__kill" disabled>kill</button>' +
        "</div>"
      );
    }).join("");
  }
  pullSnapshot();
  connect();
})();
