import React from 'react';

interface BadgeProps {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  text?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, text, className = '' }) => {
  const styles = {
    connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    disconnected: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    syncing: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]',
    error: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
  };

  const dots = {
    connected: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    disconnected: 'bg-slate-500',
    syncing: 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]',
    error: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
  };

  const labels = {
    connected: 'Verbunden',
    disconnected: 'Getrennt',
    syncing: 'Synchronisiert',
    error: 'Fehler',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm ${styles[status]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dots[status]}`}></span>
      <span className="tracking-wide">{text || labels[status]}</span>
    </span>
  );
};