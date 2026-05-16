CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  organization_id text NOT NULL DEFAULT 'org-default',
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  primary_contact text,
  contact_email text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS client_contexts (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  memory jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL,
  description text NOT NULL DEFAULT '',
  allowed_tools text[] NOT NULL DEFAULT '{}',
  risk_level text NOT NULL,
  requires_approval_for text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id text PRIMARY KEY,
  agent_id text NOT NULL REFERENCES agent_definitions(id) ON DELETE RESTRICT,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  run_id text,
  title text NOT NULL,
  status text NOT NULL,
  priority text NOT NULL,
  requested_by text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_client_id ON agent_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_id ON agent_jobs(agent_id);

UPDATE roles
SET permissions = ARRAY['leads:create','runs:write','approvals:review','settings:write','logs:read','clients:write','agent_jobs:write']
WHERE id = 'role-operator';

UPDATE roles
SET permissions = ARRAY['approvals:review','runs:read','logs:read','agent_jobs:write']
WHERE id = 'role-reviewer';
