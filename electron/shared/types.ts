export interface ScannedApp {
  /** stable id = hash of absolute script path */
  id: string;
  /** display name (user-overridable, defaults to folder name) */
  name: string;
  /** original folder name */
  folderName: string;
  /** absolute path to run script (run.bat / run.sh / run.command) */
  scriptPath: string;
  /** working directory (folder containing the script) */
  cwd: string;
  /** which root directory this app came from */
  rootDir: string;
  /** user category (e.g. "工具", "服务") */
  category?: string;
  /** user tags */
  tags: string[];
  /** display order */
  order: number;
  /** whether user pinned to top */
  pinned: boolean;
  /** how to launch: background (hidden, logs in AppHub UI) or terminal (visible terminal window) */
  launchMode: 'background' | 'terminal';
}

export interface RootDir {
  id: string;
  path: string;
  /** if false: skip scanning but keep config */
  enabled: boolean;
}

export type AppStatus = 'idle' | 'running' | 'exited' | 'error';

export interface AppRuntime {
  id: string;
  status: AppStatus;
  pid?: number;
  startedAt?: number;
  exitedAt?: number;
  exitCode?: number | null;
  cpu?: number; // percentage 0-100
  memory?: number; // bytes
}

export interface LogLine {
  appId: string;
  ts: number;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

export interface Schedule {
  id: string;
  appId: string;
  /** cron expression, e.g. "0 9 * * *" */
  cron: string;
  enabled: boolean;
  remark?: string;
}

export interface AppHubConfig {
  rootDirs: RootDir[];
  apps: Record<string, Partial<ScannedApp>>; // user overrides keyed by id
  schedules: Schedule[];
}

export const IPC = {
  // root dirs
  RootList: 'root:list',
  RootAdd: 'root:add',
  RootRemove: 'root:remove',
  RootToggle: 'root:toggle',
  // apps
  AppScan: 'app:scan',
  AppLaunch: 'app:launch',
  AppStop: 'app:stop',
  AppUpdate: 'app:update', // rename / category / tags
  AppListRuntime: 'app:listRuntime',
  // logs
  LogGet: 'log:get',
  LogClear: 'log:clear',
  // schedules
  ScheduleList: 'schedule:list',
  ScheduleUpsert: 'schedule:upsert',
  ScheduleRemove: 'schedule:remove',
  // events (main -> renderer)
  EvtLog: 'evt:log',
  EvtRuntime: 'evt:runtime',
  EvtAppsChanged: 'evt:appsChanged',
  // dialog
  DialogPickDir: 'dialog:pickDir',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
