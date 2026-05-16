"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { AgentDefinition, ClientAccount } from "@/lib/types";

export function AgentJobForm({ agents, clients }: { agents: AgentDefinition[]; clients: ClientAccount[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    agentId: agents.find((agent) => agent.status === "enabled")?.id || "",
    clientId: clients[0]?.id || "",
    title: "",
    priority: "medium",
    instructions: "",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/v1/agent-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: form.agentId,
            clientId: form.clientId || undefined,
            title: form.title,
            priority: form.priority,
            input: { instructions: form.instructions },
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Failed to create agent job");
          return;
        }
        setForm({ ...form, title: "", instructions: "" });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">New Agent Job</h2>
        <p className="mt-0.5 text-xs text-slate-500">Queues a scoped job for one specialized agent. High-risk agents start blocked for operator review.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select required value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="">No client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Job title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Instructions for the worker/automation" rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Queuing..." : "Create job"}</Button>
      </div>
    </form>
  );
}
