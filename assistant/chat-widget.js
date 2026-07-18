(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__wikiAssistantBooted) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__wikiAssistantBooted = true;
  }

  /** Prime HttpOnly quota cookie (Phase A) — fire-and-forget before first POST. */
  fetch('/api/chat', { method: 'GET', credentials: 'same-origin' }).catch(() => {});

  const STORAGE_KEY = 'wiki-assistant-history-v2';
  /** Breakpoint matches `specs/feature-assistant-chat.md` responsive section + src/styles.css. */
  function isNarrowAssistantViewport() {
    return (
      typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 36rem)').matches
    );
  }

  function setNarrowOverlayPageLock(enabled) {
    const on = !!enabled && isNarrowAssistantViewport();
    document.documentElement.classList.toggle(
      'wiki-assistant-narrow-overlay-open',
      on,
    );
  }

  const GREETING = "hey! nice to see you here :)";

  const msgs = [];

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((m) => {
          if (
            !m ||
            (m.role !== 'user' && m.role !== 'assistant') ||
            typeof m.content !== 'string'
          ) {
            return;
          }
          const trimmed = m.content.trim();
          if (!trimmed) return;
          msgs.push({ role: m.role, content: trimmed });
        });
      }
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  if (msgs.length === 0) {
    msgs.push({ role: 'assistant', content: GREETING });
    persist();
  }

  function persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* ignore quota issues */
    }
  }

  const launcherShell = document.createElement('div');
  launcherShell.className = 'wiki-assistant wiki-assistant__launcher-shell';
  launcherShell.setAttribute('aria-label', "anush's agent");

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'wiki-assistant__launcher';
  launcher.textContent = "anush's agent";
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute(
    'aria-controls',
    'wiki-assistant-dialog',
  );

  const backdrop = document.createElement('div');
  backdrop.className = 'wiki-assistant__backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'wiki-assistant wiki-assistant__dialog';
  dialog.id = 'wiki-assistant-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'wiki-assistant-title');
  dialog.hidden = true;

  const title = document.createElement('h2');
  title.className = 'wiki-assistant__sr-title';
  title.id = 'wiki-assistant-title';
  title.textContent = "anush's agent";

  const log = document.createElement('div');
  log.className = 'wiki-assistant__log';
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  const form = document.createElement('form');
  form.className = 'wiki-assistant__form';
  form.noValidate = true;

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.id = 'wiki-assistant-message';
  inputEl.name = 'wiki-assistant-message';
  inputEl.className = 'wiki-assistant__input';
  inputEl.placeholder = 'type here!';
  inputEl.setAttribute(
    'aria-label',
    "message to anush's agent",
  );

  const status = document.createElement('div');
  status.className = 'wiki-assistant__status';
  status.textContent = '';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');

  const row = document.createElement('div');
  row.className = 'wiki-assistant__toolbar';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'wiki-assistant__send';
  sendBtn.textContent = 'send';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'wiki-assistant__close';
  closeBtn.textContent = 'close';

  row.append(closeBtn, sendBtn);

  const compose = document.createElement('div');
  compose.className = 'wiki-assistant__compose';
  compose.append(inputEl, row);

  form.append(compose);
  dialog.append(title, log, status, form);

  launcherShell.appendChild(launcher);

  /** Prefer `#wiki-agent-mount`; class fallback matches static html if id is stripped. */
  function attachLauncherToDom() {
    const mountEl =
      document.getElementById('wiki-agent-mount')
      ?? document.querySelector('.site-chrome__assistant-host');

    if (mountEl) {
      launcherShell.classList.remove('wiki-assistant__launcher-shell--floating');
      mountEl.appendChild(launcherShell);
    } else {
      launcherShell.classList.add('wiki-assistant__launcher-shell--floating');
      document.body.appendChild(launcherShell);
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
  }

  function boot() {
    attachLauncherToDom();

    const mqAssistNarrow =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 36rem)')
        : null;

    if (mqAssistNarrow?.addEventListener) {
      mqAssistNarrow.addEventListener('change', () =>
        setNarrowOverlayPageLock(dialog.hidden !== true),
      );
    } else if (mqAssistNarrow && typeof mqAssistNarrow.addListener === 'function') {
      mqAssistNarrow.addListener(() =>
        setNarrowOverlayPageLock(dialog.hidden !== true),
      );
    }

    rerenderTranscript();
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#039;';
        default:
          return ch;
      }
    });
  }

  function scrollLogToEnd() {
    requestAnimationFrame(() => {
      log.scrollTop = log.scrollHeight;
      requestAnimationFrame(() => {
        log.scrollTop = log.scrollHeight;
        const lastTurn = log.querySelector(
          '.wiki-assistant__turn:last-of-type',
        );
        if (lastTurn) {
          lastTurn.scrollIntoView({ block: 'end', behavior: 'auto' });
        }
      });
    });
  }

  function rerenderTranscript() {
    const hasVisibleTurns = msgs.some((m) => m.content.trim());
    log.hidden = !hasVisibleTurns;
    log.innerHTML = '';

    msgs.forEach((m) => {
      const line = document.createElement('p');
      line.className =
        'wiki-assistant__turn wiki-assistant__turn--' + m.role;
      const label = document.createElement('strong');
      label.className = 'wiki-assistant__turn-label';
      label.textContent =
        m.role === 'user' ? 'you' : "anush's agent";
      const body = document.createElement('span');
      body.innerHTML = escapeHtml(m.content).replace(/\n/g, '<br/>');
      line.append(label, document.createElement('br'), body);
      log.appendChild(line);
    });
    scrollLogToEnd();
  }

  function toggle(open) {
    const willOpen =
      typeof open === 'boolean' ? open : dialog.hidden === true;

    launcher.setAttribute(
      'aria-expanded',
      willOpen ? 'true' : 'false',
    );
    dialog.hidden = !willOpen;
    backdrop.hidden = !willOpen;

    if (willOpen) {
      setNarrowOverlayPageLock(true);
      rerenderTranscript();
      inputEl.focus({ preventScroll: true });
      scrollLogToEnd();
      return;
    }

    setNarrowOverlayPageLock(false);
    launcher.focus({ preventScroll: true });
  }

  launcher.addEventListener('click', () => toggle());

  backdrop.addEventListener('click', () => toggle(false));

  closeBtn.addEventListener('click', () => toggle(false));

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || dialog.hidden) return;
    ev.preventDefault();
    toggle(false);
  });

  /**
   * One retry on 502/504 — provider or edge timeouts often succeed on a second try;
   * route releases quota on failed inference so this does not double-count caps.
   */
  async function postChatWithRetry(payload) {
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    };
    let res = await fetch('/api/chat', opts);
    if (res.status === 502 || res.status === 504) {
      await new Promise((r) => setTimeout(r, 650));
      res = await fetch('/api/chat', opts);
    }
    return res;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    msgs.push({ role: 'user', content: text });
    persist();
    rerenderTranscript();

    sendBtn.disabled = true;
    status.hidden = false;
    status.textContent = 'thinking…';
    scrollLogToEnd();

    try {
      const res = await postChatWithRetry({ messages: msgs });
      const raw = await res.text().catch(() => '');
      /** @type {Record<string, unknown>} */
      let data = {};
      try {
        data = JSON.parse(raw || '{}');
      } catch {
        data = {};
      }

      /** Trust server `reply` on success. On errors, prefer server copy; never invent stacks. */
      const trimmed =
        typeof data.reply === 'string' ? data.reply.trim() : '';
      let reply = trimmed;

      if (!reply) {
        if (res.ok) {
          reply = 'the assistant returned an empty answer. try asking again.';
        } else if (res.status === 403) {
          reply =
            'this assistant needs first-party cookies for fair daily limits. allow cookies for this site, reload, then try again.';
        } else if (res.status === 429) {
          reply =
            'you have reached the daily limit for this assistant. try again after midnight utc.';
        } else if (res.status === 502 || res.status === 504) {
          reply = 'the model is busy right now. try again in a moment.';
        } else if (res.status === 503) {
          reply = 'the assistant is temporarily offline.';
        } else {
          reply = 'the assistant hit a snag. reload and try again.';
        }
      }

      msgs.push({ role: 'assistant', content: reply });
    } catch {
      msgs.push({
        role: 'assistant',
        content: 'could not reach the assistant. check your connection and try again.',
      });
    }

    persist();
    rerenderTranscript();

    sendBtn.disabled = false;
    status.textContent = '';
    status.hidden = true;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
