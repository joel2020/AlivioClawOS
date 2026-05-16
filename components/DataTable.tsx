import { cn } from "@/lib/utils";
export interface Column<T> { key: string; header: string; render: (row: T) => React.ReactNode; className?: string; }
interface Props<T> { columns: Column<T>[]; data: T[]; keyFn: (row: T) => string; onRowClick?: (row: T) => void; className?: string; }
export function DataTable<T>({ columns, data, keyFn, onRowClick, className }: Props<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500", col.className)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyFn(row)} onClick={() => onRowClick?.(row)} className={cn("border-b border-slate-800/60 transition-colors", onRowClick && "cursor-pointer hover:bg-slate-800/40")}>
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-slate-300", col.className)}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
