import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, Bot, ListChecks, DollarSign } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDuration, cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { RunActions } from "@/components/RunActions";
import { getLogs, getRunById, getTasks } from "@/lib/clawbot-data";

interface Props { params: Promise<{ id: string }>; }

export default async function RunDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ run }, { tasks }, { logs }] = await Promise.all([getRunById(id), getTasks(id), getLogs(id)]);
  if (!run) notFound();

  const TASK_DOT: Record<string, string> = {
    done: "bg-emerald-500", in_progress: "bg-blue-500 animate-pulse",
    blocked: "bg-red-500", todo: "bg-slate-700", cancelled: "bg-slate-800",
  };
  const LOG_COLOR: Record<string, string> = {
    debug: "text-slate-500", info: "text-slate-400", warn: "text-amber-400", error: "text-red-400",
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link href="/runs" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3">
          <ChevronLeft className="h-3.5 w-3.5" />All Runs
        </Link>
        <div className="flex items-start gap-3">
          <h1 className="text-xl font-bold text-slate-100">{run.name}</h1>
          <StatusBadge status={run.status} dot />
        </div>
        <p className="mt-1 text-sm text-slate-500">{run.id} · {run.projectName} · Triggered by {run.triggeredBy}</p>
        <div className="mt-3">
          <RunActions runId={run.id} isActive={run.status === "running" || run.status === "pending"} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Clock, label: "Duration", value: run.durationMs ? formatDuration(run.durationMs) : "In progress…" },
          { icon: Bot, label: "Agents", value: run.agentCount },
          { icon: ListChecks, label: "Tasks", value: run.completedTasks + " / " + run.taskCount },
          { icon: DollarSign, label: "Cost", value: run.cost != null ? "$" + run.cost.toFixed(2) : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 p-2"><Icon className="h-4 w-4 text-slate-400" /></div>
            <div><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-100">{value}</p></div>
          </div>
        ))}
      </div>

      {run.status === "running" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">Overall Progress</p>
            <p className="text-sm font-semibold text-indigo-400">{run.progress}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: run.progress + "%" }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{run.completedTasks} of {run.taskCount} tasks complete</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-100">Tasks ({tasks.length})</h2>
              </div>
            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks found"
                description="Task records will appear here once the backend persists run execution details."
              />
            ) : (
              <div className="divide-y divide-slate-800/60">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-1.5 shrink-0">
                      <div className={cn("h-2 w-2 rounded-full", TASK_DOT[task.status] ?? "bg-slate-700")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200 truncate">{task.name}</p>
                        <StatusBadge status={task.status} className="shrink-0 text-[10px]" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Bot className="h-3 w-3" />{task.assignedAgent}
                        </span>
                        {task.durationMs && <span className="text-[11px] text-slate-500">{formatDuration(task.durationMs)}</span>}
                        {task.outputSummary && <span className="text-[11px] text-slate-500 truncate">{task.outputSummary}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {run.agents.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-100">Agents ({run.agents.length})</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {run.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                        <Bot className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{agent.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">{agent.model}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col max-h-[600px]">
          <div className="border-b border-slate-800 px-5 py-4 shrink-0">
            <h2 className="text-sm font-semibold text-slate-100">Logs ({logs.length})</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-1.5">
            {logs.length === 0 ? (
              <EmptyState
                title="No logs found"
                description="Operational logs will show up here once the run is connected to the logging pipeline."
              />
            ) : logs.map((log) => (
              <div key={log.id} className="rounded-lg bg-slate-950 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider", LOG_COLOR[log.level])}>{log.level}</span>
                  <span className="text-[10px] text-slate-600">{log.agentName}</span>
                  <span className="ml-auto text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className={cn("text-xs leading-relaxed", LOG_COLOR[log.level])}>{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div><span className="text-slate-500">Started: </span><span className="text-slate-300">{formatDate(run.startedAt)}</span></div>
          <div><span className="text-slate-500">Completed: </span><span className="text-slate-300">{run.completedAt ? formatDate(run.completedAt) : "—"}</span></div>
          <div><span className="text-slate-500">Tags: </span><span className="text-slate-300">{run.tags.length ? run.tags.join(", ") : "—"}</span></div>
        </div>
      </div>
    </div>
  );
}
