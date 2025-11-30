import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={`
      rounded-xl border border-border bg-surfaceHighlight/20 overflow-hidden flex flex-col
      ${className}
    `}>
      {(title || subtitle || action) && (
        <div className="px-5 py-4 flex items-start justify-between border-b border-border/50">
          <div>
            {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      
      <div className="p-5 flex-1">
        {children}
      </div>
    </div>
  );
};