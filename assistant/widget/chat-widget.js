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
  const GREETING = "hey! nice to see you here :)";

  const msgs = [];

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((m) => {
          if (
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string'
          ) {
            msgs.push({ role: m.role, content: m.content });
          }
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
    log.hidden = msgs.length === 0;
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
      inputEl.focus({ preventScroll: true });
      scrollLogToEnd();
      return;
    }

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: msgs }),
      });

      const data = /** @type {Record<string, unknown>} */ (
        await res.json().catch(() => ({}))
      );
      const reply =
        typeof data.reply === 'string'
          ? data.reply
          : res.ok
            ? '(no reply)'
            : 'sorry — something broke while talking to the server.';

      if (!res.ok) {
        msgs.push({
          role: 'assistant',
          content: reply,
        });
      } else {
        msgs.push({ role: 'assistant', content: reply });
      }
    } catch {
      msgs.push({
        role: 'assistant',
        content: 'offline or blocked network — reload after starting `npm run dev`.',
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
