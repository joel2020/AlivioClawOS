# Clawbot Handoff

Current state:
- The Next.js app builds and lints cleanly.
- The UI is live-backed through local API routes instead of mock-only pages.
- Production persistence uses Postgres. The Hostinger Compose stack includes a bundled Postgres service by default, and `DATABASE_URL` can point to Azure Database for PostgreSQL or another managed database.
- Local fallback can still use `data/clawbot-state.json`.
- Telegram is the primary operator command channel.
- Discord receives mirrored operational notifications.
- Operator auth supports named DB-backed operators and legacy `CLAWBOT_OPERATOR_SECRET` fallback.
- Server-side RBAC protects sensitive write routes.
- Durable audit events are stored in `audit_events`.
- Auth, Telegram webhook, and sensitive mutation routes are rate limited.
- Production Telegram webhooks require `TELEGRAM_WEBHOOK_SECRET`, and dangerous Telegram commands require an explicit sender/chat allowlist.
- Clients and client contexts now exist as first-class operating scopes.
- Each client has a detail workspace at `/clients/:id` that shows CRM, memory, files, agent jobs, outbound, runs, approvals, and activity.
- CRM accounts, contacts, deals, and activities are visible on `/crm` and summarized on `/dashboard`.
- Lead intake automatically creates CRM records.
- Agent definitions and agent jobs now exist as the queue/intake layer for specialized workers.
- Agent jobs can be claimed, completed, or failed through worker APIs.
- The built-in worker can dispatch jobs to n8n, Agent Zero, or a generic webhook.
- Outbound emails can be drafted, approval-gated, and sent through an n8n/generic webhook after approval.
- Worker heartbeats are recorded and visible on `/ops`.
- A Telegram daily digest script exists for cron/systemd timers.
- Client memory and client file metadata are now tracked.
- Audit events are visible at `/audit`.

Validated:
- `npm run lint`
- `npm test`
- `npm run build`

Key files:
- `lib/clawbot-service.ts`
- `lib/clawbot-db-state.ts`
- `lib/operator-rbac.ts`
- `lib/db.ts`
- `lib/clawbot-data.ts`
- `lib/operator-auth.ts`
- `proxy.ts`
- `app/api/v1/**`
- `db/migrations/0001_production_core.sql`
- `db/migrations/0002_company_os_spine.sql`
- `db/migrations/0003_worker_memory_audit.sql`
- `db/migrations/0004_outbound_worker_heartbeat.sql`
- `db/migrations/0005_crm_core.sql`
- `scripts/migrate-db.ts`
- `scripts/import-state.ts`
- `scripts/bootstrap-db.ts`
- `scripts/backup-state.ts`
- `scripts/restore-state.ts`
- `app/clients/page.tsx`
- `app/clients/[id]/page.tsx`
- `app/crm/page.tsx`
- `app/agent-jobs/page.tsx`
- `app/outbound/page.tsx`
- `deploy/hostinger-company-os.compose.yml`
- `scripts/agent-worker.ts`
- `scripts/daily-digest.ts`
- `app/audit/page.tsx`
- `app/api/v1/agent-jobs/claim/route.ts`
- `app/api/v1/integrations/n8n/agent-job-callback/route.ts`
- `app/api/v1/client-memory/route.ts`
- `app/api/v1/client-files/route.ts`
- `app/api/v1/audit-events/route.ts`
- `app/login/page.tsx`
- `components/Topbar.tsx`
- `components/SettingsForm.tsx`
- `components/LeadIntakeForm.tsx`
- `components/ApprovalActions.tsx`
- `components/RunActions.tsx`

What works:
- Lead intake creates leads and runs.
- Approvals can be approved or rejected.
- Runs can be cancelled or retried.
- Settings persist.
- Telegram webhook commands work.
- Telegram dangerous commands are production-gated by `TELEGRAM_ALLOWED_USER_IDS` or `TELEGRAM_ALLOWED_CHAT_IDS`.
- Discord outbound notifications work.
- Auth-protected dashboard login/logout works when enabled.
- Clients can be created as isolated operating contexts.
- CRM accounts, contacts, deals, and activities can be created manually.
- New leads sync into CRM automatically.
- Agent jobs can be created and scoped to clients.
- High-risk agent definitions create blocked jobs that require operator handling before execution.
- Queued low/medium risk jobs can be claimed by workers.
- Workers can complete/fail jobs and emit logs/audit events.
- Workers write heartbeat status to `/ops`.
- Outbound email drafts create approval records and cannot be sent until approved.
- Client memory can be added and displayed.

Current limitations:
- Rate limiting is Redis-backed in the Compose stack and falls back to process-local memory only when Redis is unavailable.
- Discord is outbound-only.
- Real CRM/email/document storage integrations are not wired.
- Agent Zero, browser automation, and voice workers still need real external implementations behind the webhook interfaces.
- Production outbound sending requires an external sender workflow behind `OUTBOUND_SEND_WEBHOOK_URL` or `N8N_OUTBOUND_SEND_WEBHOOK_URL`.
- Large file binary storage should be object storage; `client_files` stores metadata/URLs.

Recommended next step:
1. Set a strong `POSTGRES_PASSWORD` or point `DATABASE_URL` at Azure Database for PostgreSQL.
2. Deploy with named operator env vars.
3. Configure Telegram allowed sender/chat IDs.
4. Configure `CLAWBOT_WORKER_API_KEY` and worker webhook URLs.
5. Configure `OUTBOUND_SEND_WEBHOOK_URL` or `N8N_OUTBOUND_SEND_WEBHOOK_URL` before enabling production outbound send.
6. Import and activate the n8n workflow templates in `deploy/n8n-workflows`.
7. Add a cron/systemd timer for `npm run digest:telegram` if Telegram daily digest is desired.

Environment variables:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_CLAWBOT_DEMO_MODE`
- `LITELLM_URL`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT_NAME`
- `AZURE_OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CLAWBOT_PUBLIC_URL`
- `CLAWBOT_OPERATOR_SECRET`
- `DATABASE_URL`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `DATABASE_POOL_MAX`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CLAWBOT_ADMIN_EMAIL`
- `CLAWBOT_ADMIN_PASSWORD`
- `OPERATOR_SESSION_DAYS`
- `RATE_LIMIT_AUTH_ATTEMPTS`
- `RATE_LIMIT_AUTH_WINDOW_MS`
- `RATE_LIMIT_WEBHOOK_ACTIONS`
- `RATE_LIMIT_WEBHOOK_WINDOW_MS`
- `RATE_LIMIT_MUTATIONS`
- `RATE_LIMIT_MUTATION_WINDOW_MS`
- `TELEGRAM_ALLOWED_USER_IDS`
- `TELEGRAM_ALLOWED_CHAT_IDS`
- `REDIS_URL`
- `N8N_BASE_URL`
- `N8N_AGENT_JOB_WEBHOOK_URL`
- `AGENT_ZERO_WEBHOOK_URL`
- `AGENT_JOB_WEBHOOK_URL`
- `OUTBOUND_SEND_WEBHOOK_URL`
- `N8N_OUTBOUND_SEND_WEBHOOK_URL`
- `CLAWBOT_WORKER_API_KEY`
- `CLAWBOT_WORKER_ID`
- `CLAWBOT_WORKER_POLL_MS`
- `TELEGRAM_DIGEST_CHAT_ID`

Notes for a new machine:
- Open the same repo.
- Restore the same `.env.local`.
- Run `npm install` if dependencies are missing.
- Run `npm run build` and `npm run lint` after pulling changes.
