import React, { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "healthy" | "warning" | "danger" | "neutral";
}

export function Badge({ children, className = "", variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    brand: "bg-brand-50 text-brand-700 border-brand-200/60 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20",
    healthy: "bg-healthy-50 text-healthy-700 border-healthy-200/60 dark:bg-healthy-500/10 dark:text-healthy-400 dark:border-healthy-500/20",
    warning: "bg-warning-50 text-warning-700 border-warning-200/60 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20",
    danger: "bg-danger-50 text-danger-700 border-danger-200/60 dark:bg-danger-500/10 dark:text-danger-400 dark:border-danger-500/20",
    neutral: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
