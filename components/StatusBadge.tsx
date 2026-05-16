"use client";
import { cn } from "@/lib/utils";
import type { RunStatus, TaskStatus, ApprovalStatus, HealthStatus, DeliverableStatus, LeadStatus, ClientStatus, AgentDefinitionStatus, AgentJobStatus, OutboundMessageStatus, CrmAccountStatus, CrmContactStatus, CrmDealStage, CrmActivityStatus } from "@/lib/types";
type AgentPresence = "online" | "busy" | "offline";
type AnyStatus = RunStatus | TaskStatus | ApprovalStatus | HealthStatus | DeliverableStatus | LeadStatus | ClientStatus | AgentDefinitionStatus | AgentJobStatus | OutboundMessageStatus | CrmAccountStatus | CrmContactStatus | CrmDealStage | CrmActivityStatus | AgentPresence;
const STATUS_STYLES: Record<string, string> = {
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  paused: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  todo: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  done: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  qualified: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  disqualified: "bg-red-500/20 text-red-400 border-red-500/30",
  online: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  busy: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  offline: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  down: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  ready: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  archived: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  enabled: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  disabled: "bg-slate-600/20 text-slate-500 border-slate-600/30",
  queued: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  sent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  send_failed: "bg-red-500/20 text-red-400 border-red-500/30",
  prospect: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  customer: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  unresponsive: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  do_not_contact: "bg-red-500/20 text-red-400 border-red-500/30",
  discovery: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  proposal: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  negotiation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  open: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};
const STATUS_DOTS: Record<string, string> = {
  running: "bg-blue-400 animate-pulse",
  in_progress: "bg-blue-400 animate-pulse",
  pending: "bg-amber-400",
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};
const STATUS_LABELS: Record<string, string> = { in_progress: "In Progress", pending_approval: "Pending Approval", send_failed: "Send Failed", do_not_contact: "Do Not Contact" };
interface Props { status: AnyStatus; dot?: boolean; className?: string; }
export function StatusBadge({ status, dot, className }: Props) {
  const style = STATUS_STYLES[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";
  const dotStyle = STATUS_DOTS[status];
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", style, className)}>
      {dot && dotStyle && <span className={cn("h-1.5 w-1.5 rounded-full", dotStyle)} />}
      {label}
    </span>
  );
}
