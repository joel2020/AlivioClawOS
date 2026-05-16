import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Package, FileText, Code, BarChart2, AlignLeft, Download } from "lucide-react";
import Link from "next/link";
import { getDataSourceLabel, getDeliverables } from "@/lib/clawbot-data";

const TYPE_ICON: Record<string, React.ElementType> = { file: Package, report: FileText, code: Code, data: BarChart2, summary: AlignLeft };
function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

export default async function DeliverablesPage() {
  const { deliverables, source } = await getDeliverables();
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Deliverables</h1>
        <p className="text-sm text-slate-400 mt-0.5">{deliverables.length} artifacts · {getDataSourceLabel(source)}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Name", "Type", "Run", "Status", "Size", "Created", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliverables.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No deliverables available"
                      description="Generated files, reports, and exports will show up here once runs complete."
                    />
                  </td>
                </tr>
              ) : deliverables.map((d) => {
                const Icon = TYPE_ICON[d.type] ?? Package;
                return (
                  <tr key={d.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" /><span className="font-medium text-slate-200 font-mono text-xs">{d.name}</span></div></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-500 capitalize">{d.type}</span></td>
                    <td className="px-4 py-3"><Link href={"/runs/" + d.runId} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-[140px] block">{d.runName}</Link></td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.sizeBytes ? formatBytes(d.sizeBytes) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">{d.url && <button className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"><Download className="h-3 w-3" />Download</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
