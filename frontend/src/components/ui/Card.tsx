import React, { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ children, className = "", hover = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-sm transition-all duration-200 ${
        hover ? "hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:shadow-slate-200/20 dark:hover:shadow-none" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
