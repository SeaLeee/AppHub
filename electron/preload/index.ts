import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';
import type {
  AppRuntime,
  LogLine,
  RootDir,
  ScannedApp,
  Schedule,
} from '../shared/types';

const api = {
  // root dirs
  listRoots: (): Promise<RootDir[]> => ipcRenderer.invoke(IPC.RootList),
  addRoot: (): Promise<RootDir[]> => ipcRenderer.invoke(IPC.RootAdd),
  removeRoot: (id: string): Promise<RootDir[]> => ipcRenderer.invoke(IPC.RootRemove, id),
  toggleRoot: (id: string): Promise<RootDir[]> => ipcRenderer.invoke(IPC.RootToggle, id),
  // apps
  scanApps: (): Promise<ScannedApp[]> => ipcRenderer.invoke(IPC.AppScan),
  launchApp: (id: string): Promise<AppRuntime> => ipcRenderer.invoke(IPC.AppLaunch, id),
  stopApp: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.AppStop, id),
  updateApp: (id: string, patch: Partial<ScannedApp>): Promise<Partial<ScannedApp>> =>
    ipcRenderer.invoke(IPC.AppUpdate, id, patch),
  listRuntime: (): Promise<AppRuntime[]> => ipcRenderer.invoke(IPC.AppListRuntime),
  // logs
  getLogs: (id: string): Promise<LogLine[]> => ipcRenderer.invoke(IPC.LogGet, id),
  clearLogs: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.LogClear, id),
  // schedules
  listSchedules: (): Promise<Schedule[]> => ipcRenderer.invoke(IPC.ScheduleList),
  upsertSchedule: (s: Schedule): Promise<Schedule[]> => ipcRenderer.invoke(IPC.ScheduleUpsert, s),
  removeSchedule: (id: string): Promise<Schedule[]> => ipcRenderer.invoke(IPC.ScheduleRemove, id),
  // shell
  reveal: (p: string): Promise<void> => ipcRenderer.invoke('shell:reveal', p),

  // events
  onLog: (cb: (line: LogLine) => void) => {
    const h = (_e: unknown, line: LogLine) => cb(line);
    ipcRenderer.on(IPC.EvtLog, h);
    return () => ipcRenderer.off(IPC.EvtLog, h);
  },
  onRuntime: (cb: (rt: AppRuntime) => void) => {
    const h = (_e: unknown, rt: AppRuntime) => cb(rt);
    ipcRenderer.on(IPC.EvtRuntime, h);
    return () => ipcRenderer.off(IPC.EvtRuntime, h);
  },
  onAppsChanged: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on(IPC.EvtAppsChanged, h);
    return () => ipcRenderer.off(IPC.EvtAppsChanged, h);
  },
};

contextBridge.exposeInMainWorld('apphub', api);

export type AppHubApi = typeof api;
