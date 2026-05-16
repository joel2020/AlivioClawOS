"use client";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, LogOut } from "lucide-react";
import { useTransition } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard", "/runs": "Runs", "/projects": "Projects",
  "/tasks": "Tasks", "/approvals": "Approvals", "/deliverables": "Deliverables",
  "/logs": "Logs", "/audit": "Audit", "/settings": "Settings", "/clients": "Clients", "/crm": "CRM", "/agent-jobs": "Agent Jobs", "/outbound": "Outbound",
};

function getTitle(pathname: string) {
  if (pathname.startsWith("/runs/")) return "Run Detail";
  return PAGE_TITLES[pathname] ?? "Clawbot";
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(() => {
      void (async () => {
        await fetch("/api/v1/auth/session", { method: "DELETE" });
        router.replace("/login");
        router.refresh();
      })();
    });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <h1 className="text-sm font-semibold text-slate-100">{getTitle(pathname)}</h1>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-4 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">⌘K</kbd>
        </div>
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>
        <button
          onClick={signOut}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
