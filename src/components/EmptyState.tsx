import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  accentColor?: 'orange' | 'blue' | 'cyan' | 'emerald' | 'purple' | 'slate';
}

const accentMap = {
  orange:  { bg: 'from-orange-500/10',  border: 'border-orange-500/20',  icon: 'text-orange-600',  button: 'bg-orange-500 hover:bg-orange-600' },
  blue:    { bg: 'from-blue-500/10',    border: 'border-blue-500/20',    icon: 'text-blue-700',    button: 'bg-blue-500 hover:bg-blue-600' },
  cyan:    { bg: 'from-cyan-500/10',    border: 'border-cyan-500/20',    icon: 'text-cyan-700',    button: 'bg-cyan-500 hover:bg-cyan-600' },
  emerald: { bg: 'from-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-700', button: 'bg-emerald-500 hover:bg-emerald-600' },
  purple:  { bg: 'from-purple-500/10',  border: 'border-purple-500/20',  icon: 'text-purple-700',  button: 'bg-purple-500 hover:bg-purple-600' },
  slate:   { bg: 'from-zinc-200/40',    border: 'border-zinc-200',       icon: 'text-zinc-500',    button: 'bg-zinc-700 hover:bg-zinc-800' },
};

export default function EmptyState({ icon, title, description, action, accentColor = 'slate' }: EmptyStateProps) {
  const colors = accentMap[accentColor];
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${colors.bg} to-white border ${colors.border} rounded-xl p-12 text-center`}>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,1) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }} />
      <div className="relative">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-zinc-200 shadow-sm mb-4">
          <i className={`fa-solid ${icon} text-2xl ${colors.icon}`}></i>
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-2">{title}</h3>
        {description && <p className="text-sm text-zinc-600 max-w-sm mx-auto">{description}</p>}
        {action && (
          <button onClick={action.onClick}
            className={`mt-5 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.97] ${action.variant === 'secondary' ? 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100' : `${colors.button} text-white shadow-lg`}`}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
