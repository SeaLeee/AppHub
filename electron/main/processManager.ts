import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import pidusage from 'pidusage';
import type { AppRuntime, LogLine, ScannedApp } from '../shared/types';

interface RunningEntry {
  app: ScannedApp;
  proc: ChildProcess;
  startedAt: number;
  status: 'running' | 'exited' | 'error';
  exitCode?: number | null;
  exitedAt?: number;
  cpu?: number;
  memory?: number;
  terminalMode?: boolean;
}

const MAX_LOG_LINES = 2000;

export class ProcessManager extends EventEmitter {
  private running = new Map<string, RunningEntry>();
  private logs = new Map<string, LogLine[]>();
  private monitorTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startMonitor();
  }

  isRunning(id: string): boolean {
    const e = this.running.get(id);
    return !!e && e.status === 'running';
  }

  launch(app: ScannedApp): AppRuntime {
    if (this.isRunning(app.id)) {
      return this.runtimeOf(app.id)!;
    }

    // Project-type apps: open with associated application (e.g. Xcode for .xcodeproj)
    if (app.kind === 'project') {
      return this.launchProject(app);
    }

    if (app.launchMode === 'terminal') {
      return this.launchTerminal(app);
    }

    return this.launchBackground(app);
  }

  private launchProject(app: ScannedApp): AppRuntime {
    let cmd: string;
    let args: string[];

    if (process.platform === 'darwin') {
      cmd = 'open';
      args = [app.scriptPath];
    } else if (process.platform === 'win32') {
      cmd = process.env.ComSpec || 'cmd.exe';
      args = ['/c', 'start', '', app.scriptPath];
    } else {
      cmd = 'xdg-open';
      args = [app.scriptPath];
    }

    this.pushLog(app.id, 'system', `[project] 打开工程: ${app.scriptPath}`);

    let proc: ChildProcess;
    try {
      proc = spawn(cmd, args, { cwd: app.cwd, env: { ...process.env }, shell: false });
    } catch (err) {
      this.pushLog(app.id, 'system', `[error] 打开失败: ${(err as Error).message}`);
      const rt: AppRuntime = { id: app.id, status: 'error' };
      this.emit('runtime', rt);
      return rt;
    }

    const entry: RunningEntry = {
      app,
      proc,
      startedAt: Date.now(),
      status: 'running',
    };
    this.running.set(app.id, entry);
    this.pushLog(app.id, 'system', '[project] 已用关联应用打开');

    // 'open' returns immediately after launching the app; mark as exited briefly
    proc.on('exit', (code) => {
      entry.status = 'exited';
      entry.exitCode = code;
      entry.exitedAt = Date.now();
      this.pushLog(app.id, 'system', code === 0 ? '[project] 已打开' : `[project] 退出 code=${code}`);
      this.emitRuntime(app.id);
    });

    proc.on('error', (err) => {
      this.pushLog(app.id, 'system', `[error] ${err.message}`);
      entry.status = 'error';
      this.emitRuntime(app.id);
    });

    this.emitRuntime(app.id);
    return this.runtimeOf(app.id)!;
  }

  private launchTerminal(app: ScannedApp): AppRuntime {
    let cmd: string;
    let args: string[];

    if (process.platform === 'darwin') {
      const escapedScript = app.scriptPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedCwd = app.cwd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      cmd = 'osascript';
      args = [
        '-e',
        `tell app "Terminal" to do script "cd \\"${escapedCwd}\\" && sh \\"${escapedScript}\\"; exit"`,
      ];
    } else if (process.platform === 'win32') {
      cmd = process.env.ComSpec || 'cmd.exe';
      args = ['/c', 'start', '"AppHub"', 'cmd', '/c', `"${app.scriptPath}"`, '&', 'pause'];
    } else {
      cmd = 'sh';
      args = ['-c', 'if command -v gnome-terminal >/dev/null; then gnome-terminal -- bash -c "cd \\"$1\\" && sh \\"$2\\"; exec bash"; elif command -v xterm >/dev/null; then xterm -e "cd \\"$1\\" && sh \\"$2\\"; exec bash"; elif command -v x-terminal-emulator >/dev/null; then x-terminal-emulator -e "cd \\"$1\\" && sh \\"$2\\"; exec bash"; else echo "No terminal emulator found"; fi', '_', app.cwd, app.scriptPath];
    }

    this.pushLog(app.id, 'system', `[terminal] 在外部终端中启动`);

    let proc: ChildProcess;
    try {
      proc = spawn(cmd, args, { cwd: app.cwd, env: { ...process.env }, shell: false });
    } catch (err) {
      this.pushLog(app.id, 'system', `[error] 终端启动失败: ${(err as Error).message}`);
      const rt: AppRuntime = { id: app.id, status: 'error' };
      this.emit('runtime', rt);
      return rt;
    }

    const entry: RunningEntry = {
      app,
      proc,
      startedAt: Date.now(),
      status: 'running',
      terminalMode: true,
    };
    this.running.set(app.id, entry);
    this.pushLog(app.id, 'system', '[terminal] 终端窗口已打开，AppHub 显示为运行中');

    proc.on('exit', (code) => {
      this.pushLog(app.id, 'system', `[terminal] 启动器进程已退出 (code=${code})，应用在终端中独立运行`);
    });

    proc.on('error', (err) => {
      this.pushLog(app.id, 'system', `[error] ${err.message}`);
      entry.status = 'error';
      this.emitRuntime(app.id);
    });

    this.emitRuntime(app.id);
    return this.runtimeOf(app.id)!;
  }

  private launchBackground(app: ScannedApp): AppRuntime {
    const ext = path.extname(app.scriptPath).toLowerCase();
    let cmd: string;
    let args: string[];

    if (process.platform === 'win32') {
      if (ext === '.bat' || ext === '.cmd') {
        cmd = process.env.ComSpec || 'cmd.exe';
        args = ['/c', app.scriptPath];
      } else {
        cmd = 'bash';
        args = [app.scriptPath];
      }
    } else {
      if (ext === '.bat' || ext === '.cmd') {
        this.pushLog(app.id, 'system', `[warn] .bat 在非 Windows 平台无法直接执行`);
        cmd = 'sh';
        args = [app.scriptPath];
      } else {
        cmd = 'sh';
        args = [app.scriptPath];
      }
    }

    let proc: ChildProcess;
    try {
      proc = spawn(cmd, args, {
        cwd: app.cwd,
        env: { ...process.env },
        windowsHide: true,
        shell: false,
      });
    } catch (err) {
      this.pushLog(app.id, 'system', `[error] 启动失败: ${(err as Error).message}`);
      const rt: AppRuntime = { id: app.id, status: 'error' };
      this.emit('runtime', rt);
      return rt;
    }

    const entry: RunningEntry = {
      app,
      proc,
      startedAt: Date.now(),
      status: 'running',
    };
    this.running.set(app.id, entry);
    this.pushLog(app.id, 'system', `[start] PID ${proc.pid} — ${cmd} ${args.join(' ')}`);

    proc.stdout?.setEncoding('utf8');
    proc.stderr?.setEncoding('utf8');
    proc.stdout?.on('data', (chunk: string) => this.handleChunk(app.id, 'stdout', chunk));
    proc.stderr?.on('data', (chunk: string) => this.handleChunk(app.id, 'stderr', chunk));

    proc.on('error', (err) => {
      this.pushLog(app.id, 'system', `[error] ${err.message}`);
      entry.status = 'error';
      this.emitRuntime(app.id);
    });

    proc.on('exit', (code) => {
      entry.status = 'exited';
      entry.exitCode = code;
      entry.exitedAt = Date.now();
      this.pushLog(app.id, 'system', `[exit] code=${code}`);
      this.emitRuntime(app.id);
    });

    this.emitRuntime(app.id);
    return this.runtimeOf(app.id)!;
  }

  stop(id: string): boolean {
    const e = this.running.get(id);
    if (!e || e.status !== 'running') return false;

    if (e.terminalMode) {
      e.status = 'exited';
      e.exitedAt = Date.now();
      this.pushLog(id, 'system', '[stop] 终端模式 — 已清除运行状态（终端窗口需手动关闭）');
      this.emitRuntime(id);
      return true;
    }

    try {
      if (process.platform === 'win32' && e.proc.pid) {
        spawn('taskkill', ['/PID', String(e.proc.pid), '/T', '/F']);
      } else {
        e.proc.kill('SIGTERM');
        setTimeout(() => {
          if (e.status === 'running') {
            try { e.proc.kill('SIGKILL'); } catch { /* ignore */ }
          }
        }, 3000);
      }
      this.pushLog(id, 'system', '[stop] requested');
      return true;
    } catch (err) {
      this.pushLog(id, 'system', `[stop:error] ${(err as Error).message}`);
      return false;
    }
  }

  getLogs(id: string): LogLine[] {
    return this.logs.get(id) ?? [];
  }

  clearLogs(id: string): void {
    this.logs.set(id, []);
  }

  listRuntime(): AppRuntime[] {
    return Array.from(this.running.keys()).map((id) => this.runtimeOf(id)!).filter(Boolean);
  }

  runtimeOf(id: string): AppRuntime | null {
    const e = this.running.get(id);
    if (!e) return null;
    return {
      id,
      status: e.status,
      pid: e.proc.pid,
      startedAt: e.startedAt,
      exitedAt: e.exitedAt,
      exitCode: e.exitCode ?? null,
      cpu: e.cpu,
      memory: e.memory,
    };
  }

  private handleChunk(id: string, stream: 'stdout' | 'stderr', chunk: string): void {
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      if (line.length === 0) continue;
      this.pushLog(id, stream, line);
    }
  }

  private pushLog(id: string, stream: LogLine['stream'], text: string): void {
    const arr = this.logs.get(id) ?? [];
    const entry: LogLine = { appId: id, ts: Date.now(), stream, text };
    arr.push(entry);
    if (arr.length > MAX_LOG_LINES) arr.splice(0, arr.length - MAX_LOG_LINES);
    this.logs.set(id, arr);
    this.emit('log', entry);
  }

  private emitRuntime(id: string): void {
    const rt = this.runtimeOf(id);
    if (rt) this.emit('runtime', rt);
  }

  private startMonitor(): void {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(async () => {
      const cpuCount = os.cpus().length || 1;
      const pidToId = new Map<number, string>();
      for (const [id, e] of this.running) {
        if (e.terminalMode) continue;
        if (e.status === 'running' && e.proc.pid) pidToId.set(e.proc.pid, id);
      }
      if (pidToId.size === 0) return;
      try {
        const stats = await pidusage(Array.from(pidToId.keys()));
        for (const [pidStr, s] of Object.entries(stats)) {
          if (!s) continue;
          const id = pidToId.get(Number(pidStr));
          if (!id) continue;
          const e = this.running.get(id);
          if (!e) continue;
          e.cpu = Math.min(100, s.cpu / cpuCount);
          e.memory = s.memory;
          this.emitRuntime(id);
        }
      } catch {
        /* ignore */
      }
    }, 1500);
  }

  dispose(): void {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    for (const [id] of this.running) this.stop(id);
  }
}

export const processManager = new ProcessManager();
