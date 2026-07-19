import React, { ReactNode } from "react";
import { Card } from "./Card";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendType = "neutral",
  description,
  className = "",
}: StatCardProps) {
  const trendColor = {
    positive: "text-healthy-600 dark:text-healthy-500 bg-healthy-50 dark:bg-healthy-500/10",
    negative: "text-danger-600 dark:text-danger-500 bg-danger-50 dark:bg-danger-500/10",
    neutral: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
  };

  return (
    <Card className={`relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 ${className}`} hover>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-100/50 to-transparent dark:from-slate-800/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-300" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold mt-2 tracking-tight text-slate-800 dark:text-slate-100">{value}</h3>
        </div>
        {icon && (
          <div className="p-2 bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 rounded-lg group-hover:text-brand-500 transition-colors duration-200">
            {icon}
          </div>
        )}
      </div>
      {(trend || description) && (
        <div className="flex items-center gap-2 mt-4 text-xs">
          {trend && (
            <span className={`px-2 py-0.5 font-medium rounded-full ${trendColor[trendType]}`}>
              {trend}
            </span>
          )}
          {description && (
            <span className="text-slate-500 dark:text-slate-400 leading-none">
              {description}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
