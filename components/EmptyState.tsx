import type { LucideIcon } from "lucide-react";
interface Props { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      {Icon && <div className="rounded-xl bg-slate-800 p-4"><Icon className="h-8 w-8 text-slate-500" /></div>}
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
