import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-800", className)} />;
}
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3">
      <div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
      <Skeleton className="h-9 w-16" /><Skeleton className="h-3 w-20" />
    </div>
  );
}
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
      ))}
    </tr>
  );
}
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
