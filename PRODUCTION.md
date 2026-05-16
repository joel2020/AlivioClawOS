# Clawbot Production Hardening

## Current Architecture

Clawbot remains a Next.js 16 App Router operator dashboard. The existing route and UI shape is preserved. Production persistence uses Postgres in the Hostinger Compose stack or any external Postgres database provided through `DATABASE_URL`; local development can still fall back to `data/clawbot-state.json`.

The service layer still exposes the same business operations:

- lead intake and workflow start
- approval decisions and cascades
- run cancel/retry
- settings updates
- client context isolation
- per-client workspaces for CRM, memory, files, jobs, outbound, runs, approvals, and activity
- agent job intake for SDR, recruiting, SEO, inbox, delivery, and future voice agents
- agent job claim/complete/fail worker lifecycle
- client memory and file registries
- CRM accounts, contacts, deals, and activities
- outbound email drafts with approval-gated sending
- worker heartbeat visibility
- audit event visibility
- list/read operations for operator pages

## Domain Model

The production schema is in `db/migrations/0001_production_core.sql`.

Core durable tables:

- `operators`, `roles`, `operator_roles`, `operator_sessions`
- `leads`, `projects`, `runs`, `tasks`, `approvals`, `deliverables`, `handoffs`
- `agents`, `workflows`, `logs`, `settings`, `service_health`
- `audit_events`, `notification_events`
- `clients`, `client_contexts`, `agent_definitions`, `agent_jobs`
- `client_memory_items`, `client_files`
- `crm_accounts`, `crm_contacts`, `crm_deals`, `crm_activities`
- `outbound_messages`, `worker_heartbeats`
- `app_state` for compatibility with the existing `AppState` service contract

The minimum-change persistence strategy is to keep `AppState` as the internal service contract, persist it to `app_state`, and also materialize the same data into normalized production tables for querying, auditing, and migration safety.

## Required Environment Variables

Production:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DATABASE_SSL="true"
DATABASE_SSL_REJECT_UNAUTHORIZED="false"
POSTGRES_PASSWORD="replace-with-strong-local-compose-password"
CLAWBOT_ADMIN_EMAIL="admin@example.com"
CLAWBOT_ADMIN_PASSWORD="replace-with-strong-password"
CLAWBOT_PUBLIC_URL="https://your-domain.example"
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_WEBHOOK_SECRET="replace-with-random-secret"
TELEGRAM_ALLOWED_USER_IDS="123456789"
TELEGRAM_ALLOWED_CHAT_IDS="-1001234567890"
AZURE_OPENAI_ENDPOINT="https://<resource>.cognitiveservices.azure.com"
AZURE_OPENAI_API_VERSION="2025-04-01-preview"
AZURE_OPENAI_DEPLOYMENT_NAME="..."
AZURE_OPENAI_API_KEY="..."
```

Optional:

```bash
DATABASE_POOL_MAX="10"
OPERATOR_SESSION_DAYS="14"
RATE_LIMIT_AUTH_ATTEMPTS="8"
RATE_LIMIT_AUTH_WINDOW_MS="900000"
RATE_LIMIT_WEBHOOK_ACTIONS="60"
RATE_LIMIT_WEBHOOK_WINDOW_MS="60000"
RATE_LIMIT_MUTATIONS="30"
RATE_LIMIT_MUTATION_WINDOW_MS="60000"
NEXT_PUBLIC_API_URL="https://your-domain.example/api/v1"
NEXT_PUBLIC_CLAWBOT_DEMO_MODE="false"
LITELLM_URL="..."
REDIS_URL="redis://redis:6379"
N8N_BASE_URL="http://n8n:5678"
N8N_AGENT_JOB_WEBHOOK_URL="https://n8n.example.com/webhook/clawbot-agent-job"
AGENT_ZERO_WEBHOOK_URL="https://agent-zero.example.com/jobs"
AGENT_JOB_WEBHOOK_URL="https://worker.example.com/jobs"
OUTBOUND_SEND_WEBHOOK_URL="https://n8n.example.com/webhook/clawbot-outbound-send"
N8N_OUTBOUND_SEND_WEBHOOK_URL="https://n8n.example.com/webhook/clawbot-outbound-send"
CLAWBOT_WORKER_API_KEY="replace-with-random-worker-secret"
CLAWBOT_WORKER_ID="hostinger-worker-1"
CLAWBOT_WORKER_POLL_MS="5000"
TELEGRAM_DIGEST_CHAT_ID="-1001234567890"
TELEGRAM_POLL_MS="1000"
```

Legacy fallback:

```bash
CLAWBOT_OPERATOR_SECRET="..."
```

`CLAWBOT_OPERATOR_SECRET` remains supported for local fallback, but production should use named operators bootstrapped through `CLAWBOT_ADMIN_EMAIL` and `CLAWBOT_ADMIN_PASSWORD`.

`TELEGRAM_WEBHOOK_SECRET` is required for webhook mode in production. Dangerous Telegram commands (`/approve`, `/reject`, `/cancel`, `/retry`) are always rejected in production unless the Telegram sender ID is listed in `TELEGRAM_ALLOWED_USER_IDS` or the chat ID is listed in `TELEGRAM_ALLOWED_CHAT_IDS`. Free-text AI assistant chat is read-only; it is allowed when no allowlist is configured, but for real production you should still set an allowlist so business context is not exposed to unexpected Telegram users.

Rate limiting uses Redis counters when `REDIS_URL` is configured and falls back to process-local in-memory counters if Redis is unavailable. Use Redis or an edge/proxy limiter for multi-instance production so limits are global.

## Migration Order

1. Provision Postgres, for example Azure Database for PostgreSQL.
2. Set `DATABASE_URL` and production env vars.
3. Apply migrations:

```bash
npm run db:migrate
```

This applies:

- `0001_production_core.sql`
- `0002_company_os_spine.sql`
- `0003_worker_memory_audit.sql`
- `0004_outbound_worker_heartbeat.sql`
- `0005_crm_core.sql`

4. Import existing state. If `data/clawbot-state.json` exists:

```bash
npm run db:import
```

Or import an explicit file:

```bash
npm run db:import -- /path/to/clawbot-state.json
```

If no JSON state file exists, the importer seeds the current bundled Clawbot state.

For Docker Compose deployments, use the idempotent bootstrap command instead:

```bash
npm run db:bootstrap
```

The `clawbot-db-migrate` service runs this automatically before `clawbot`, `clawbot-worker`, and `clawbot-telegram` start. It applies migrations and imports JSON/seed state only when `app_state` is empty, so normal redeploys do not overwrite live data.

5. Verify:

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
```

6. Start production:

```bash
npm run start
```

Worker process:

```bash
npm run worker
```

Single worker tick:

```bash
npm run worker:once
```

Telegram digest:

```bash
npm run digest:telegram
```

Telegram long-polling bot:

```bash
npm run telegram:poll
```

## Hostinger VPS Topology

The repo includes a Hostinger-oriented Docker Compose scaffold:

```bash
docker compose -f deploy/hostinger-company-os.compose.yml up -d --build
```

It runs:

- `clawbot` - Next.js command center
- `postgres` - durable database for Clawbot state
- `clawbot-db-migrate` - one-shot idempotent migration/bootstrap job
- `redis` - local queue/rate-limit/lock foundation
- `n8n` - automation glue for Gmail, CRM, Hostinger snapshots, webhooks, and external systems
- `clawbot-worker` - polls/claims queued agent jobs and dispatches them to n8n, Agent Zero, or a configured worker webhook
- `clawbot-telegram` - keeps the Telegram bot alive in long-polling mode using `getUpdates`

Set a strong `POSTGRES_PASSWORD` before first boot if you use the bundled Postgres service. For higher durability, point `DATABASE_URL` at Azure Database for PostgreSQL and keep `DATABASE_SSL=true`. Use Hostinger snapshots before major deploys. Agent Zero, browser workers, voice services, and scrapers should run as separate services that read/write through Clawbot APIs and the `agent_jobs` queue rather than being embedded into the dashboard process.

## Telegram Runtime

BotFather only provides the bot token. The VPS still needs a receiver running 24/7. Clawbot supports both production patterns:

1. Long polling, recommended when you want the VPS to behave like OpenClaw/Hermes:

```bash
npm run telegram:poll
```

The Docker Compose scaffold runs this as `clawbot-telegram` with `restart: unless-stopped`.

2. Webhook, recommended when you have a stable public HTTPS URL:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$CLAWBOT_PUBLIC_URL/api/v1/integrations/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

Use one receiver mode at a time. If using long polling, clear any existing webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook?drop_pending_updates=false"
```

Free-text Telegram messages are routed to Azure OpenAI with live Clawbot context. Mutating actions remain slash-command gated.

### Systemd Alternative

If you are not using Docker Compose, create `/etc/systemd/system/clawbot-telegram.service`:

```ini
[Unit]
Description=Clawbot Telegram long-polling bot
After=network-online.target

[Service]
WorkingDirectory=/root/clawbot/clawbot-ui
EnvironmentFile=/root/clawbot/clawbot-ui/.env.production
ExecStart=/usr/bin/npm run telegram:poll
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then run:

```bash
systemctl daemon-reload
systemctl enable --now clawbot-telegram
systemctl status clawbot-telegram
```

## Worker And Callback API

Worker endpoints require `CLAWBOT_WORKER_API_KEY` in production:

```bash
POST /api/v1/agent-jobs/claim
POST /api/v1/agent-jobs/:id/complete
POST /api/v1/agent-jobs/:id/fail
POST /api/v1/integrations/n8n/agent-job-callback
```

Headers:

```bash
x-clawbot-worker-key: $CLAWBOT_WORKER_API_KEY
x-clawbot-worker-id: hostinger-worker-1
```

The built-in worker dispatches a claimed job to the first configured webhook:

1. `AGENT_JOB_WEBHOOK_URL`
2. `N8N_AGENT_JOB_WEBHOOK_URL`
3. `AGENT_ZERO_WEBHOOK_URL`

If no webhook is configured, the worker completes the job in dry-run mode so the queue can be tested end to end.

Workers also write heartbeats into `worker_heartbeats`, visible on `/ops`, before polling, while running a job, and after success/failure.

## Outbound Email

Outbound email is intentionally approval-gated:

```bash
GET /api/v1/outbound-messages
POST /api/v1/outbound-messages
POST /api/v1/outbound-messages/:id/send
```

Creating a message creates a pending approval. The send endpoint rejects unapproved messages. In production, sending requires `OUTBOUND_SEND_WEBHOOK_URL` or `N8N_OUTBOUND_SEND_WEBHOOK_URL`; the app posts the approved message payload to that webhook. In local development, no webhook means the send is recorded as `dry_run`.

## Client Memory And Files

Client-scoped memory and file records are available through:

```bash
GET /api/v1/client-memory?clientId=...
POST /api/v1/client-memory
GET /api/v1/client-files?clientId=...
POST /api/v1/client-files
```

These are metadata/control-plane records. Store large files in object storage and register their URLs in `client_files`.

## Audit Visibility

The dashboard includes `/audit`, backed by the durable `audit_events` table.

API:

```bash
GET /api/v1/audit-events?limit=100
```

## Rate Limiting

If `REDIS_URL` is set, rate limiting uses Redis counters. If Redis is unavailable, the app falls back to process-local in-memory counters and logs a warning.


## Rollback Notes

The migration is additive. The old JSON fallback path still exists.

To roll back from DB-backed persistence:

1. Stop the app.
2. Remove or unset `DATABASE_URL`.
3. Restore the last known `data/clawbot-state.json` backup if needed.
4. Restart the app.

Database rollback for the first migration:

```sql
DROP TABLE IF EXISTS notification_events;
DROP TABLE IF EXISTS worker_heartbeats;
DROP TABLE IF EXISTS outbound_messages;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS service_health;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS handoffs;
DROP TABLE IF EXISTS deliverables;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS runs;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS operator_sessions;
DROP TABLE IF EXISTS operator_roles;
DROP TABLE IF EXISTS operators;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS app_state;
DROP TABLE IF EXISTS schema_migrations;
```

Take a database backup before running destructive rollback SQL.

## Backup And Restore

Recommended daily backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file "clawbot-$(date +%F).dump"
```

Restore:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" clawbot-YYYY-MM-DD.dump
```

## Current Remaining Work

Implemented in this hardening pass:

- Postgres schema and migration runner
- JSON/import bootstrap into Postgres
- DB-backed service persistence when `DATABASE_URL` is configured
- operator identity/session tables
- server-side RBAC checks for sensitive write routes
- durable audit event table and logging hooks for core mutations
- `middleware.ts` migrated to `proxy.ts`
- rate limiting on auth, Telegram webhook, and sensitive mutations
- production Telegram secret enforcement and explicit dangerous-command allowlist
- focused automated tests for service flows, auth/permission routes, Telegram enforcement, and persistence smoke coverage
- client context model for isolated business/customer memory
- per-client workspace dashboard
- CRM accounts, contacts, deals, and activities
- agent definition and agent job queue primitives
- Hostinger Docker Compose scaffold for Clawbot, Postgres, Redis, n8n, worker, and Telegram long-polling
- idempotent Docker database bootstrap job
- worker lifecycle APIs and worker runner
- n8n/Agent Zero webhook dispatch path
- client memory/file registries
- audit dashboard
- Redis-backed rate limiting when `REDIS_URL` is configured
- JSON/Postgres snapshot backup and restore scripts

Still pending:

- broader automated tests for every UI page
- external CRM/email/document storage connectors beyond the built-in CRM/control-plane records
- real Agent Zero/browser/voice worker implementations behind the webhook interfaces
- object storage integration for large client files
