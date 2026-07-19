import React from "react";
import { MonitorStatus } from "../../types";

export interface StatusBadgeProps {
  status: MonitorStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const states = {
    UP: {
      text: "UP",
      dotClass: "bg-healthy-500 animate-pulse-indicator",
      badgeClass: "bg-healthy-50 text-healthy-700 border-healthy-200/60 dark:bg-healthy-500/10 dark:text-healthy-400 dark:border-healthy-500/20",
    },
    DOWN: {
      text: "DOWN",
      dotClass: "bg-danger-500 animate-pulse-indicator",
      badgeClass: "bg-danger-50 text-danger-700 border-danger-200/60 dark:bg-danger-500/10 dark:text-danger-400 dark:border-danger-500/20",
    },
    UNKNOWN: {
      text: "UNKNOWN",
      dotClass: "bg-slate-400",
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    },
  };

  const current = states[status] || states.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${current.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass}`} />
      {current.text}
    </span>
  );
}
