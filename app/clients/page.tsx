import Link from "next/link";
import { ClientForm } from "@/components/ClientForm";
import { ClientFileForm } from "@/components/ClientFileForm";
import { ClientMemoryForm } from "@/components/ClientMemoryForm";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { listClients, getClientContext, listClientFiles, listClientMemory } from "@/lib/clawbot-service";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  const [contexts, memoryItems, files] = await Promise.all([
    Promise.all(clients.map((client) => getClientContext(client.id))),
    listClientMemory(),
    listClientFiles(),
  ]);
  const contextByClient = new Map(contexts.filter(Boolean).map((context) => [context!.clientId, context!]));

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Clients</h1>
        <p className="mt-0.5 text-sm text-slate-400">Isolated operating contexts for recruiting, AI/web services, internal work, and future agents.</p>
      </div>
      <ClientForm />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ClientMemoryForm clients={clients} />
        <ClientFileForm clients={clients} />
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-slate-800 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Client</span><span>Type</span><span>Contact</span><span>Status</span><span>Context</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {clients.length === 0 ? (
            <EmptyState icon={Building2} title="No clients yet" description="Create the first client context to scope agent memory and work." />
          ) : clients.map((client) => {
            const context = contextByClient.get(client.id);
            return (
              <div key={client.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-start hover:bg-slate-800/30 transition-colors">
                <div>
                  <Link href={`/clients/${client.id}`} className="text-sm font-medium text-slate-200 hover:text-indigo-300">{client.name}</Link>
                  <p className="text-xs text-slate-500">{client.id}</p>
                </div>
                <span className="text-xs text-slate-400 capitalize">{client.type.replace(/_/g, " ")}</span>
                <div>
                  <p className="text-sm text-slate-300">{client.primaryContact || "-"}</p>
                  <p className="text-xs text-slate-500">{client.contactEmail || ""}</p>
                </div>
                <StatusBadge status={client.status} />
                <p className="line-clamp-2 text-xs text-slate-400">{context?.summary || client.notes || "No context yet."}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Recent Memory</h2>
          <div className="mt-3 space-y-3">
            {memoryItems.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-200">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.body}</p>
              </div>
            ))}
            {memoryItems.length === 0 && <p className="text-xs text-slate-500">No client memory yet.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Client Files</h2>
          <div className="mt-3 space-y-3">
            {files.slice(0, 8).map((file) => (
              <div key={file.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-200">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{file.kind}{file.url ? ` · ${file.url}` : ""}</p>
              </div>
            ))}
            {files.length === 0 && <p className="text-xs text-slate-500">No client files registered yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
