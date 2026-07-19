import React, { ReactNode } from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-900/60 shadow-sm ${className}`}>
      {icon && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-slate-450 dark:text-slate-500 rounded-full mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-855 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-4">
          {actionText}
        </Button>
      )}
    </div>
  );
}
