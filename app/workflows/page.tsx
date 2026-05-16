import { ArrowRight } from "lucide-react";
import { getDataSourceLabel, getWorkflows } from "@/lib/clawbot-data";
import type { WorkflowDefinition } from "@/lib/clawbot-service";

const WORKFLOWS = [
  {
    id: "lead-intake",
    name: "Lead Intake → Discovery",
    description: "A new lead enters via webhook or manual intake. Supervisor Claw routes to Intake Discovery Claw which produces a structured discovery packet.",
    steps: [
      { agent: "Supervisor Claw", action: "Lead received, validates and routes", role: "supervisor" },
      { agent: "Intake Discovery Claw", action: "Runs discovery, produces packet", role: "specialist" },
      { agent: "Supervisor Claw", action: "Reviews discovery, gates approval", role: "supervisor" },
      { agent: "Human Operator", action: "Approves discovery packet", role: "human" },
    ],
    output: "Discovery Packet (summary, assumptions, deliverables, open questions, risks)",
    status: "active"
  },
  {
    id: "discovery-proposal",
    name: "Discovery → Proposal",
    description: "An approved discovery packet is handed off to Sales Proposal Claw which generates a structured sales proposal for the client.",
    steps: [
      { agent: "Supervisor Claw", action: "Handoff from discovery to sales", role: "supervisor" },
      { agent: "Sales Proposal Claw", action: "Generates proposal from discovery data", role: "specialist" },
      { agent: "Supervisor Claw", action: "Reviews proposal quality", role: "supervisor" },
      { agent: "Human Operator", action: "Approves proposal for delivery", role: "human" },
    ],
    output: "Sales Proposal Packet (pricing, scope, timeline, recommended next steps)",
    status: "active"
  },
  {
    id: "discovery-web-strategy",
    name: "Discovery → Web Strategy",
    description: "An approved discovery packet is handed off to Web Design Strategy Claw which generates a website strategy brief for web projects.",
    steps: [
      { agent: "Supervisor Claw", action: "Handoff from discovery to web strategy", role: "supervisor" },
      { agent: "Web Design Strategy Claw", action: "Generates strategy brief and sitemap", role: "specialist" },
      { agent: "Supervisor Claw", action: "Reviews strategy brief quality", role: "supervisor" },
      { agent: "Human Operator", action: "Approves strategy brief", role: "human" },
    ],
    output: "Web Strategy Brief (sitemap, UX recommendations, tech stack, timeline)",
    status: "active"
  }
];

const ROLE_COLORS: Record<string, string> = {
  supervisor: "bg-purple-900/40 border-purple-800 text-purple-300",
  specialist: "bg-indigo-900/40 border-indigo-800 text-indigo-300",
  human: "bg-emerald-900/40 border-emerald-800 text-emerald-300",
};

export default async function WorkflowsPage() {
  const { workflows, source } = await getWorkflows();
  const workflowMap = (workflows || []).reduce<Record<string, WorkflowDefinition>>((acc, workflow) => {
    acc[workflow.id] = workflow;
    return acc;
  }, {});
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">MVP Workflows</h1>
        <p className="text-sm text-slate-400 mt-0.5">The 3 core Clawbot operating workflows for Alivio · {getDataSourceLabel(source)}</p>
      </div>
      <div className="space-y-4">
        {WORKFLOWS.map((wf) => (
          <div key={wf.id} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">{workflowMap[wf.id]?.name || wf.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{workflowMap[wf.id]?.description || wf.description}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-800 text-emerald-400 shrink-0 ml-4">Active</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {wf.steps.map((step, i) => (
                  <div key={`${wf.id}-${step.action}`} className="flex items-center gap-2">
                    <div className={`rounded-lg border px-3 py-2 text-xs ${ROLE_COLORS[step.role]}`}>
                      <p className="font-semibold">{step.agent}</p>
                      <p className="opacity-70 mt-0.5">{step.action}</p>
                    </div>
                    {i < wf.steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                <span className="text-slate-400 font-medium">Output: </span>{workflowMap[wf.id]?.output || wf.output}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
