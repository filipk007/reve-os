-- ============================================================================
-- Clay Webhook OS — Supabase Schema
-- Migration 001: Initial schema (enrichment cache, analytics, auth, entities)
-- ============================================================================

-- ============================================================================
-- PHASE 1: ENRICHMENT CACHE + ANALYTICS
-- ============================================================================

-- Entity-level enrichment results cache
-- Key: (entity_type, entity_id, provider, operation)
CREATE TABLE public.enrichment_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL,                   -- 'company' | 'contact'
    entity_id       TEXT NOT NULL,                   -- Slugified domain or email
    provider        TEXT NOT NULL,                   -- 'parallel' | 'sumble' | 'deepline' | 'findymail' | 'claude'
    operation       TEXT NOT NULL,                   -- 'company_intel' | 'company_profile' | skill name
    result          JSONB NOT NULL,                  -- Full enrichment result
    result_hash     TEXT,                            -- SHA256 of result for change detection
    ttl_seconds     INTEGER NOT NULL DEFAULT 604800, -- Default 7 days
    hit_count       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE UNIQUE INDEX idx_enrichment_cache_lookup
    ON enrichment_cache(entity_type, entity_id, provider, operation);
CREATE INDEX idx_enrichment_cache_expires
    ON enrichment_cache(expires_at);
CREATE INDEX idx_enrichment_cache_entity
    ON enrichment_cache(entity_type, entity_id);
CREATE INDEX idx_enrichment_cache_provider
    ON enrichment_cache(provider, created_at DESC);

-- Track every external API call for cost audit
CREATE TABLE public.api_call_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider        TEXT NOT NULL,                   -- 'parallel' | 'sumble' | 'deepline' | 'findymail'
    operation       TEXT NOT NULL,                   -- 'company_intel' | 'company_profile' | etc.
    entity_type     TEXT,
    entity_id       TEXT,
    request_params  JSONB,                           -- Sanitized request (no secrets)
    response_status INTEGER,                         -- HTTP status code
    response_size   INTEGER,                         -- Response bytes
    duration_ms     INTEGER,
    cache_hit       BOOLEAN NOT NULL DEFAULT false,
    error_message   TEXT,
    skill           TEXT,                            -- Which skill triggered this call
    client_slug     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_call_log_provider_time
    ON api_call_log(provider, created_at DESC);
CREATE INDEX idx_api_call_log_entity
    ON api_call_log(entity_type, entity_id, created_at DESC);

-- Configurable TTLs per provider/skill/operation
CREATE TABLE public.cache_ttl_config (
    id          SERIAL PRIMARY KEY,
    scope       TEXT NOT NULL,                       -- 'provider' | 'skill' | 'operation'
    key         TEXT NOT NULL UNIQUE,                -- e.g. 'parallel' | 'company-research'
    ttl_seconds INTEGER NOT NULL,
    description TEXT
);

INSERT INTO cache_ttl_config (scope, key, ttl_seconds, description) VALUES
    ('provider', 'parallel',            604800,  'Parallel.ai results: 7 days'),
    ('provider', 'sumble',              604800,  'Sumble profiles: 7 days'),
    ('provider', 'deepline',            604800,  'DeepLine enrichment: 7 days'),
    ('provider', 'findymail',           2592000, 'Findymail emails: 30 days'),
    ('skill',    'company-research',    604800,  'Company research: 7 days'),
    ('skill',    'people-research',     604800,  'People research: 7 days'),
    ('skill',    'competitor-research', 86400,   'Competitor research: 1 day'),
    ('skill',    'email-gen',           3600,    'Email generation: 1 hour'),
    ('skill',    'account-researcher',  604800,  'Account research: 7 days'),
    ('operation','email_waterfall',     2592000, 'Email waterfall results: 30 days'),
    ('operation','company_intel',       604800,  'Company intel extraction: 7 days'),
    ('operation','company_profile',     604800,  'Company profile enrichment: 7 days'),
    ('operation','competitor_intel',    86400,   'Competitor intel: 1 day');

-- ============================================================================
-- BAKE-IN: USAGE ANALYTICS (replaces file-based UsageStore)
-- ============================================================================

CREATE TABLE public.skill_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          TEXT,
    skill           TEXT NOT NULL,
    model           TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       TEXT,
    client_slug     TEXT,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_est_usd    REAL NOT NULL DEFAULT 0.0,
    duration_ms     INTEGER NOT NULL DEFAULT 0,
    cache_hit       BOOLEAN NOT NULL DEFAULT false,
    cache_level     TEXT,                            -- 'L1' | 'L2' | null (miss)
    success         BOOLEAN NOT NULL DEFAULT true,
    error_message   TEXT,
    user_id         UUID,                            -- Nullable until auth exists
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_exec_skill_time
    ON skill_executions(skill, created_at DESC);
CREATE INDEX idx_skill_exec_client_time
    ON skill_executions(client_slug, created_at DESC);
CREATE INDEX idx_skill_exec_user_time
    ON skill_executions(user_id, created_at DESC);
CREATE INDEX idx_skill_exec_created
    ON skill_executions(created_at DESC);

-- ============================================================================
-- BAKE-IN: QUALITY SCORING (replaces file-based FeedbackStore)
-- ============================================================================

CREATE TABLE public.feedback_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          TEXT,
    skill           TEXT NOT NULL,
    model           TEXT,
    client_slug     TEXT,
    rating          TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
    note            TEXT,
    corrections     JSONB,
    user_id         UUID,                            -- Nullable until auth exists
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_skill_time
    ON feedback_entries(skill, created_at DESC);
CREATE INDEX idx_feedback_client_skill
    ON feedback_entries(client_slug, skill);

-- Materialized quality aggregates per skill x client
CREATE TABLE public.quality_scores (
    id              SERIAL PRIMARY KEY,
    skill           TEXT NOT NULL,
    client_slug     TEXT NOT NULL DEFAULT '_global',
    approval_rate   REAL NOT NULL DEFAULT 0.0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    trend_7d        REAL,                            -- Approval rate change vs 7 days ago
    trend_30d       REAL,                            -- Approval rate change vs 30 days ago
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (skill, client_slug)
);

-- ============================================================================
-- BAKE-IN: ENTITY GRAPH (extends MemoryStore)
-- ============================================================================

-- Master entity registry
CREATE TABLE public.entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            TEXT NOT NULL,                    -- 'company' | 'contact'
    key             TEXT NOT NULL,                    -- Slugified domain or email
    display_name    TEXT,
    metadata        JSONB DEFAULT '{}',              -- Flexible attributes
    last_enriched_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_entities_type_key
    ON entities(type, key);
CREATE INDEX idx_entities_display_name
    ON entities(display_name);

-- Relationships between entities
CREATE TABLE public.entity_relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_id  UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    to_entity_id    UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    rel_type        TEXT NOT NULL,                    -- 'works_at' | 'competitor_of' | 'partner_of'
    confidence      REAL DEFAULT 1.0,
    source_skill    TEXT,                             -- Which skill discovered this
    metadata        JSONB DEFAULT '{}',
    discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (from_entity_id, to_entity_id, rel_type)
);

CREATE INDEX idx_entity_rel_from
    ON entity_relationships(from_entity_id);
CREATE INDEX idx_entity_rel_to
    ON entity_relationships(to_entity_id);
CREATE INDEX idx_entity_rel_type
    ON entity_relationships(rel_type);

-- ============================================================================
-- BAKE-IN: CLIENT QUOTAS (multi-tenant foundation)
-- ============================================================================

CREATE TABLE public.client_quotas (
    client_slug             TEXT PRIMARY KEY,
    name                    TEXT,
    tier                    TEXT NOT NULL DEFAULT 'free'
                            CHECK (tier IN ('free', 'pro', 'enterprise')),
    monthly_token_limit     INTEGER DEFAULT 100000,
    monthly_api_call_limit  INTEGER DEFAULT 500,
    current_month_tokens    INTEGER NOT NULL DEFAULT 0,
    current_month_api_calls INTEGER NOT NULL DEFAULT 0,
    last_reset_at           TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 2: AUTH TABLES
-- ============================================================================

-- Multi-tenancy organizations
CREATE TABLE public.organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'editor', 'viewer')),
    org_id      UUID REFERENCES public.organizations(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'viewer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Managed API keys for external systems (Clay, scripts)
CREATE TABLE public.api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash    TEXT NOT NULL UNIQUE,                 -- SHA256 of the actual key
    key_prefix  TEXT NOT NULL,                        -- First 8 chars for identification
    name        TEXT NOT NULL,                        -- Human label: "Clay Production"
    owner_id    UUID NOT NULL REFERENCES public.profiles(id),
    org_id      UUID REFERENCES public.organizations(id),
    role        TEXT NOT NULL DEFAULT 'editor'
                CHECK (role IN ('admin', 'editor', 'viewer')),
    scopes      TEXT[] DEFAULT '{}',                  -- Optional: ['webhook', 'enrichment', 'portal']
    last_used   TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,                          -- NULL = never expires
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_owner ON api_keys(owner_id);

-- Audit log — who did what
CREATE TABLE public.audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES public.profiles(id),
    action      TEXT NOT NULL,                        -- 'skill.execute' | 'function.create' | etc.
    resource    TEXT NOT NULL,                        -- 'webhook' | 'function' | 'portal'
    resource_id TEXT,
    details     JSONB,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_time
    ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource
    ON audit_log(resource, resource_id, created_at DESC);
CREATE INDEX idx_audit_log_created
    ON audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE enrichment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_quotas ENABLE ROW LEVEL SECURITY;

-- Enrichment cache: all authenticated users can read/write (shared resource)
CREATE POLICY enrichment_cache_read ON enrichment_cache
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY enrichment_cache_insert ON enrichment_cache
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY enrichment_cache_update ON enrichment_cache
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- API call log: all authenticated users can read
CREATE POLICY api_call_log_read ON api_call_log
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Skill executions: all authenticated users can read
CREATE POLICY skill_exec_read ON skill_executions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Feedback: all authenticated users can read
CREATE POLICY feedback_read ON feedback_entries
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Entities: all authenticated users can read/write
CREATE POLICY entities_read ON entities
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY entities_write ON entities
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY entities_update ON entities
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Entity relationships: all authenticated users can read/write
CREATE POLICY entity_rel_read ON entity_relationships
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY entity_rel_write ON entity_relationships
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles: users see own profile, admins see all in org
CREATE POLICY profiles_own ON profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_admin_read ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
              AND p.org_id = profiles.org_id
        )
    );

-- API keys: owners see own keys, admins see all org keys
CREATE POLICY api_keys_owner ON api_keys
    FOR ALL USING (owner_id = auth.uid());
CREATE POLICY api_keys_admin_read ON api_keys
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
              AND p.org_id = api_keys.org_id
        )
    );

-- Audit log: admins only
CREATE POLICY audit_log_admin ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Client quotas: all authenticated users can read
CREATE POLICY client_quotas_read ON client_quotas
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- ENABLE REALTIME (for live dashboard updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE skill_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE enrichment_cache;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrichment_cache_updated_at
    BEFORE UPDATE ON enrichment_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER client_quotas_updated_at
    BEFORE UPDATE ON client_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
