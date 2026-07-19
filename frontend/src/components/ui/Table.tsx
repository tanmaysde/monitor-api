import React, { ReactNode } from "react";

export interface TableColumn<T> {
  header: ReactNode;
  render: (item: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  items: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyState?: ReactNode;
}

export function Table<T>({
  items,
  columns,
  keyExtractor,
  className = "",
  emptyState,
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50">
            {columns.map((column, index) => (
              <th
                key={index}
                className={`px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase ${column.className || ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                {emptyState || "No records found"}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/35 transition-colors duration-150"
              >
                {columns.map((column, index) => (
                  <td key={index} className={`px-5 py-3.5 text-sm text-slate-600 dark:text-slate-350 ${column.className || ""}`}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
