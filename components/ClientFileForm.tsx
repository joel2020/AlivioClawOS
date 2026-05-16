"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ClientAccount } from "@/lib/types";

export function ClientFileForm({ clients, defaultClientId }: { clients: ClientAccount[]; defaultClientId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: defaultClientId || clients[0]?.id || "",
    kind: "document",
    name: "",
    url: "",
    notes: "",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/v1/client-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: form.clientId,
            kind: form.kind,
            name: form.name,
            url: form.url || undefined,
            notes: form.notes || undefined,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Failed to add file");
          return;
        }
        setForm({ ...form, name: "", url: "", notes: "" });
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Register Client File</h2>
        <p className="mt-0.5 text-xs text-slate-500">Stores file metadata or external document links for agent-safe client context.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500">
          <option value="document">Document</option>
          <option value="brief">Brief</option>
          <option value="deliverable">Deliverable</option>
          <option value="asset">Asset</option>
          <option value="other">Other</option>
        </select>
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="File name" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="URL or storage link" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-2" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Register file"}</Button></div>
    </form>
  );
}
