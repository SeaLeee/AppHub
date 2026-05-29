import { useEffect, useMemo, useRef, useState } from 'react';
import { useHub } from '../store/useHub';
import { formatBytes, formatDuration, formatTime } from '../utils/format';
import { Play, Square, Folder, Edit2, Star, Trash2, Clock, Trash, RefreshCw, TerminalSquare, Activity, Settings as SettingsIcon, CalendarClock } from 'lucide-react';

export function DetailPanel() {
  const selected = useHub((s) => s.selectedAppId);
  const apps = useHub((s) => s.apps);
  const runtime = useHub((s) => s.runtime);
  const logs = useHub((s) => s.logs);
  const launch = useHub((s) => s.launch);
  const stop = useHub((s) => s.stop);
  const update = useHub((s) => s.update);
  const clearLogs = useHub((s) => s.clearLogs);
  const schedules = useHub((s) => s.schedules);
  const upsertSchedule = useHub((s) => s.upsertSchedule);
  const removeSchedule = useHub((s) => s.removeSchedule);

  const app = useMemo(() => apps.find((a) => a.id === selected) ?? null, [apps, selected]);
  const rt = selected ? runtime[selected] : undefined;
  const lines = selected ? logs[selected] ?? [] : [];

  const logRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [tab, setTab] = useState<'log' | 'monitor' | 'settings' | 'schedule'>('log');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  if (!app) {
    return (
      <section className="flex-1 flex items-center justify-center text-white/40 h-full backdrop-blur-3xl bg-black/10">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 opacity-20" />
          <span className="text-[13px] font-medium tracking-wide uppercase">Select an App to Inspect</span>
        </div>
      </section>
    );
  }

  const running = rt?.status === 'running';
  const uptime = rt?.startedAt && running ? Date.now() - rt.startedAt : 0;
  const appSchedules = schedules.filter((s) => s.appId === app.id);

  return (
    <section className="flex-1 flex flex-col min-w-0 border-l border-white/10 bg-black/30 backdrop-blur-2xl relative z-10 glass-panel">
      {/* header gap for drag area */}
      <header className="mac-drag h-12 shrink-0 border-b border-white/5 bg-black/20" />
      
      {/* top info area */}
      <div className="mac-nodrag px-6 pt-5 pb-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner border
            ${running ? 'bg-mac-green/10 text-mac-green border-mac-green/20' : 'bg-white/5 text-white/80 border-white/10'}`}>
            {app.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => { setEditingName(false); if (nameDraft.trim()) update(app.id, { name: nameDraft.trim() }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="bg-white/10 border border-mac-accent/50 rounded-md px-2 py-1 text-base outline-none w-full text-white shadow-inner font-medium"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold truncate text-white/95">{app.name}</span>
                <button
                  className="text-white/30 hover:text-white/80 transition-colors"
                  onClick={() => { setNameDraft(app.name); setEditingName(true); }}
                  title="Rename"
                ><Edit2 className="w-4 h-4" /></button>
                <button
                  className={`transition-colors ${app.pinned ? 'text-mac-yellow fill-mac-yellow hover:text-mac-yellow/80 hover:fill-mac-yellow/80' : 'text-white/30 hover:text-mac-yellow hover:fill-mac-yellow'}`}
                  onClick={() => update(app.id, { pinned: !app.pinned })}
                  title="Pin"
                ><Star className={`w-4 h-4 ${app.pinned ? 'fill-current' : ''}`} /></button>
              </div>
            )}
            <div className="text-[12px] text-white/40 truncate mt-1 flex items-center gap-1.5" title={app.scriptPath}>
              <TerminalSquare className="w-3.5 h-3.5" />
              {app.scriptPath}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.apphub.reveal(app.scriptPath)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all border border-white/5 shadow-sm"
              title="Reveal in Finder"
            ><Folder className="w-4 h-4" /></button>
            
            {running ? (
              <button
                onClick={() => stop(app.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mac-red/20 hover:bg-mac-red text-mac-red hover:text-white border border-mac-red/30 transition-all font-medium text-[13px] shadow-[0_0_15px_rgba(255,59,48,0.2)]"
              ><Square className="w-4 h-4 fill-current" /> Stop</button>
            ) : (
              <button
                onClick={() => launch(app.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mac-accent/90 hover:bg-mac-accent active:bg-mac-accent/80 text-white border border-white/10 transition-all font-medium text-[13px] shadow-[0_0_15px_rgba(10,132,255,0.3)]"
              ><Play className="w-4 h-4 fill-current ml-0.5" /> Launch</button>
            )}
          </div>
        </div>

        {/* status strip */}
        <div className="mt-5 grid grid-cols-4 gap-4 p-3 rounded-xl bg-black/40 border border-white/5">
          <Stat label="Status" value={running ? 'Running' : rt?.status === 'exited' ? `Exited (${rt.exitCode ?? '?'})` : 'Idle'}
            color={running ? 'text-mac-green font-medium' : rt?.status === 'error' ? 'text-mac-red font-medium' : 'text-white/60'} />
          <Stat label="PID" value={rt?.pid ? String(rt.pid) : '—'} />
          <Stat label="CPU" value={running ? `${(rt?.cpu ?? 0).toFixed(1)}%` : '—'} color={running ? 'text-white/90' : ''} />
          <Stat label="RAM" value={running ? formatBytes(rt?.memory) : '—'} color={running ? 'text-white/90' : ''} />
        </div>

        {/* tabs container */}
        <div className="mt-5 flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-white/5 w-fit">
          <TabButton active={tab === 'log'} onClick={() => setTab('log')} icon={<TerminalSquare className="w-3.5 h-3.5" />} label="Logs" />
          <TabButton active={tab === 'monitor'} onClick={() => setTab('monitor')} icon={<Activity className="w-3.5 h-3.5" />} label="Monitor" />
          <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={<CalendarClock className="w-3.5 h-3.5" />} label="Cron" />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<SettingsIcon className="w-3.5 h-3.5" />} label="Config" />
        </div>
      </div>

      {/* body area */}
      <div className="flex-1 min-h-0 overflow-hidden mac-nodrag bg-black/20">
        {tab === 'log' && (
          <div className="h-full flex flex-col relative">
            <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-between text-[11px] text-white/50 backdrop-blur-md bg-black/40 border-b border-white/5 z-10 font-medium">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white/80 transition-colors">
                <input type="checkbox" className="accent-mac-accent w-3.5 h-3.5 rounded" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
                Auto-scroll
              </label>
              <div className="flex items-center gap-4">
                <span>{lines.length} lines</span>
                <button onClick={() => clearLogs(app.id)} className="flex items-center gap-1 hover:text-white transition-colors uppercase tracking-wider text-[10px]">
                  <Trash className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
            
            <div ref={logRef} className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[12px] log-text px-4 py-3 pt-12 leading-relaxed bg-[#1e1e1e]">
              {lines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/30 italic">No output yet. Launch the process to view streaming logs.</div>
              ) : lines.map((l, i) => (
                <div key={i} className="flex gap-4 group hover:bg-white/[0.02]">
                  <span className="text-white/20 shrink-0 select-none w-20">{formatTime(l.ts)}</span>
                  <span className={`break-all ${
                    l.stream === 'stderr' ? 'text-red-400' : l.stream === 'system' ? 'text-mac-yellow' : 'text-white/70 group-hover:text-white/90'
                  }`}>
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'monitor' && (
          <MonitorView appId={app.id} />
        )}

        {tab === 'settings' && (
          <SettingsView app={app} />
        )}

        {tab === 'schedule' && (
          <ScheduleView
            appId={app.id}
            schedules={appSchedules}
            onUpsert={upsertSchedule}
            onRemove={removeSchedule}
          />
        )}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200
        ${active 
          ? 'bg-mac-accent text-white shadow-sm' 
          : 'text-white/60 hover:text-white hover:bg-white/10'}`}
    >
      {icon} {label}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-white/40 uppercase tracking-widest text-[9px] font-bold">{label}</span>
      <span className={`font-mono text-[13px] ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

function MonitorView({ appId }: { appId: string }) {
  const rt = useHub((s) => s.runtime[appId]);
  const [series, setSeries] = useState<{ cpu: number; mem: number; ts: number }[]>([]);

  useEffect(() => {
    if (!rt || rt.status !== 'running') return;
    setSeries((prev) => {
      const next = [...prev, { cpu: rt.cpu ?? 0, mem: rt.memory ?? 0, ts: Date.now() }];
      if (next.length > 60) next.shift();
      return next;
    });
  }, [rt]);

  const maxMem = Math.max(1, ...series.map((s) => s.mem));

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
      <Card title="CPU Usage" unit="%" data={series.map((s) => s.cpu)} max={100} color="#0a84ff" />
      <Card title="Memory Usage" unit={formatBytes(maxMem)} data={series.map((s) => s.mem)} max={maxMem} color="#30d158" formatter={formatBytes} />
      <div className="text-[11px] text-white/30 flex items-center justify-center gap-2 mt-4 font-mono">
        <Activity className="w-3.5 h-3.5" /> Sample rate ~1.5s • Last 60 points
      </div>
    </div>
  );
}

function Card({ title, unit, data, max, color, formatter }:
  { title: string; unit: string; data: number[]; max: number; color: string; formatter?: (n: number) => string }) {
  const w = 600, h = 120;
  const points = data.length > 1
    ? data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / Math.max(1, max)) * h}`).join(' ')
    : '';
  const last = data[data.length - 1] ?? 0;

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-5 shadow-inner backdrop-blur-md">
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-[14px] font-semibold text-white/80">{title}</span>
        <span className="text-xl font-mono font-bold" style={{ color }}>
          {formatter ? formatter(last) : `${last.toFixed(1)}${unit}`}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28 overflow-visible">
        <defs>
          <linearGradient id={`g-${title}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {points && (
          <>
            <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#g-${title})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  );
}

function SettingsView({ app }: { app: NonNullable<ReturnType<typeof useHub.getState>['apps'][number]> }) {
  const update = useHub((s) => s.update);
  const [category, setCategory] = useState(app.category ?? '');
  const [tagsText, setTagsText] = useState((app.tags ?? []).join(', '));

  useEffect(() => {
    setCategory(app.category ?? '');
    setTagsText((app.tags ?? []).join(', '));
  }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 text-sm">
      <Field label="显示名称">
        <input
          defaultValue={app.name}
          onBlur={(e) => e.target.value.trim() && update(app.id, { name: e.target.value.trim() })}
          className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-white/10 focus:border-mac-accent outline-none"
        />
      </Field>
      <Field label="分类">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => update(app.id, { category: category.trim() || undefined })}
          placeholder="例如:工具 / 服务 / 调试"
          className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-white/10 focus:border-mac-accent outline-none"
        />
      </Field>
      <Field label="标签 (英文逗号分隔)">
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          onBlur={() => update(app.id, {
            tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
          })}
          placeholder="dev, backend, db"
          className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-white/10 focus:border-mac-accent outline-none"
        />
      </Field>
      <Field label="启动模式">
        <div className="flex gap-1 mt-1">
          {(['background', 'terminal'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update(app.id, { launchMode: mode })}
              className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer
                ${(app.launchMode ?? 'background') === mode
                  ? 'bg-mac-accent text-white'
                  : 'bg-white/5 text-mac-subtle hover:bg-white/10'}`}
            >
              {mode === 'background' ? '后台模式' : '终端模式'}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-mac-subtle mt-1.5">
          {app.launchMode === 'terminal'
            ? '在外部终端窗口中执行脚本，AppHub 不捕获输出'
            : '后台静默执行，日志实时输出到 AppHub 界面'}
        </div>
      </Field>

      <Field label="排序权重 (数字越小越靠前)">
        <input
          type="number"
          defaultValue={app.order ?? 0}
          onBlur={(e) => update(app.id, { order: Number(e.target.value) || 0 })}
          className="w-32 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 focus:border-mac-accent outline-none"
        />
      </Field>

      <div className="pt-4 border-t border-mac-border space-y-1 text-[12px] text-mac-subtle">
        <div><span className="text-white/70">脚本:</span> {app.scriptPath}</div>
        <div><span className="text-white/70">工作目录:</span> {app.cwd}</div>
        <div><span className="text-white/70">来源根目录:</span> {app.rootDir}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-mac-subtle mb-1">{label}</div>
      {children}
    </label>
  );
}

function ScheduleView({
  appId, schedules, onUpsert, onRemove,
}: {
  appId: string;
  schedules: ReturnType<typeof useHub.getState>['schedules'];
  onUpsert: (s: ReturnType<typeof useHub.getState>['schedules'][number]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [cronExpr, setCronExpr] = useState('0 9 * * *');
  const [remark, setRemark] = useState('');

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 text-sm">
      <div className="rounded-xl border border-white/10 bg-black/40 p-5 shadow-inner backdrop-blur-md mt-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-4 h-4 text-mac-accent" />
          <span className="text-[13px] font-semibold text-white/90">Add Schedule</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="cron, e.g. 0 9 * * *"
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-mac-accent outline-none font-mono text-xs text-white"
            />
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Description"
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-mac-accent outline-none text-xs text-white"
            />
            <button
              onClick={() => onUpsert({
                id: crypto.randomUUID(), appId, cron: cronExpr, enabled: true, remark,
              })}
              className="px-4 py-2 rounded-lg bg-mac-accent hover:bg-mac-accent/90 active:scale-95 text-white font-medium text-xs transition-all shadow-sm"
            >Add</button>
          </div>
          <div className="text-[11px] text-white/40 bg-black/20 p-2 rounded-lg border border-white/5">
            Example: <code className="mx-1 text-white/70">*/5 * * * *</code> Every 5 mins | <code className="mx-1 text-white/70">0 9 * * 1-5</code> Weekdays 9 AM
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-6">
        {schedules.length === 0 && (
          <div className="text-white/40 text-[12px] flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <Clock className="w-8 h-8 opacity-20 mb-2" />
            No schedules configured
          </div>
        )}
        {schedules.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 px-4 py-3 transition-colors">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={() => onUpsert({ ...s, enabled: !s.enabled })}
                className="accent-mac-accent w-4 h-4 rounded"
              />
            </label>
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="font-mono text-[13px] text-mac-accent font-medium leading-none">{s.cron}</span>
            </div>
            <div className="flex-2 min-w-[80px] max-w-[200px]">
              <span className="text-white/70 text-xs truncate block" title={s.remark}>{s.remark || 'No description'}</span>
            </div>
            <button onClick={() => onRemove(s.id)} className="text-mac-red/70 hover:text-mac-red p-1.5 rounded-md hover:bg-mac-red/10 transition-colors" title="Remove schedule">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
