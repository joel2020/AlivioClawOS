import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
interface Props {
  title: string; value: string | number; subtitle?: string;
  icon?: LucideIcon; trend?: { direction: "up" | "down" | "neutral"; label: string };
  accent?: "default" | "green" | "red" | "amber" | "blue"; className?: string;
}
const ACCENT_ICON: Record<string, string> = {
  default: "text-indigo-400 bg-indigo-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
  red: "text-red-400 bg-red-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  blue: "text-blue-400 bg-blue-500/10",
};
const TREND_COLOR = { up: "text-emerald-400", down: "text-red-400", neutral: "text-slate-400" };
export function MetricCard({ title, value, subtitle, icon: Icon, trend, accent = "default", className }: Props) {
  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {Icon && <div className={cn("rounded-lg p-2", ACCENT_ICON[accent])}><Icon className="h-4 w-4" /></div>}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-slate-100">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {trend && (
        <p className={cn("text-xs font-medium", TREND_COLOR[trend.direction])}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </p>
      )}
    </div>
  );
}
