# Clawbot n8n Workflow Templates

Import these JSON files into n8n as starter workflows.

## Agent Job Dry Run

File:

```text
clawbot-agent-job-dry-run.json
```

Purpose:

- Receives jobs from `clawbot-worker`.
- Builds a dry-run result.
- Calls back to Clawbot through `/api/v1/integrations/n8n/agent-job-callback`.

Required n8n environment:

```bash
CLAWBOT_PUBLIC_URL=http://clawbot:3000
CLAWBOT_WORKER_API_KEY=...
```

Set Clawbot:

```bash
N8N_AGENT_JOB_WEBHOOK_URL=http://n8n:5678/webhook/clawbot-agent-job
```

## Approved Outbound Send Template

File:

```text
clawbot-outbound-send-template.json
```

Purpose:

- Receives approved outbound email payloads from Clawbot.
- Currently returns a dry-run response.
- Replace the dry-run Code node with Gmail, Postmark, SendGrid, or Microsoft 365 before live sending.

Set Clawbot:

```bash
N8N_OUTBOUND_SEND_WEBHOOK_URL=http://n8n:5678/webhook/clawbot-outbound-send
```
