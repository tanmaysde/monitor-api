import React, { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange, className = "", placeholder = "Search...", ...props }: SearchBarProps) {
  return (
    <div className={`relative flex items-center w-full max-w-xs ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-550 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-10 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-lg text-slate-750 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-150 placeholder:text-slate-400 dark:placeholder:text-slate-550"
        {...props}
      />
      <div className="absolute right-2.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-550 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-850 rounded pointer-events-none">
        <span>⌘</span>
        <span>K</span>
      </div>
    </div>
  );
}
