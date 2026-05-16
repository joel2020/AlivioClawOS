"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentJob, ClientAccount, Lead } from "@/lib/types";

export function OutboundDraftForm({ clients, leads, jobs }: { clients: ClientAccount[]; leads: Lead[]; jobs: AgentJob[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    leadId: "",
    agentJobId: "",
    to: "",
    subject: "",
    body: "",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/v1/outbound-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: form.clientId || undefined,
            leadId: form.leadId || undefined,
            agentJobId: form.agentJobId || undefined,
            to: form.to,
            subject: form.subject,
            body: form.body,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Failed to draft outbound message");
          return;
        }
        setForm({ ...form, to: "", subject: "", body: "" });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-indigo-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Draft Outbound Email</h2>
          <p className="mt-0.5 text-xs text-slate-500">Creates an approval-gated email. Sending is blocked until an operator approves it.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="">No client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="">No lead</option>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.companyName}</option>)}
        </select>
        <select value={form.agentJobId} onChange={(event) => setForm({ ...form, agentJobId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="">No agent job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
        <input required type="email" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} placeholder="Recipient email" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
        <textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Email body" rows={5} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-3" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Drafting..." : "Request approval"}</Button>
      </div>
    </form>
  );
}
