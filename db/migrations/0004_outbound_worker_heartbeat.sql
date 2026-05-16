ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_run_id_fkey;

CREATE TABLE IF NOT EXISTS outbound_messages (
  id text PRIMARY KEY,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  agent_job_id text REFERENCES agent_jobs(id) ON DELETE SET NULL,
  approval_id text REFERENCES approvals(id) ON DELETE SET NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  id text PRIMARY KEY,
  worker_id text UNIQUE NOT NULL,
  status text NOT NULL,
  last_seen_at timestamptz NOT NULL,
  current_job_id text,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_client_id ON outbound_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_lead_id ON outbound_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status ON worker_heartbeats(status);

UPDATE roles
SET permissions = ARRAY['leads:create','runs:write','approvals:review','settings:write','logs:read','clients:write','agent_jobs:write','agent_jobs:execute','audit:read','client_memory:write','outbound:write']
WHERE id = 'role-operator';
