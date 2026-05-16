"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CrmAccount, CrmContact, CrmDeal } from "@/lib/types";

export function CrmForms({ accounts, contacts, deals }: { accounts: CrmAccount[]; contacts: CrmContact[]; deals: CrmDeal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState({ name: "", website: "", industry: "", notes: "" });
  const [contact, setContact] = useState({ accountId: accounts[0]?.id || "", name: "", email: "", title: "" });
  const [deal, setDeal] = useState({ accountId: accounts[0]?.id || "", contactId: "", name: "", value: "", stage: "new" });
  const [activity, setActivity] = useState({ accountId: accounts[0]?.id || "", contactId: "", dealId: "", type: "note", title: "", body: "" });

  function post(path: string, body: Record<string, unknown>, reset: () => void) {
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "CRM update failed");
          return;
        }
        reset();
        router.refresh();
      })();
    });
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    post("/api/v1/crm/accounts", account, () => setAccount({ name: "", website: "", industry: "", notes: "" }));
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    post("/api/v1/crm/contacts", contact, () => setContact({ ...contact, name: "", email: "", title: "" }));
  }

  function submitDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    post("/api/v1/crm/deals", { ...deal, value: Number(deal.value || 0) }, () => setDeal({ ...deal, name: "", value: "" }));
  }

  function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    post("/api/v1/crm/activities", activity, () => setActivity({ ...activity, title: "", body: "" }));
  }

  const inputClass = "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500";

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <form onSubmit={submitAccount} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">New Account</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input required value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} placeholder="Company name" className={inputClass} />
            <input value={account.website} onChange={(event) => setAccount({ ...account, website: event.target.value })} placeholder="Website" className={inputClass} />
            <input value={account.industry} onChange={(event) => setAccount({ ...account, industry: event.target.value })} placeholder="Industry" className={inputClass} />
            <input value={account.notes} onChange={(event) => setAccount({ ...account, notes: event.target.value })} placeholder="Notes" className={inputClass} />
          </div>
          <div className="flex justify-end"><Button disabled={pending}>Create account</Button></div>
        </form>

        <form onSubmit={submitContact} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">New Contact</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={contact.accountId} onChange={(event) => setContact({ ...contact, accountId: event.target.value })} className={inputClass}>
              <option value="">No account</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input required value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Name" className={inputClass} />
            <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="Email" className={inputClass} />
            <input value={contact.title} onChange={(event) => setContact({ ...contact, title: event.target.value })} placeholder="Title" className={inputClass} />
          </div>
          <div className="flex justify-end"><Button disabled={pending}>Create contact</Button></div>
        </form>

        <form onSubmit={submitDeal} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">New Deal</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select required value={deal.accountId} onChange={(event) => setDeal({ ...deal, accountId: event.target.value })} className={inputClass}>
              <option value="">Choose account</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={deal.contactId} onChange={(event) => setDeal({ ...deal, contactId: event.target.value })} className={inputClass}>
              <option value="">No contact</option>
              {contacts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input required value={deal.name} onChange={(event) => setDeal({ ...deal, name: event.target.value })} placeholder="Deal name" className={inputClass} />
            <input type="number" min="0" value={deal.value} onChange={(event) => setDeal({ ...deal, value: event.target.value })} placeholder="Value" className={inputClass} />
            <select value={deal.stage} onChange={(event) => setDeal({ ...deal, stage: event.target.value })} className={inputClass}>
              {["new", "discovery", "proposal", "negotiation", "won", "lost"].map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
          <div className="flex justify-end"><Button disabled={pending}>Create deal</Button></div>
        </form>

        <form onSubmit={submitActivity} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Log Activity</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={activity.accountId} onChange={(event) => setActivity({ ...activity, accountId: event.target.value })} className={inputClass}>
              <option value="">No account</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={activity.dealId} onChange={(event) => setActivity({ ...activity, dealId: event.target.value })} className={inputClass}>
              <option value="">No deal</option>
              {deals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={activity.type} onChange={(event) => setActivity({ ...activity, type: event.target.value })} className={inputClass}>
              {["note", "email", "call", "meeting", "task", "status_change"].map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
            </select>
            <input required value={activity.title} onChange={(event) => setActivity({ ...activity, title: event.target.value })} placeholder="Activity title" className={inputClass} />
            <textarea value={activity.body} onChange={(event) => setActivity({ ...activity, body: event.target.value })} placeholder="Details" rows={3} className={`${inputClass} sm:col-span-2`} />
          </div>
          <div className="flex justify-end"><Button disabled={pending}>Log activity</Button></div>
        </form>
      </div>
    </div>
  );
}
