import type { ServiceHealth } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
interface Props { service: ServiceHealth; }
export function HealthCard({ service }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{service.name}</p>
        <p className="text-xs text-slate-500 truncate">{service.description}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500">Latency</p>
          <p className="text-sm font-medium text-slate-300">{service.latencyMs}ms</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500">Uptime</p>
          <p className="text-sm font-medium text-slate-300">{service.uptime}%</p>
        </div>
        <StatusBadge status={service.status} dot />
      </div>
    </div>
  );
}
