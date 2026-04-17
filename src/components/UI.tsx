import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  key?: React.Key;
  style?: React.CSSProperties;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, delay = 0, onClick, style, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        onClick={onClick}
        style={style}
        className={cn(
          "panel",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: "bg-bca-blue text-white hover:bg-bca-light-blue shadow-md",
    secondary: "bg-white text-bca-blue border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md"
  };

  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-bca-blue/10 focus:border-bca-blue transition-all text-sm",
        className
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-bca-blue/10 focus:border-bca-blue transition-all min-h-[80px] text-sm",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-bca-blue/10 focus:border-bca-blue transition-all text-sm appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({ children, variant = 'pending', className }: { children: React.ReactNode, variant?: 'Success' | 'Pending' | 'Cancel' | string, className?: string }) {
  const variants: Record<string, string> = {
    Success: "bg-[#dcfce7] text-[#22c55e]",
    Pending: "bg-[#fef3c7] text-[#f59e0b]",
    Cancel: "bg-[#fee2e2] text-[#ef4444]",
  };

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide",
      variants[variant] || "bg-slate-100 text-slate-600",
      className
    )}>
      {children}
    </span>
  );
}
