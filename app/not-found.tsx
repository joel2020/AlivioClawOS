import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          description="The route does not exist or the item has been removed."
          action={<Link href="/dashboard" className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-500 px-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors">Back to dashboard</Link>}
        />
      </div>
    </div>
  );
}
