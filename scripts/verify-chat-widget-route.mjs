#!/usr/bin/env node
/**
 * Production-parity check: clean build, confirm public/ has no chat-widget.js,
 * then GET /api/chat/widget from next start returns 200 + JS body.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.join(fileURLToPath(new URL('..', import.meta.url)));
const pubWidget = path.join(root, 'public', 'chat-widget.js');
const port = process.env.VERIFY_CHAT_WIDGET_PORT ?? '47991';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd: root,
      stdio: opts.stdio ?? 'inherit',
      env: { ...process.env, ...opts.env },
    });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
    return p;
  });
}

async function waitForReady(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.ok || r.status === 304) return;
    } catch {
      /* cool down */
    }
    await delay(250);
  }
  throw new Error(`never became ready: ${url}`);
}

async function main() {
  console.warn('[verify-chat-widget] root:', root);
  await fs.rm(path.join(root, '.next'), { recursive: true, force: true });
  await fs.rm(path.join(root, 'public'), { recursive: true, force: true });

  console.warn('[verify-chat-widget] npm run build…');
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    stdio: 'inherit',
  });

  try {
    await fs.access(pubWidget);
    console.error('[verify-chat-widget] FAIL: public/chat-widget.js exists — sync must not copy the widget.');
    process.exit(1);
  } catch {
    console.warn('[verify-chat-widget] OK: no public/chat-widget.js');
  }

  console.warn('[verify-chat-widget] next start', port, '…');
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'start', '-p', port], {
    cwd: root,
    stdio: 'ignore',
    env: process.env,
  });

  const kill = () => {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  };
  process.on('SIGINT', () => {
    kill();
    process.exit(130);
  });

  try {
    await waitForReady(`http://127.0.0.1:${port}/`);
    const res = await fetch(`http://127.0.0.1:${port}/api/chat/widget`);
    const text = await res.text();
    if (!res.ok) {
      console.error('[verify-chat-widget] FAIL: HTTP', res.status, text.slice(0, 200));
      process.exit(1);
    }
    if (!text.includes('wiki-assistant')) {
      console.error('[verify-chat-widget] FAIL: body missing expected marker wiki-assistant');
      console.error(text.slice(0, 300));
      process.exit(1);
    }
    console.warn('[verify-chat-widget] PASS:', res.status, 'bytes=', text.length);
  } finally {
    kill();
    await delay(500);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
