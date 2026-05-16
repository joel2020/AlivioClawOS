import { beforeEach, describe, expect, it } from "vitest";
import {
  createAgentJob,
  createClient,
  addClientMemory,
  addClientFile,
  claimNextAgentJob,
  completeAgentJob,
  getClientContext,
  getClientWorkspace,
  listClientMemory,
  listAgentDefinitions,
  listAgentJobs,
  listClients,
  listOutboundMessages,
  listWorkerHeartbeats,
  createCrmAccount,
  createCrmActivity,
  createCrmContact,
  createCrmDeal,
  createLead,
  draftOutboundMessage,
  getCrmSnapshot,
  recordWorkerHeartbeat,
  respondToApproval,
  sendApprovedOutboundMessage,
  resetAppStateForTests,
} from "@/lib/clawbot-service";

describe("company OS spine", () => {
  beforeEach(() => {
    resetAppStateForTests();
  });

  it("creates an isolated client context", async () => {
    const created = await createClient({
      name: "Northstar Recruiting",
      type: "recruiting",
      primaryContact: "Avery",
      contactEmail: "avery@example.com",
      notes: "Recruiting client focused on HVAC placements.",
    });

    const clients = await listClients();
    const context = await getClientContext(created.client.id);

    expect(clients.some((client) => client.id === created.client.id)).toBe(true);
    expect(context?.clientId).toBe(created.client.id);
    expect(context?.summary).toContain("Recruiting client");
    expect(context?.memory.clientType).toBe("recruiting");
  });

  it("creates agent jobs scoped to client context and blocks high-risk agents", async () => {
    const created = await createClient({ name: "Outbound Client", type: "web_ai_services" });
    const agents = await listAgentDefinitions();
    const sdr = agents.find((agent) => agent.kind === "sdr");
    expect(sdr).toBeTruthy();

    const job = await createAgentJob({
      agentId: sdr!.id,
      clientId: created.client.id,
      title: "Draft outbound sequence",
      input: { segment: "commercial HVAC" },
    });

    const jobs = await listAgentJobs();
    expect(jobs[0].id).toBe(job.id);
    expect(job.clientId).toBe(created.client.id);
    expect(job.status).toBe("blocked");
    expect(job.input.approvalRequiredFor).toEqual(sdr!.requiresApprovalFor);
  });

  it("stores client memory and executes a queued agent job", async () => {
    const created = await createClient({ name: "Delivery Client", type: "web_ai_services" });
    const memory = await addClientMemory({
      clientId: created.client.id,
      kind: "fact",
      title: "Primary offer",
      body: "Client sells AI-enabled service delivery packages.",
    });
    expect(memory.id).toMatch(/^mem-/);
    expect((await listClientMemory(created.client.id))).toHaveLength(1);

    const agents = await listAgentDefinitions();
    const seo = agents.find((agent) => agent.kind === "seo");
    const job = await createAgentJob({
      agentId: seo!.id,
      clientId: created.client.id,
      title: "Prepare SEO brief",
    });
    expect(job.status).toBe("queued");

    const claimed = await claimNextAgentJob("test-worker", seo!.id);
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.status).toBe("running");

    const completed = await completeAgentJob(job.id, { brief: "done" }, "test-worker");
    expect(completed.status).toBe("completed");
    expect(completed.output?.brief).toBe("done");
  });

  it("approval-gates outbound email before send", async () => {
    const created = await createClient({ name: "Outbound Approval Client", type: "web_ai_services" });
    const draft = await draftOutboundMessage({
      clientId: created.client.id,
      to: "buyer@example.com",
      subject: "Quick idea",
      body: "I can help tighten the intake workflow.",
    }, "operator@example.com");

    expect(draft.message.status).toBe("pending_approval");
    await expect(sendApprovedOutboundMessage(draft.message.id, "operator@example.com")).rejects.toThrow("must be approved");

    await respondToApproval(draft.approval.id, { decision: "approved", reviewedBy: "reviewer@example.com" });
    const approved = (await listOutboundMessages()).find((message) => message.id === draft.message.id);
    expect(approved?.status).toBe("approved");

    const sent = await sendApprovedOutboundMessage(draft.message.id, "operator@example.com");
    expect(sent.status).toBe("sent");
    expect(sent.metadata.sendMode).toBe("dry_run");
  });

  it("records worker heartbeat status", async () => {
    const heartbeat = await recordWorkerHeartbeat("worker-test", "online", "job-123", { version: "test" });
    expect(heartbeat.workerId).toBe("worker-test");
    expect(heartbeat.currentJobId).toBe("job-123");

    await recordWorkerHeartbeat("worker-test", "degraded", undefined, { error: "n8n unavailable" });
    const workers = await listWorkerHeartbeats();
    expect(workers).toHaveLength(1);
    expect(workers[0].status).toBe("degraded");
    expect(workers[0].metadata.error).toBe("n8n unavailable");
  });

  it("syncs lead intake into CRM accounts contacts deals and activity", async () => {
    const created = await createLead({
      companyName: "Pipeline Prospect",
      contactName: "Riley Buyer",
      contactEmail: "riley@example.com",
      source: "referral",
      serviceInterest: "proposal_generation",
      autoStartWorkflow: false,
    });

    const crm = await getCrmSnapshot();
    expect(crm.accounts.some((account) => account.leadId === created.lead.id && account.name === "Pipeline Prospect")).toBe(true);
    expect(crm.contacts.some((contact) => contact.leadId === created.lead.id && contact.email === "riley@example.com")).toBe(true);
    expect(crm.deals.some((deal) => deal.leadId === created.lead.id && deal.stage === "new")).toBe(true);
    expect(crm.activities.some((activity) => activity.leadId === created.lead.id && activity.title === "Lead captured in CRM")).toBe(true);
  });

  it("creates CRM records manually", async () => {
    const account = await createCrmAccount({ name: "Manual Account", industry: "Recruiting" }, "operator@example.com");
    const contact = await createCrmContact({ accountId: account.id, name: "Morgan Contact", email: "morgan@example.com" }, "operator@example.com");
    const deal = await createCrmDeal({ accountId: account.id, contactId: contact.id, name: "Retained search", value: 12000, stage: "discovery" }, "operator@example.com");
    const activity = await createCrmActivity({ accountId: account.id, contactId: contact.id, dealId: deal.id, type: "call", title: "Discovery call completed" }, "operator@example.com");

    const crm = await getCrmSnapshot();
    expect(crm.accounts[0].id).toBe(account.id);
    expect(crm.contacts[0].id).toBe(contact.id);
    expect(crm.deals[0].value).toBe(12000);
    expect(crm.activities[0].id).toBe(activity.id);
  });

  it("builds a complete client workspace", async () => {
    const created = await createClient({ name: "Workspace Client", type: "web_ai_services", primaryContact: "Dana", contactEmail: "dana@example.com" });
    const account = (await getCrmSnapshot()).accounts.find((item) => item.clientId === created.client.id);
    expect(account).toBeTruthy();

    await addClientMemory({ clientId: created.client.id, title: "Decision", body: "Prioritize SDR automation.", kind: "decision" });
    await addClientFile({ clientId: created.client.id, name: "Discovery notes", kind: "brief", url: "https://example.com/notes" });
    const agents = await listAgentDefinitions();
    await createAgentJob({ agentId: agents.find((agent) => agent.kind === "seo")!.id, clientId: created.client.id, title: "SEO audit" });
    await createCrmDeal({ accountId: account!.id, name: "Website rebuild", value: 15000, stage: "proposal" });
    await draftOutboundMessage({ clientId: created.client.id, to: "dana@example.com", subject: "Next steps", body: "Here are the next steps." });

    const workspace = await getClientWorkspace(created.client.id);
    expect(workspace?.client.id).toBe(created.client.id);
    expect(workspace?.memory).toHaveLength(1);
    expect(workspace?.files).toHaveLength(1);
    expect(workspace?.agentJobs).toHaveLength(1);
    expect(workspace?.crm.deals.some((deal) => deal.name === "Website rebuild")).toBe(true);
    expect(workspace?.outboundMessages).toHaveLength(1);
    expect(workspace?.approvals.some((approval) => approval.title === "Approve outbound email")).toBe(true);
  });
});
