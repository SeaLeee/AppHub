import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import crypto from 'node:crypto';
import { store } from './store';
import { scanAll } from './scanner';
import { processManager } from './processManager';
import {
  reloadSchedules,
  listSchedules,
  upsertSchedule,
  removeSchedule,
} from './scheduler';
import { IPC } from '../shared/types';
import type { RootDir, ScannedApp, Schedule } from '../shared/types';

// dist-electron/main/index.js  ->  project root
const ROOT = path.join(__dirname, '../..');
const PRELOAD = path.join(ROOT, 'dist-electron/preload/index.js');
const RENDERER_DIST = path.join(ROOT, 'dist');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // forward main-process events to renderer
  processManager.on('log', (line) => {
    mainWindow?.webContents.send(IPC.EvtLog, line);
  });
  processManager.on('runtime', (rt) => {
    mainWindow?.webContents.send(IPC.EvtRuntime, rt);
  });
}

function registerIpc(): void {
  // ---- root dirs ----
  ipcMain.handle(IPC.RootList, () => store.get('rootDirs', []) as RootDir[]);

  ipcMain.handle(IPC.RootAdd, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择要扫描的根目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return store.get('rootDirs', []) as RootDir[];
    }
    const list = (store.get('rootDirs', []) as RootDir[]) || [];
    for (const p of result.filePaths) {
      if (list.some((x) => x.path === p)) continue;
      list.push({ id: crypto.randomUUID(), path: p, enabled: true });
    }
    store.set('rootDirs', list);
    mainWindow?.webContents.send(IPC.EvtAppsChanged);
    return list;
  });

  ipcMain.handle(IPC.RootRemove, (_e, id: string) => {
    const list = ((store.get('rootDirs', []) as RootDir[]) || []).filter((x) => x.id !== id);
    store.set('rootDirs', list);
    mainWindow?.webContents.send(IPC.EvtAppsChanged);
    return list;
  });

  ipcMain.handle(IPC.RootToggle, (_e, id: string) => {
    const list = ((store.get('rootDirs', []) as RootDir[]) || []).map((x) =>
      x.id === id ? { ...x, enabled: !x.enabled } : x,
    );
    store.set('rootDirs', list);
    mainWindow?.webContents.send(IPC.EvtAppsChanged);
    return list;
  });

  // ---- apps ----
  ipcMain.handle(IPC.AppScan, async () => {
    return scanAll();
  });

  ipcMain.handle(IPC.AppLaunch, async (_e, id: string) => {
    const apps = await scanAll();
    const app = apps.find((a) => a.id === id);
    if (!app) throw new Error('App not found: ' + id);
    return processManager.launch(app);
  });

  ipcMain.handle(IPC.AppStop, (_e, id: string) => processManager.stop(id));

  ipcMain.handle(IPC.AppUpdate, (_e, id: string, patch: Partial<ScannedApp>) => {
    const overrides = (store.get('apps', {}) as Record<string, Partial<ScannedApp>>) || {};
    overrides[id] = { ...(overrides[id] || {}), ...patch };
    store.set('apps', overrides);
    mainWindow?.webContents.send(IPC.EvtAppsChanged);
    return overrides[id];
  });

  ipcMain.handle(IPC.AppListRuntime, () => processManager.listRuntime());

  // ---- logs ----
  ipcMain.handle(IPC.LogGet, (_e, id: string) => processManager.getLogs(id));
  ipcMain.handle(IPC.LogClear, (_e, id: string) => {
    processManager.clearLogs(id);
    return true;
  });

  // ---- schedules ----
  ipcMain.handle(IPC.ScheduleList, () => listSchedules());
  ipcMain.handle(IPC.ScheduleUpsert, (_e, s: Schedule) => upsertSchedule(s));
  ipcMain.handle(IPC.ScheduleRemove, (_e, id: string) => removeSchedule(id));

  // ---- dialog helpers ----
  ipcMain.handle(IPC.DialogPickDir, async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });

  // expose: reveal in folder
  ipcMain.handle('shell:reveal', (_e, p: string) => shell.showItemInFolder(p));
}

app.whenReady().then(() => {
  registerIpc();
  reloadSchedules();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  processManager.dispose();
});
