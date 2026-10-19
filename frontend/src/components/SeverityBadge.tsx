import React from 'react';

interface SeverityBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ level, score, size = 'md' }) => {
  const normLevel = (level || 'LOW').toUpperCase();

  const styles = {
    LOW: {
      bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400',
      dot: 'bg-emerald-400',
      glow: 'shadow-emerald-950/40',
    },
    MEDIUM: {
      bg: 'bg-amber-950/70 border-amber-500/40 text-amber-400',
      dot: 'bg-amber-400',
      glow: 'shadow-amber-950/40',
    },
    HIGH: {
      bg: 'bg-orange-950/70 border-orange-500/40 text-orange-400',
      dot: 'bg-orange-400',
      glow: 'shadow-orange-950/40',
    },
    CRITICAL: {
      bg: 'bg-rose-950/80 border-rose-500/50 text-rose-400 animate-pulse',
      dot: 'bg-rose-500 animate-ping',
      glow: 'shadow-rose-950/60',
    },
  }[normLevel] || {
    bg: 'bg-slate-900 border-slate-700 text-slate-300',
    dot: 'bg-slate-400',
    glow: '',
  };

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm shadow-sm ${styles.bg} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      <span>{normLevel}</span>
      {score !== undefined && (
        <span className="opacity-75 text-[10px] font-mono border-l border-current/20 pl-1.5">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
};
