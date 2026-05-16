import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getDataSourceLabel, getLogs, getRuns } from "@/lib/clawbot-data";

const LEVEL_STYLES: Record<string, string> = { debug: "text-slate-600", info: "text-slate-400", warn: "text-amber-400", error: "text-red-400" };
const LEVEL_BG: Record<string, string> = { debug: "bg-slate-800", info: "bg-slate-800", warn: "bg-amber-500/10", error: "bg-red-500/10" };

export default async function LogsPage() {
  const [{ logs, source }, { runs }] = await Promise.all([getLogs(), getRuns()]);
  const runMap = Object.fromEntries(runs.map((r) => [r.id, r.name]));
  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return (
    <div className="flex flex-col gap-4 p-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Logs</h1>
        <p className="text-sm text-slate-400 mt-0.5">{sorted.length} entries · {getDataSourceLabel(source)}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800"><p className="text-xs text-slate-500">{sorted.length} entries</p></div>
        <div className="divide-y divide-slate-800/40 font-mono text-xs">
          {sorted.length === 0 ? (
            <EmptyState
              title="No logs available"
              description="Logs will appear here after the runtime emits events into the observability pipeline."
            />
          ) : sorted.map((log) => (
            <div key={log.id} className={cn("flex items-start gap-3 px-4 py-2.5", LEVEL_BG[log.level])}>
              <span className="text-slate-600 shrink-0 tabular-nums">{new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}</span>
              <span className={cn("w-10 shrink-0 font-bold uppercase text-[10px] pt-px", LEVEL_STYLES[log.level])}>{log.level}</span>
              <Link href={"/runs/" + log.runId} className="text-indigo-400 hover:text-indigo-300 transition-colors shrink-0 text-[11px]">{runMap[log.runId] ?? log.runId}</Link>
              <span className="text-slate-500 shrink-0">[{log.agentName}]</span>
              <span className={cn("flex-1", LEVEL_STYLES[log.level])}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
