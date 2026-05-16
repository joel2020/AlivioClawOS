# Clawbot Operator Dashboard

Production-facing operator UI for the Alivio orchestration stack.

## What it does

- Displays live runs, tasks, approvals, deliverables, leads, and logs from the control API
- Falls back to demo data only in non-production mode
- Exposes an operator shell for health, workflow, and service visibility

## Environment

- `NEXT_PUBLIC_API_URL` - base URL for the control API
- `NEXT_PUBLIC_CLAWBOT_DEMO_MODE` - set to `true` in development to use bundled demo data when the API is unavailable
- `LITELLM_URL` - optional public URL for the LiteLLM gateway link in Ops
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI resource endpoint, for example `https://<resource>.cognitiveservices.azure.com`
- `AZURE_OPENAI_API_VERSION` - Azure OpenAI API version, for example `2024-12-01-preview`
- `AZURE_OPENAI_DEPLOYMENT_NAME` - deployed model name, for example `gpt-5.5`
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token used for outbound messages and webhook replies
- `TELEGRAM_WEBHOOK_SECRET` - optional secret token checked on Telegram webhook requests
- `CLAWBOT_PUBLIC_URL` - public base URL used in outbound operator messages
- `CLAWBOT_OPERATOR_SECRET` - operator login secret used to protect the dashboard and API when enabled
- `DATABASE_URL` - Postgres connection string for durable production persistence
- `POSTGRES_PASSWORD` - password for the bundled Hostinger Compose Postgres service when not using an external `DATABASE_URL`
- `CLAWBOT_WORKER_API_KEY` - shared key for worker, n8n callback, and heartbeat APIs
- `OUTBOUND_SEND_WEBHOOK_URL` or `N8N_OUTBOUND_SEND_WEBHOOK_URL` - approved outbound email sender webhook
- `TELEGRAM_DIGEST_CHAT_ID` - optional chat ID for scheduled digest messages
- `TELEGRAM_POLL_MS` - optional long-polling loop delay for the Telegram bot

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm test
npm run start
```

## Production database

Postgres is the production persistence path. Set `DATABASE_URL`, run migrations, and import the current Clawbot state:

```bash
npm run db:migrate
npm run db:import
```

For Docker Compose deployments, `clawbot-db-migrate` runs `npm run db:bootstrap` automatically. It applies migrations and imports JSON/seed state only when the database is empty.

See `PRODUCTION.md` for required environment variables, migration order, backup/restore, and rollback notes.

## Tests

```bash
npm test
```

The test suite covers lead intake, approval cascades, run cancel/retry, auth login/logout, permission enforcement, Telegram webhook hardening, and a DB persistence smoke path.

## Company OS spine

The dashboard now includes:

- `Clients` for isolated client/company operating contexts
- per-client workspaces at `/clients/:id` for CRM, memory, files, jobs, outbound, runs, approvals, and activity
- `CRM` for accounts, contacts, deals, and activities visible from the dashboard
- `Agent Jobs` for scoped work requests to SDR, recruiting, SEO, inbox, delivery, and future voice agents
- `Outbound` for approval-gated email drafts and sends
- `Audit` for durable security and operator events
- client memory/file registries for scoped agent context

These are control-plane primitives. Long-running agents should run as workers, n8n workflows, or external services and coordinate through the Clawbot API/database instead of running inside the UI process.

## Hostinger deployment scaffold

```bash
docker compose -f deploy/hostinger-company-os.compose.yml up -d --build
```

The scaffold runs Clawbot, Postgres, Redis, n8n, the worker, and the Telegram long-polling bot. For higher durability, you can still point `DATABASE_URL` at Azure Database for PostgreSQL instead of the bundled Postgres container.

Run the worker directly:

```bash
npm run worker
```

The worker claims queued jobs and dispatches to `AGENT_JOB_WEBHOOK_URL`, `N8N_AGENT_JOB_WEBHOOK_URL`, or `AGENT_ZERO_WEBHOOK_URL`.

Scheduled digest:

```bash
npm run digest:telegram
```

Run the Telegram bot in OpenClaw/Hermes-style long-polling mode:

```bash
npm run telegram:poll
```

In Docker Compose this runs as the `clawbot-telegram` service.

## Notes

- The app is API-first in production.
- Demo content is intentionally disabled in production so the UI never pretends mocked data is live operational state.
- Loading, error, and not-found states are included for operator safety.
- Telegram is the interactive operator channel.
- Telegram can run via webhook or continuous long polling on the VPS.
- Discord is used for mirrored operational notifications through the configured webhook.
- `proxy.ts` handles browser auth gating; sensitive API writes also enforce server-side RBAC.
- Rate limiting protects auth, Telegram webhook, and sensitive mutation routes. Production Telegram webhooks require `TELEGRAM_WEBHOOK_SECRET`.
- `/ops` shows worker heartbeats from the built-in worker/runtime callbacks.
- Lead intake automatically creates CRM account/contact/deal/activity records.
