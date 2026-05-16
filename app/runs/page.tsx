import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDuration } from "@/lib/utils";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { getDataSourceLabel, getRuns } from "@/lib/clawbot-data";

export default async function RunsPage() {
  const { runs, source } = await getRuns();
  const counts = { all: runs.length, running: runs.filter((r) => r.status === "running").length, completed: runs.filter((r) => r.status === "completed").length, failed: runs.filter((r) => r.status === "failed").length };
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Runs</h1>
          <p className="text-sm text-slate-400 mt-0.5">{runs.length} total runs · {getDataSourceLabel(source)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[{ label: "All", count: counts.all, color: "text-slate-300" }, { label: "Running", count: counts.running, color: "text-blue-400" }, { label: "Completed", count: counts.completed, color: "text-emerald-400" }, { label: "Failed", count: counts.failed, color: "text-red-400" }].map(({ label, count, color }) => (
            <div key={label} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 flex items-center gap-2">
              <span className={"font-semibold " + color}>{count}</span>
              <span className="text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Run", "Project", "Status", "Progress", "Duration", "Cost", "Triggered", "Started"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No runs available"
                      description="Once the API emits orchestration runs, they will appear in this table."
                    />
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={"/runs/" + run.id} className="font-medium text-slate-100 hover:text-indigo-400 transition-colors">{run.name}</Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">{run.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{run.projectName || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={run.status} dot /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-800">
                          <div className={"h-1.5 rounded-full " + (run.status === "failed" ? "bg-red-500" : run.status === "completed" ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${run.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{run.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{run.durationMs ? formatDuration(run.durationMs) : "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{run.cost != null ? <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{run.cost.toFixed(2)}</span> : "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{run.triggeredBy}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(run.startedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
