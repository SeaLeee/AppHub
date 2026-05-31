import { useHub } from '../store/useHub';
import { useMemo, useState } from 'react';
import { Search, Hash, LayoutGrid, Layers, FolderPlus, RefreshCw, X, Folder, ChevronDown, ChevronRight, EyeOff } from 'lucide-react';

export function Sidebar() {
  const apps = useHub((s) => s.apps);
  const roots = useHub((s) => s.roots);
  const search = useHub((s) => s.search);
  const setSearch = useHub((s) => s.setSearch);
  const category = useHub((s) => s.category);
  const setCategory = useHub((s) => s.setCategory);
  const tag = useHub((s) => s.tag);
  const setTag = useHub((s) => s.setTag);
  const cardWidth = useHub((s) => s.cardWidth);
  const setCardWidth = useHub((s) => s.setCardWidth);
  const showHidden = useHub((s) => s.showHidden);
  const setShowHidden = useHub((s) => s.setShowHidden);
  const hiddenCount = useMemo(() => apps.filter((a) => a.hidden).length, [apps]);
  const addRoot = useHub((s) => s.addRoot);
  const removeRoot = useHub((s) => s.removeRoot);
  const toggleRoot = useHub((s) => s.toggleRoot);
  const refreshApps = useHub((s) => s.refreshApps);

  const [rootsOpen, setRootsOpen] = useState(true);

  const categories = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => a.category && set.add(a.category));
    return Array.from(set).sort();
  }, [apps]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [apps]);

  return (
    <aside className="w-64 shrink-0 h-full flex flex-col border-r border-white/10 bg-black/20 backdrop-blur-3xl relative z-20">
      <div className="mac-drag h-12 shrink-0" />

      <div className="px-3 pb-3 mac-nodrag relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 w-3.5 h-3.5 mt-[-4px]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索应用"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/20 border border-white/10
                     focus:border-mac-accent focus:bg-black/30 outline-none text-[13px] placeholder:text-white/40 transition-all shadow-inner"
        />
      </div>
      <div className="px-3 pb-3 mac-nodrag">
        <div className="flex items-center justify-between text-[11px] text-white/50 font-medium mb-1.5 px-1">
          <span>卡片宽度</span>
          <span>{cardWidth}px</span>
        </div>
        <input 
          type="range" 
          min="120" 
          max="320" 
          step="10"
          value={cardWidth} 
          onChange={(e) => setCardWidth(Number(e.target.value))}
          className="w-full accent-mac-accent h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
        />
      </div>
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 mac-nodrag space-y-4 pb-4">
        <div className="space-y-0.5">
          <NavItem
            active={!category && !tag}
            label="全部应用"
            icon={<LayoutGrid className="w-4 h-4" />}
            count={apps.filter((a) => !a.hidden).length}
            onClick={() => { setCategory(null); setTag(null); }}
          />
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200
                ${showHidden
                  ? 'bg-white/10 text-white/80'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/60'}`}
            >
              <EyeOff className="w-4 h-4" />
              <span>已隐藏</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/20 text-white/50">
                {hiddenCount}
              </span>
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="space-y-0.5">
            <SectionTitle label="分类" />
            {categories.map((c) => (
              <NavItem
                key={c}
                active={category === c}
                label={c}
                icon={<Layers className="w-4 h-4" />}
                count={apps.filter((a) => a.category === c).length}
                onClick={() => { setCategory(category === c ? null : c); setTag(null); }}
              />
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <SectionTitle label="标签" />
            <div className="flex flex-wrap gap-1.5 px-2 pt-1">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                    ${tag === t
                      ? 'bg-mac-accent text-white shadow'
                      : 'bg-black/20 text-white/70 hover:text-white hover:bg-black/40'}`}
                >
                  <Hash className="w-3 h-3 opacity-60" />
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            onClick={() => setRootsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 pt-2 pb-1 group"
          >
            <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold group-hover:text-white/80 transition-colors">根目录</span>
            {rootsOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
          </button>
          
          {rootsOpen && (
            <div className="px-2 space-y-1 pt-1">
              {roots.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title={r.path}
                >
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={() => toggleRoot(r.id)}
                    className="accent-mac-accent w-3.5 h-3.5"
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-mac-accent shrink-0" />
                    <span className="truncate text-[12px] text-white/80 group-hover:text-white">{r.path.split('/').pop() || r.path}</span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center rounded-sm hover:bg-red-400/20 transition-all"
                    onClick={() => removeRoot(r.id)}
                    title="删除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="pt-2 flex gap-1.5">
                <button
                  onClick={addRoot}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/20 hover:bg-black/40
                             text-[11px] text-white/80 hover:text-white transition-all shadow-sm border border-white/5"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-mac-accent" /> 添加
                </button>
                <button
                  onClick={refreshApps}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/20 hover:bg-black/40
                             text-[11px] text-white/80 hover:text-white transition-all shadow-sm border border-white/5"
                >
                  <RefreshCw className="w-3 h-3 text-mac-accent" /> 扫描
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{label}</span>
    </div>
  );
}

function NavItem({
  active, label, count, onClick, icon
}: { active: boolean; label: string; count: number; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200
        ${active 
          ? 'bg-mac-accent/90 text-white shadow-md' 
          : 'text-white/70 hover:bg-white/10 hover:text-white hover:shadow-sm'}`}
    >
      <div className="flex items-center gap-2">
        <span className={active ? 'text-white' : 'text-white/60'}>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
        ${active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/50'}`}>
        {count}
      </span>
    </button>
  );
}
