"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Play, FolderKanban, CheckSquare, ScrollText, Bot, Users, GitBranch, Settings, Settings2, Wrench, Zap, Building2, ClipboardList, ShieldCheck, Mail, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/agent-jobs", label: "Agent Jobs", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/crm", label: "CRM", icon: Handshake },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/outbound", label: "Outbound", icon: Mail },
  { href: "/runs", label: "Runs", icon: Play },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/handoffs", label: "Handoffs", icon: GitBranch },
  { href: "/workflows", label: "Workflows", icon: Settings2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/audit", label: "Audit", icon: ShieldCheck },
  { href: "/ops", label: "Ops", icon: Wrench },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-slate-100 tracking-tight">Clawbot</span>
        <span className="ml-auto rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5">v1</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-indigo-500/15 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
              <Icon className={cn("h-4 w-4", active ? "text-indigo-400" : "text-slate-500")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3 flex flex-col gap-0.5">
        <Link href="/settings" className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", pathname === "/settings" ? "bg-indigo-500/15 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
          <Settings className={cn("h-4 w-4", pathname === "/settings" ? "text-indigo-400" : "text-slate-500")} />
          Settings
        </Link>
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">J</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-300">Joel</p>
            <p className="truncate text-[10px] text-slate-500">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
