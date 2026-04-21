-- ============================================================
-- CRM DATA LAKE DEMO — Schema
-- Supabase project: syfzhopufehgbiewsyjw
-- Created: 2026-04-03
-- All tables prefixed with demo_ to keep separate from production
-- ============================================================

-- COMPANIES (CRM mirror)
CREATE TABLE demo_companies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hubspot_id text UNIQUE NOT NULL,
  name text NOT NULL,
  domain text,
  industry text,
  employee_count text,
  annual_revenue text,
  linkedin_url text,
  city text,
  state text,
  country text,
  owner_name text,
  parent_domain text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now()
);

-- CONTACTS (CRM mirror)
CREATE TABLE demo_contacts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hubspot_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  title text,
  phone text,
  linkedin_url text,
  company_domain text,
  company_name text,
  lifecycle_stage text,
  owner_name text,
  last_activity_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now()
);

-- DEALS (CRM mirror)
CREATE TABLE demo_deals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hubspot_id text UNIQUE NOT NULL,
  deal_name text NOT NULL,
  stage text,
  amount numeric,
  close_date date,
  company_domain text,
  company_name text,
  owner_name text,
  deal_type text,
  source text,
  pipeline text DEFAULT 'default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_at timestamptz DEFAULT now()
);

-- CALLS (from Fathom/Gong)
CREATE TABLE demo_calls (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id text UNIQUE,
  source text NOT NULL DEFAULT 'fathom',
  title text,
  duration_seconds integer,
  call_date timestamptz,
  contact_email text,
  company_domain text,
  company_name text,
  deal_hubspot_id text,
  rep_name text,
  rep_email text,
  summary text,
  transcript_preview text,
  synced_at timestamptz DEFAULT now()
);

-- CALL EXTRACTIONS (structured insights per call)
CREATE TABLE demo_call_extractions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id bigint REFERENCES demo_calls(id),
  call_type text,
  objections text[],
  competitors text[],
  pain_points text[],
  buying_signals text[],
  decision_makers text[],
  next_steps text[],
  sentiment text,
  talk_ratio numeric,
  topics_covered text[],
  key_quotes text[],
  extracted_at timestamptz DEFAULT now()
);

-- COMPANY HIERARCHY (parent-child)
CREATE TABLE demo_company_hierarchy (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_domain text NOT NULL,
  parent_name text,
  child_domain text NOT NULL,
  child_name text,
  relationship_type text DEFAULT 'subsidiary',
  confidence numeric DEFAULT 0.9,
  discovered_by text DEFAULT 'manual',
  discovered_at timestamptz DEFAULT now(),
  UNIQUE(parent_domain, child_domain)
);

-- ENRICHMENT HISTORY
CREATE TABLE demo_enrichment_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  provider text NOT NULL,
  fields_found text[],
  fields_missing text[],
  cost_cents integer,
  enriched_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, provider)
);

-- INDEXES
CREATE INDEX idx_demo_contacts_email ON demo_contacts(email);
CREATE INDEX idx_demo_contacts_domain ON demo_contacts(company_domain);
CREATE INDEX idx_demo_companies_domain ON demo_companies(domain);
CREATE INDEX idx_demo_deals_company ON demo_deals(company_domain);
CREATE INDEX idx_demo_deals_stage ON demo_deals(stage);
CREATE INDEX idx_demo_calls_company ON demo_calls(company_domain);
CREATE INDEX idx_demo_calls_date ON demo_calls(call_date);
CREATE INDEX idx_demo_extractions_call ON demo_call_extractions(call_id);
CREATE INDEX idx_demo_hierarchy_parent ON demo_company_hierarchy(parent_domain);
CREATE INDEX idx_demo_enrichment_entity ON demo_enrichment_history(entity_type, entity_id);
