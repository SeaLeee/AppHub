import { create } from 'zustand';
import type {
  AppRuntime,
  LogLine,
  RootDir,
  ScannedApp,
  Schedule,
} from '../../electron/shared/types';

interface HubState {
  apps: ScannedApp[];
  roots: RootDir[];
  schedules: Schedule[];
  runtime: Record<string, AppRuntime>;
  logs: Record<string, LogLine[]>;
  selectedAppId: string | null;
  search: string;
  category: string | null;
  tag: string | null;
  cardWidth: number;
  showHidden: boolean;

  init(): Promise<void>;
  setSelected(id: string | null): void;
  setSearch(s: string): void;
  setCategory(c: string | null): void;
  setTag(t: string | null): void;
  setCardWidth(w: number): void;
  setShowHidden(v: boolean): void;

  refreshApps(): Promise<void>;
  refreshRoots(): Promise<void>;
  refreshSchedules(): Promise<void>;

  addRoot(): Promise<void>;
  removeRoot(id: string): Promise<void>;
  toggleRoot(id: string): Promise<void>;

  launch(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  update(id: string, patch: Partial<ScannedApp>): Promise<void>;

  loadLogs(id: string): Promise<void>;
  clearLogs(id: string): Promise<void>;

  upsertSchedule(s: Schedule): Promise<void>;
  removeSchedule(id: string): Promise<void>;
}

const MAX_LOGS_PER_APP = 2000;

export const useHub = create<HubState>((set, get) => ({
  apps: [],
  roots: [],
  schedules: [],
  runtime: {},
  logs: {},
  selectedAppId: null,
  search: '',
  category: null,
  tag: null,
  cardWidth: 200,
  showHidden: false,

  async init() {
    await Promise.all([get().refreshRoots(), get().refreshApps(), get().refreshSchedules()]);
    const rts = await window.apphub.listRuntime();
    set({ runtime: Object.fromEntries(rts.map((r) => [r.id, r])) });

    window.apphub.onLog((line) => {
      set((s) => {
        const arr = s.logs[line.appId] ? [...s.logs[line.appId], line] : [line];
        if (arr.length > MAX_LOGS_PER_APP) arr.splice(0, arr.length - MAX_LOGS_PER_APP);
        return { logs: { ...s.logs, [line.appId]: arr } };
      });
    });
    window.apphub.onRuntime((rt) => {
      set((s) => ({ runtime: { ...s.runtime, [rt.id]: rt } }));
    });
    window.apphub.onAppsChanged(() => {
      get().refreshApps();
      get().refreshRoots();
    });
  },

  setSelected(id) {
    set({ selectedAppId: id });
    if (id) get().loadLogs(id);
  },
  setSearch(s) { set({ search: s }); },
  setCategory(c) { set({ category: c }); },
  setTag(t) { set({ tag: t }); },
  setCardWidth(w) { set({ cardWidth: w }); },
  setShowHidden(v) { set({ showHidden: v }); },

  async refreshApps() {
    const apps = await window.apphub.scanApps();
    set({ apps });
    const sel = get().selectedAppId;
    if (sel && !apps.find((a) => a.id === sel)) set({ selectedAppId: apps[0]?.id ?? null });
    if (!sel && apps.length > 0) set({ selectedAppId: apps[0].id });
  },
  async refreshRoots() {
    const roots = await window.apphub.listRoots();
    set({ roots });
  },
  async refreshSchedules() {
    const schedules = await window.apphub.listSchedules();
    set({ schedules });
  },

  async addRoot() {
    await window.apphub.addRoot();
    await get().refreshRoots();
    await get().refreshApps();
  },
  async removeRoot(id) {
    await window.apphub.removeRoot(id);
    await get().refreshRoots();
    await get().refreshApps();
  },
  async toggleRoot(id) {
    await window.apphub.toggleRoot(id);
    await get().refreshRoots();
    await get().refreshApps();
  },

  async launch(id) {
    const rt = await window.apphub.launchApp(id);
    set((s) => ({ runtime: { ...s.runtime, [id]: rt } }));
    await get().loadLogs(id);
  },
  async stop(id) {
    await window.apphub.stopApp(id);
  },
  async update(id, patch) {
    await window.apphub.updateApp(id, patch);
    await get().refreshApps();
  },

  async loadLogs(id) {
    const logs = await window.apphub.getLogs(id);
    set((s) => ({ logs: { ...s.logs, [id]: logs } }));
  },
  async clearLogs(id) {
    await window.apphub.clearLogs(id);
    set((s) => ({ logs: { ...s.logs, [id]: [] } }));
  },

  async upsertSchedule(s) {
    const list = await window.apphub.upsertSchedule(s);
    set({ schedules: list });
  },
  async removeSchedule(id) {
    const list = await window.apphub.removeSchedule(id);
    set({ schedules: list });
  },
}));
