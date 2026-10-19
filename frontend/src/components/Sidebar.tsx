import React from 'react';
import {
  LayoutDashboard,
  Scan,
  MapPin,
  BarChart3,
  Flame,
  CheckSquare,
  Bell,
  GraduationCap,
  Waves,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unreadAlertsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'detection', label: 'AI Plastic Detection', icon: Scan },
    { id: 'map', label: 'Live Pollution Map', icon: MapPin },
    { id: 'analytics', label: 'Dataset & Analytics', icon: BarChart3 },
    { id: 'hotspots', label: 'Hotspot Prioritization', icon: Flame },
    { id: 'cleanup', label: 'Cleanup Management', icon: CheckSquare },
    { id: 'alerts', label: 'Alerts & Reports', icon: Bell, badge: unreadAlertsCount },
    { id: 'about', label: 'About & Viva Guide', icon: GraduationCap },
  ];

  return (
    <aside className="w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col h-screen sticky top-0 shrink-0 z-40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-sky-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-white font-['Outfit']">MarineGuard</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">AI</span>
          </div>
          <p className="text-[11px] text-slate-400">Plastic Pollution Tracker</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Monitoring Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-sky-500/10 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              
              <div className="flex items-center gap-1">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-400/80" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">YOLOv8 + NOAA Feed</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">v2.0</span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Scientific Transparency Active</span>
        </div>
      </div>
    </aside>
  );
};
