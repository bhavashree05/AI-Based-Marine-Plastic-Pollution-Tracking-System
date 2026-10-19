import React from 'react';
import { PlusCircle, Scan, Bell, Globe, Sparkles } from 'lucide-react';
import { AlertItem } from '../types';

interface NavbarProps {
  activeTabTitle: string;
  onOpenObservationModal: () => void;
  onQuickAiScan: () => void;
  alerts: AlertItem[];
  onOpenAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTabTitle,
  onOpenObservationModal,
  onQuickAiScan,
  alerts,
  onOpenAlerts,
}) => {
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Path */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-white font-['Outfit']">
          {activeTabTitle}
        </h1>
        <span className="hidden md:inline-block text-xs px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/50">
          Global Marine Observatory
        </span>
      </div>

      {/* Action Controls & Utilities */}
      <div className="flex items-center gap-3">
        {/* Quick AI Scan button */}
        <button
          onClick={onQuickAiScan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Test Plastic AI</span>
        </button>

        {/* Record Observation Button */}
        <button
          onClick={onOpenObservationModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-750 text-slate-200 hover:border-teal-500/50 hover:text-white transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
          <span>Record Observation</span>
        </button>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          title="View In-App Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
