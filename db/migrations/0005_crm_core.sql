CREATE TABLE IF NOT EXISTS crm_accounts (
  id text PRIMARY KEY,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  website text,
  industry text,
  status text NOT NULL,
  owner text NOT NULL,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id text PRIMARY KEY,
  account_id text REFERENCES crm_accounts(id) ON DELETE SET NULL,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_deals (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
  contact_id text REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  probability integer NOT NULL DEFAULT 10,
  expected_close_date date,
  owner text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
  id text PRIMARY KEY,
  account_id text REFERENCES crm_accounts(id) ON DELETE SET NULL,
  contact_id text REFERENCES crm_contacts(id) ON DELETE SET NULL,
  deal_id text REFERENCES crm_deals(id) ON DELETE SET NULL,
  lead_id text REFERENCES leads(id) ON DELETE SET NULL,
  type text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL,
  due_at timestamptz,
  created_by text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_accounts(status);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_client_id ON crm_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_lead_id ON crm_accounts(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account_id ON crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_deals_account_id ON crm_deals(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_account_id ON crm_activities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_occurred_at ON crm_activities(occurred_at DESC);

UPDATE roles
SET permissions = ARRAY['leads:create','runs:write','approvals:review','settings:write','logs:read','clients:write','agent_jobs:write','agent_jobs:execute','audit:read','client_memory:write','outbound:write','crm:write']
WHERE id = 'role-operator';

UPDATE roles
SET permissions = ARRAY['approvals:review','runs:read','logs:read','agent_jobs:write','agent_jobs:execute','audit:read','crm:write']
WHERE id = 'role-reviewer';
