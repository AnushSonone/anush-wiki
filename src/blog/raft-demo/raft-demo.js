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

  function renderNodes(snap) {
    if (!nodesEl) return;
    const nodes = snap.nodes || [];
    const loss = !snap.quorum;
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
          "<span>commit " +
          (n.commitIndex || 0) +
          "</span>" +
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
        '<div class="raft-lab__node-meta"><span>term -</span><span>commit -</span></div>' +
        '<button type="button" class="raft-lab__kill" disabled>kill</button>' +
        "</div>"
      );
    }).join("");
  }
  pullSnapshot();
  connect();
})();
