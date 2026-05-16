"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SERVICE_OPTIONS = [
  { value: "proposal_generation", label: "Proposal" },
  { value: "strategy_brief", label: "Web strategy" },
  { value: "lead_intake", label: "Discovery only" },
];

export function LeadIntakeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    serviceInterest: "proposal_generation",
    source: "web",
    notes: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/v1/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, autoStartWorkflow: true }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error || "Failed to create lead");
          return;
        }
        setForm({
          companyName: "",
          contactName: "",
          contactEmail: "",
          serviceInterest: "proposal_generation",
          source: "web",
          notes: "",
        });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">New Lead Intake</h2>
          <p className="text-xs text-slate-500 mt-0.5">Creates a lead and starts the discovery workflow automatically.</p>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-500">API</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          required
          value={form.companyName}
          onChange={(event) => setForm({ ...form, companyName: event.target.value })}
          placeholder="Company name"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <input
          value={form.contactName}
          onChange={(event) => setForm({ ...form, contactName: event.target.value })}
          placeholder="Contact name"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <input
          value={form.contactEmail}
          onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
          placeholder="Contact email"
          type="email"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <input
          value={form.source}
          onChange={(event) => setForm({ ...form, source: event.target.value })}
          placeholder="Source"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <select
          value={form.serviceInterest}
          onChange={(event) => setForm({ ...form, serviceInterest: event.target.value })}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2"
        >
          {SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <textarea
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Notes"
          rows={3}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
