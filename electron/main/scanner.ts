import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { store } from './store';
import type { ScannedApp } from '../shared/types';

const SCRIPT_CANDIDATES = [
  'run.command',
  'start.command',
  'run.sh',
  'start.sh',
  'launch.sh',
  'run.bat',
  'start.bat',
  'run.cmd',
  'start.cmd',
];

function hashId(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 12);
}

async function findScriptInDir(dir: string): Promise<string | null> {
  for (const name of SCRIPT_CANDIDATES) {
    const p = path.join(dir, name);
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      /* not found */
    }
  }
  return null;
}

/** Scan one root: each immediate sub-directory containing a run.* script becomes an app. */
async function scanRoot(rootDir: string): Promise<ScannedApp[]> {
  const result: ScannedApp[] = [];
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return result;
  }

  // Also include rootDir itself if it directly contains a run script
  const rootScript = await findScriptInDir(rootDir);
  if (rootScript) {
    result.push(buildApp(rootScript, rootDir, rootDir, path.basename(rootDir)));
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.')) continue;
    const sub = path.join(rootDir, e.name);
    const script = await findScriptInDir(sub);
    if (script) {
      result.push(buildApp(script, sub, rootDir, e.name));
    }
  }
  return result;
}

function buildApp(
  scriptPath: string,
  cwd: string,
  rootDir: string,
  folderName: string,
): ScannedApp {
  return {
    id: hashId(scriptPath),
    name: folderName,
    folderName,
    scriptPath,
    cwd,
    rootDir,
    tags: [],
    order: 0,
    pinned: false,
    launchMode: 'background',
    hidden: false,
  };
}

export async function scanAll(): Promise<ScannedApp[]> {
  const roots = (store.get('rootDirs', []) as { path: string; enabled: boolean }[]).filter(
    (r) => r.enabled,
  );
  const overrides = (store.get('apps', {}) as Record<string, Partial<ScannedApp>>) || {};

  const all: ScannedApp[] = [];
  for (const r of roots) {
    const items = await scanRoot(r.path);
    all.push(...items);
  }

  // dedupe by id (script path)
  const seen = new Set<string>();
  const out: ScannedApp[] = [];
  for (const a of all) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    const ov = overrides[a.id];
    out.push(ov ? { ...a, ...ov, id: a.id, scriptPath: a.scriptPath, cwd: a.cwd } : a);
  }

  // sort: pinned first, then by user order, then by name
  out.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
    return a.name.localeCompare(b.name);
  });
  return out;
}
