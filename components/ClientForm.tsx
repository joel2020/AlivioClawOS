"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function ClientForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "web_ai_services",
    primaryContact: "",
    contactEmail: "",
    notes: "",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/v1/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Failed to create client");
          return;
        }
        setForm({ name: "", type: "web_ai_services", primaryContact: "", contactEmail: "", notes: "" });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">New Client Context</h2>
        <p className="mt-0.5 text-xs text-slate-500">Creates an isolated operating context for agent work.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Client or company name" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="web_ai_services">Web / AI services</option>
          <option value="recruiting">Recruiting</option>
          <option value="internal">Internal</option>
          <option value="other">Other</option>
        </select>
        <input value={form.primaryContact} onChange={(event) => setForm({ ...form, primaryContact: event.target.value })} placeholder="Primary contact" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} placeholder="Contact email" type="email" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Initial client memory / operating notes" rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create client"}</Button>
      </div>
    </form>
  );
}
