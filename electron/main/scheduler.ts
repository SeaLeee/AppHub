import cron, { ScheduledTask } from 'node-cron';
import { store } from './store';
import { processManager } from './processManager';
import { scanAll } from './scanner';
import type { Schedule } from '../shared/types';

const tasks = new Map<string, ScheduledTask>();

async function runApp(appId: string): Promise<void> {
  const apps = await scanAll();
  const app = apps.find((a) => a.id === appId);
  if (app) processManager.launch(app);
}

export function reloadSchedules(): void {
  for (const [, t] of tasks) t.stop();
  tasks.clear();

  const list = (store.get('schedules', []) as Schedule[]) || [];
  for (const s of list) {
    if (!s.enabled) continue;
    if (!cron.validate(s.cron)) continue;
    const task = cron.schedule(s.cron, () => {
      runApp(s.appId).catch(() => undefined);
    });
    tasks.set(s.id, task);
  }
}

export function listSchedules(): Schedule[] {
  return (store.get('schedules', []) as Schedule[]) || [];
}

export function upsertSchedule(s: Schedule): Schedule[] {
  const list = listSchedules();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.push(s);
  store.set('schedules', list);
  reloadSchedules();
  return list;
}

export function removeSchedule(id: string): Schedule[] {
  const list = listSchedules().filter((x) => x.id !== id);
  store.set('schedules', list);
  reloadSchedules();
  return list;
}
