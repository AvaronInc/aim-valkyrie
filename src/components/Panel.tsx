import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  accent?: 'green' | 'red' | 'amber';
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

const accentColors = {
  green: 'text-[oklch(0.82_0.22_145)]',
  red: 'text-[oklch(0.65_0.28_25)]',
  amber: 'text-[oklch(0.82_0.18_80)]',
};

export function Panel({ title, accent = 'green', right, children, className = '' }: PanelProps) {
  return (
    <div className={`panel scanline ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className={`text-[10px] font-bold tracking-[0.25em] uppercase ${accentColors[accent]}`}>
          ▌ {title}
        </span>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
