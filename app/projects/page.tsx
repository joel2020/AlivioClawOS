import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { FolderKanban, Play } from "lucide-react";
import { getDataSourceLabel, getProjects } from "@/lib/clawbot-data";

export default async function ProjectsPage() {
  const { projects, source } = await getProjects();
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
        <p className="text-sm text-slate-400 mt-0.5">{projects.length} projects · {getDataSourceLabel(source)}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900">
            <EmptyState title="No projects available" description="Project records will populate here once the API returns data." />
          </div>
        ) : projects.map((project) => (
          <div key={project.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-500/10 p-2"><FolderKanban className="h-4 w-4 text-indigo-400" /></div>
                <h3 className="text-sm font-semibold text-slate-100 leading-snug">{project.name}</h3>
              </div>
              <StatusBadge status={project.status as "running"} />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{project.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1"><Play className="h-3 w-3" />{project.runCount} runs</span>
              {project.lastRunAt && <span>Last: {formatDate(project.lastRunAt)}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
