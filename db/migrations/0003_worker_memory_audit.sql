ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS locked_by text;
ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS error text;

CREATE TABLE IF NOT EXISTS client_memory_items (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS client_files (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  url text,
  content_type text,
  size_bytes integer,
  notes text,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_memory_items_client_id ON client_memory_items(client_id);
CREATE INDEX IF NOT EXISTS idx_client_files_client_id ON client_files(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_locked_by ON agent_jobs(locked_by);

UPDATE roles
SET permissions = ARRAY['leads:create','runs:write','approvals:review','settings:write','logs:read','clients:write','agent_jobs:write','agent_jobs:execute','audit:read','client_memory:write']
WHERE id = 'role-operator';

UPDATE roles
SET permissions = ARRAY['approvals:review','runs:read','logs:read','agent_jobs:write','agent_jobs:execute','audit:read']
WHERE id = 'role-reviewer';

UPDATE roles
SET permissions = ARRAY['runs:read','logs:read','audit:read']
WHERE id = 'role-viewer';
