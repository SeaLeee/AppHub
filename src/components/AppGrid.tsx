import { useMemo } from 'react';
import { useHub } from '../store/useHub';
import { formatBytes } from '../utils/format';
import type { ScannedApp } from '../../electron/shared/types';
import { FolderSearch, Play, Square, Star, Terminal, Box, Hash, Activity } from 'lucide-react';

export function AppGrid() {
  const apps = useHub((s) => s.apps);
  const runtime = useHub((s) => s.runtime);
  const search = useHub((s) => s.search);
  const category = useHub((s) => s.category);
  const tag = useHub((s) => s.tag);
  const cardWidth = useHub((s) => s.cardWidth);
  const selected = useHub((s) => s.selectedAppId);
  const setSelected = useHub((s) => s.setSelected);
  const launch = useHub((s) => s.launch);
  const stop = useHub((s) => s.stop);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (category && a.category !== category) return false;
      if (tag && !a.tags?.includes(tag)) return false;
      if (q && !(
        a.name.toLowerCase().includes(q) ||
        a.folderName.toLowerCase().includes(q) ||
        a.scriptPath.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [apps, search, category, tag]);

  if (apps.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6">
      <div 
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))` }}
      >
        {filtered.map((a) => (
          <Card
            key={a.id}
            app={a}
            running={runtime[a.id]?.status === 'running'}
            cpu={runtime[a.id]?.cpu}
            mem={runtime[a.id]?.memory}
            selected={selected === a.id}
            onSelect={() => setSelected(a.id)}
            onLaunch={() => launch(a.id)}
            onStop={() => stop(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  app, running, cpu, mem, selected, onSelect, onLaunch, onStop,
}: {
  app: ScannedApp;
  running: boolean;
  cpu?: number;
  mem?: number;
  selected: boolean;
  onSelect: () => void;
  onLaunch: () => void;
  onStop: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onLaunch}
      className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-300 border backdrop-blur-md
        ${selected
          ? 'bg-white/[0.08] border-mac-accent/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] scale-[1.02]'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner transition-colors duration-500
          ${running ? 'bg-mac-green text-black' : 'bg-white/10 text-white/90'}`}>
          {app.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            {app.pinned && <Star className="w-3.5 h-3.5 text-mac-yellow fill-mac-yellow shrink-0" />}
            {app.launchMode === 'terminal' && <Terminal className="w-3.5 h-3.5 text-mac-accent2 shrink-0" />}
            <span className="font-semibold truncate text-[13px] leading-tight text-white/95">{app.name}</span>
          </div>
          <div className="text-[11px] text-white/50 truncate mt-0.5" title={app.folderName}>{app.folderName}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 min-h-[22px]">
        {app.category && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-mac-accent2/20 text-mac-accent2 font-medium border border-mac-accent2/20">
            <Box className="w-2.5 h-2.5" />
            {app.category}
          </span>
        )}
        {app.tags?.slice(0, 3).map((t) => (
          <span key={t} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 text-white/70 font-medium">
            <Hash className="w-2.5 h-2.5 opacity-50" />
            {t}
          </span>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {running ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 text-mac-green border border-mac-green/20">
              <Activity className="w-3 h-3 animate-pulse" />
              <span className="font-mono tracking-tight text-[10px] leading-none">
                {(cpu ?? 0).toFixed(1)}%<span className="opacity-50 mx-1">|</span>{formatBytes(mem)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/40">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>Ready</span>
            </div>
          )}
        </div>

        {running ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-mac-red/20 hover:bg-mac-red text-mac-red hover:text-white border border-mac-red/30 transition-all font-medium"
          >
            <Square className="w-3 h-3 fill-current" /> Stop
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onLaunch(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-mac-accent/20 hover:bg-mac-accent text-mac-accent hover:text-white border border-mac-accent/30 transition-all font-medium opacity-0 group-hover:opacity-100"
          >
            <Play className="w-3 h-3 fill-current" /> Launch
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const addRoot = useHub((s) => s.addRoot);
  return (
    <div className="h-full flex flex-col items-center justify-center text-white/60">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/5">
        <FolderSearch className="w-8 h-8 text-mac-accent" />
      </div>
      <div className="text-xl font-semibold mb-2 text-white/90">No Applications Found</div>
      <div className="text-[13px] mb-8 max-w-md text-center">Add a local root directory. AppHub will automatically scan for run.command, run.sh, and run.bat scripts.</div>
      <button
        onClick={addRoot}
        className="px-5 py-2.5 rounded-lg bg-mac-accent hover:bg-opacity-90 active:scale-95 text-white text-sm font-medium transition-all shadow-[0_0_15px_rgba(10,132,255,0.4)]"
      >Add Root Directory</button>
    </div>
  );
}
