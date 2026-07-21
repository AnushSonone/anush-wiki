/**
 * Live dashboard for anush.wiki/blog/raft.
 * Talks to the control plane via same-origin /api/raft/* (Next rewrite).
 */
(function () {
  "use strict";

  const KILL_COOLDOWN_MS = 2000;
  // Auto-heal (~10s) can restore quorum in under a second after a kill streak;
  // keep the banner visible long enough to notice.
  const QUORUM_LOSS_HOLD_MS = 6000;

  const root = document.getElementById("raft-lab");
  if (!root) return;

  const API = (root.getAttribute("data-api-base") || "/api/raft").replace(/\/$/, "");
  const nodesEl = root.querySelector("[data-nodes]");
  const toastEl = root.querySelector("[data-toast]");
  const statusEl = root.querySelector("[data-status-text]");
  const dotEl = root.querySelector("[data-status-dot]");
  const usersEl = root.querySelector("[data-users]");
  const uptimeEl = root.querySelector("[data-uptime]");
  const writesEl = root.querySelector("[data-writes]");
  const readsEl = root.querySelector("[data-reads]");
  const hudEl = root.querySelector("[data-hud]");

  let lastSnapshot = null;
  let es = null;
  let reconnectTimer = null;
  let killReadyAt = 0;
  let cooldownTimer = null;
  let killInFlight = false;
  let quorumLossUntil = 0;
  let quorumHoldTimer = null;

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

  function setLive(live, text) {
    if (dotEl) dotEl.classList.toggle("is-live", !!live);
    if (statusEl) statusEl.textContent = text;
  }

  function renderHud(snap) {
    if (usersEl) usersEl.textContent = String(snap.activeUsers ?? 0);
    if (uptimeEl) uptimeEl.textContent = fmtUptime(snap.uptimeMs);
    if (writesEl) writesEl.textContent = fmtRate(snap.writesPerSec);
    if (readsEl) readsEl.textContent = fmtRate(snap.readsPerSec);
    if (hudEl) hudEl.hidden = false;
  }

  function quorumLossActive(snap) {
    return !snap.quorum || Date.now() < quorumLossUntil;
  }

  function renderNodes(snap) {
    if (!nodesEl) return;
    const nodes = snap.nodes || [];
    const loss = quorumLossActive(snap);
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

    if (!snap.quorum) {
      quorumLossUntil = Date.now() + QUORUM_LOSS_HOLD_MS;
      if (quorumHoldTimer) clearTimeout(quorumHoldTimer);
      quorumHoldTimer = setTimeout(function () {
        quorumHoldTimer = null;
        if (lastSnapshot && lastSnapshot.quorum && Date.now() >= quorumLossUntil) {
          renderNodes(lastSnapshot);
          setLive(
            true,
            "live · term " + (lastSnapshot.term || "?") + " · leader " + (lastSnapshot.leaderId || "?")
          );
        }
      }, QUORUM_LOSS_HOLD_MS + 50);
    }

    renderNodes(snap);

    if (quorumLossActive(snap)) {
      setLive(false, "no quorum · need 4 of 7 alive");
    } else {
      setLive(true, "live · term " + (snap.term || "?") + " · leader " + (snap.leaderId || "?"));
    }
  }

  function connect() {
    if (es) {
      es.close();
      es = null;
    }
    es = new EventSource(API + "/stream");
    es.onopen = function () {
      if (cooldownRemainingMs() <= 0) setToast("");
    };
    es.onmessage = function (ev) {
      try {
        applySnapshot(JSON.parse(ev.data));
      } catch (_) {
        /* ignore bad frames */
      }
    };
    es.onerror = function () {
      setLive(false, "offline");
      if (hudEl) hudEl.hidden = false;
      if (usersEl) usersEl.textContent = "-";
      es.close();
      es = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
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

  // Offline shell until first SSE frame.
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
  connect();
})();
