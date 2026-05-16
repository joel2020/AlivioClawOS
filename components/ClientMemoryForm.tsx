"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ClientAccount } from "@/lib/types";

export function ClientMemoryForm({ clients }: { clients: ClientAccount[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "",
    kind: "note",
    title: "",
    body: "",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/v1/client-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Failed to add memory");
          return;
        }
        setForm({ ...form, title: "", body: "" });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Add Client Memory</h2>
        <p className="mt-0.5 text-xs text-slate-500">Stores scoped facts, notes, decisions, and preferences for agents.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="note">Note</option>
          <option value="fact">Fact</option>
          <option value="preference">Preference</option>
          <option value="decision">Decision</option>
          <option value="credential_hint">Credential hint</option>
        </select>
        <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
        <textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Memory body" rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save memory"}</Button></div>
    </form>
  );
}
