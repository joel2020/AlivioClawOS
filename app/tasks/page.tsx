import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration } from "@/lib/utils";
import { Bot } from "lucide-react";
import Link from "next/link";
import { getDataSourceLabel, getTasks, getRuns } from "@/lib/clawbot-data";

export default async function TasksPage() {
  const [{ tasks, source }, { runs }] = await Promise.all([getTasks(), getRuns()]);
  const runMap = Object.fromEntries(runs.map((r) => [r.id, r.name]));
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Tasks</h1>
        <p className="text-sm text-slate-400 mt-0.5">{tasks.length} tasks · {getDataSourceLabel(source)}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Task", "Run", "Agent", "Status", "Duration", "Output"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No tasks available"
                      description="The task table will populate once the API exposes run-level task records."
                    />
                  </td>
                </tr>
              ) : tasks.map((task) => (
                <tr key={task.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{task.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">{task.description}</p>
                  </td>
                  <td className="px-4 py-3"><Link href={"/runs/" + task.runId} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{runMap[task.runId] ?? task.runId}</Link></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs text-slate-400"><Bot className="h-3 w-3 text-slate-500" />{task.assignedAgent}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={task.status} dot /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{task.durationMs ? formatDuration(task.durationMs) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{task.outputSummary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
