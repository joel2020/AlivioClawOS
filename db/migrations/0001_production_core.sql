CREATE TABLE IF NOT EXISTS app_state (
  id text PRIMARY KEY DEFAULT 'default',
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operators (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_roles (
  operator_id text NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (operator_id, role_id)
);

CREATE TABLE IF NOT EXISTS operator_sessions (
  id text PRIMARY KEY,
  operator_id text NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  company_name text NOT NULL,
  source text NOT NULL,
  contact_name text,
  contact_email text,
  service_interest text NOT NULL,
  status text NOT NULL,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL,
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS runs (
  id text PRIMARY KEY,
  name text NOT NULL,
  project_id text,
  project_name text NOT NULL DEFAULT '',
  status text NOT NULL,
  workflow_id text,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  progress integer NOT NULL DEFAULT 0,
  agent_count integer NOT NULL DEFAULT 0,
  task_count integer NOT NULL DEFAULT 0,
  completed_tasks integer NOT NULL DEFAULT 0,
  cost numeric,
  triggered_by text NOT NULL DEFAULT 'api',
  model_alias text,
  summary text,
  agents jsonb NOT NULL DEFAULT '[]',
  tags text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL,
  assigned_agent text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  depends_on text[] NOT NULL DEFAULT '{}',
  output_summary text
);

CREATE TABLE IF NOT EXISTS approvals (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  run_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL,
  workflow_id text,
  step_key text,
  requested_at timestamptz NOT NULL,
  resolved_at timestamptz,
  requested_by text NOT NULL,
  resolved_by text,
  priority text NOT NULL
);

CREATE TABLE IF NOT EXISTS deliverables (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  run_name text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  workflow_id text,
  created_at timestamptz NOT NULL,
  size_bytes integer,
  url text,
  content text
);

CREATE TABLE IF NOT EXISTS handoffs (
  id text PRIMARY KEY,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  run_id text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  from_workflow_id text NOT NULL,
  to_workflow_id text,
  title text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  summary text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  status text NOT NULL,
  description text NOT NULL DEFAULT '',
  model_alias text NOT NULL DEFAULT '',
  capabilities text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS workflows (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  output text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS logs (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  agent_name text NOT NULL,
  level text NOT NULL,
  message text NOT NULL,
  workflow_id text,
  timestamp timestamptz NOT NULL,
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY DEFAULT 'default',
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_health (
  name text PRIMARY KEY,
  status text NOT NULL,
  latency_ms integer NOT NULL,
  uptime numeric NOT NULL,
  last_checked timestamptz NOT NULL,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor_id text,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS notification_events (
  id text PRIMARY KEY,
  channel text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  target_type text,
  target_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_operator_sessions_token_hash ON operator_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_operator_id ON operator_sessions(operator_id);
CREATE INDEX IF NOT EXISTS idx_runs_lead_id ON runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_approvals_run_id ON approvals(run_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_run_id ON deliverables(run_id);
CREATE INDEX IF NOT EXISTS idx_logs_run_id ON logs(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id);

INSERT INTO roles (id, name, permissions)
VALUES
  ('role-admin', 'admin', ARRAY['*']),
  ('role-operator', 'operator', ARRAY['leads:create','runs:write','approvals:review','settings:write','logs:read']),
  ('role-reviewer', 'reviewer', ARRAY['approvals:review','runs:read','logs:read']),
  ('role-viewer', 'viewer', ARRAY['runs:read','logs:read'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  permissions = EXCLUDED.permissions;
