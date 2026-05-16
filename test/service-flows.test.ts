import { describe, expect, it, beforeEach } from "vitest";
import {
  cancelRun,
  createLead,
  getState,
  resetAppStateForTests,
  respondToApproval,
  retryRun,
} from "@/lib/clawbot-service";

describe("Clawbot service flows", () => {
  beforeEach(() => {
    resetAppStateForTests();
  });

  it("creates a lead and starts the intake workflow", async () => {
    const result = await createLead({
      companyName: "Acme Mechanical",
      contactEmail: "ops@acme.example",
      serviceInterest: "proposal_generation",
    });

    const state = await getState();
    expect(result.lead.companyName).toBe("Acme Mechanical");
    expect(result.run?.leadId).toBe(result.lead.id);
    expect(state.runs.some((run) => run.leadId === result.lead.id && run.workflowId === "lead-intake")).toBe(true);
    expect(state.approvals.some((approval) => approval.runId === result.run?.id && approval.status === "pending")).toBe(true);
    expect(state.deliverables.some((deliverable) => deliverable.runId === result.run?.id)).toBe(true);
  });

  it("approval decisions cascade to run, tasks, deliverable, handoff, and lead", async () => {
    const created = await createLead({
      companyName: "Cascade Co",
      serviceInterest: "proposal_generation",
    });
    const stateBefore = await getState();
    const approval = stateBefore.approvals.find((item) => item.runId === created.run?.id);
    expect(approval).toBeTruthy();

    await respondToApproval(approval!.id, { decision: "approved", reviewedBy: "reviewer@example.com" });

    const state = await getState();
    const run = state.runs.find((item) => item.id === created.run?.id);
    const lead = state.leads.find((item) => item.id === created.lead.id);
    expect(run?.status).toBe("completed");
    expect(state.tasks.filter((task) => task.runId === run?.id).every((task) => task.status === "done")).toBe(true);
    expect(state.deliverables.find((deliverable) => deliverable.runId === run?.id)?.status).toBe("delivered");
    expect(state.handoffs.find((handoff) => handoff.runId === run?.id)?.status).toBe("completed");
    expect(lead?.status).toBe("qualified");
    expect(state.runs.some((item) => item.leadId === lead?.id && item.workflowId === "discovery-proposal")).toBe(true);
  });

  it("cancels and retries a run", async () => {
    const created = await createLead({ companyName: "Retry Co" });
    await cancelRun(created.run!.id);
    let state = await getState();
    expect(state.runs.find((run) => run.id === created.run!.id)?.status).toBe("paused");
    expect(state.approvals.filter((approval) => approval.runId === created.run!.id && approval.status === "pending")).toHaveLength(0);

    await retryRun(created.run!.id);
    state = await getState();
    const retried = state.runs.find((run) => run.id === created.run!.id);
    expect(retried?.status).toBe("running");
    expect(retried?.progress).toBe(20);
    expect(retried?.completedAt).toBeUndefined();
  });
});
