import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AppGrid } from './components/AppGrid';
import { DetailPanel } from './components/DetailPanel';
import { useHub } from './store/useHub';

export default function App() {
  const init = useHub((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <div className="h-screen w-screen flex bg-mac-bg text-mac-text overflow-hidden font-sans selection:bg-mac-accent/30 selection:text-white">
      {/* Background ambient lighting for premium feel */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        background: 'radial-gradient(circle at 15% 50%, rgba(10, 132, 255, 0.4), transparent 50%), radial-gradient(circle at 85% 30%, rgba(94, 92, 230, 0.4), transparent 50%)',
        filter: 'blur(60px)'
      }} />
      
      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <main className="flex-1 flex min-w-0 bg-black/5">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="mac-drag h-12 shrink-0 flex items-center justify-center text-[13px] font-medium tracking-wide text-white/50 border-b border-white/5 bg-black/10 backdrop-blur-md">
              AppHub
            </div>
            <div className="flex-1 overflow-hidden relative">
              <AppGrid />
            </div>
          </div>
          <div className="w-[44%] min-w-[420px] max-w-[640px] flex shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.4)] relative z-20">
            <DetailPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
