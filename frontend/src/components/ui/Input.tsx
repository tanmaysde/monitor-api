import React, { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, className = "", id, type = "text", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-slate-500 dark:text-slate-450">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={`w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-150 placeholder:text-slate-450 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 ${
            error ? "border-danger-500 focus:ring-danger-500/20 focus:border-danger-500" : ""
          } ${className}`}
          {...props}
        />
        {description && !error && (
          <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-normal">{description}</p>
        )}
        {error && (
          <p className="text-[11px] text-danger-600 dark:text-danger-500 font-medium leading-normal">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
