-- ============================================================================
-- Clay Webhook OS — Supabase Schema
-- Migration 002: Context Rack System (modular context injection pipeline)
-- ============================================================================
--
-- The Context Rack replaces file-based context loading with a database-backed
-- pipeline. Each "rack slot" is a modular provider that fetches context from
-- either files or Supabase. This migration creates the storage tables.
--
-- Tables:
--   context_items       — Every context piece (replaces knowledge_base/ files)
--   context_versions    — Immutable audit trail of content changes
--   context_load_log    — Per-execution analytics (what loaded, token counts)
--   context_rack_config — Pipeline configuration (slot ordering, providers)
-- ============================================================================


-- ============================================================================
-- TABLE 1: context_items
-- ============================================================================
-- This is the core table. Each row is one piece of context that can be
-- injected into a prompt. Think of it as one markdown file from knowledge_base/
-- or clients/ — but now it lives in the database with metadata and rules.
--
-- The applicable_* arrays are the "smart routing" system. Instead of hardcoding
-- which skills need which context in Python dicts (SKILL_CLIENT_SECTIONS),
-- the rules live here and can be edited via the dashboard.
--
-- Empty array = "available to all" (no restriction).
-- Non-empty array = "only available to these specific values."
-- ============================================================================

CREATE TABLE public.context_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity ---------------------------------------------------------------
    -- slug + category is the unique key (like a file path: category/slug.md)
    slug                    TEXT NOT NULL,
    category                TEXT NOT NULL,
    item_type               TEXT NOT NULL DEFAULT 'knowledge_base'
                            CHECK (item_type IN (
                                'knowledge_base',   -- frameworks, personas, signals, etc.
                                'client_profile',   -- per-client context
                                'learning',         -- persistent corrections from feedback
                                'default'           -- auto-loaded for every prompt (_defaults/)
                            )),

    -- Content ----------------------------------------------------------------
    title                   TEXT NOT NULL,
    content                 TEXT NOT NULL,
    content_hash            TEXT NOT NULL,           -- SHA256 for change detection

    -- Metadata (migrated from YAML frontmatter) ------------------------------
    -- Stores: tags, topics, related_concepts, domain, node_type, status, etc.
    metadata                JSONB NOT NULL DEFAULT '{}',

    -- Smart Routing (replaces SKILL_CLIENT_SECTIONS + hardcoded logic) -------
    -- Empty array = no restriction (available to all).
    -- e.g. applicable_skills = ['email-gen', 'sequence-writer'] means ONLY
    -- those skills will load this context piece.
    applicable_skills       TEXT[] NOT NULL DEFAULT '{}',
    applicable_clients      TEXT[] NOT NULL DEFAULT '{}',
    applicable_signals      TEXT[] NOT NULL DEFAULT '{}',
    applicable_industries   TEXT[] NOT NULL DEFAULT '{}',
    applicable_personas     TEXT[] NOT NULL DEFAULT '{}',

    -- Ordering ---------------------------------------------------------------
    -- Maps to _PRIORITY_ORDER in context_assembler.py.
    -- Lower weight = loads earlier (generic). Higher = loads later (specific).
    -- Current mapping: frameworks=10, voice=20, objections=30, competitive=40,
    --   sequences=50, signals=60, personas=70, industries=80, clients=90
    priority_weight         INTEGER NOT NULL DEFAULT 50,

    -- Flags ------------------------------------------------------------------
    is_default              BOOLEAN NOT NULL DEFAULT false,  -- Auto-load (like _defaults/)
    is_active               BOOLEAN NOT NULL DEFAULT true,   -- Soft delete / toggle

    -- Migration tracking -----------------------------------------------------
    -- Stores the original file path so we can trace provenance and re-sync.
    source_path             TEXT,

    -- Versioning -------------------------------------------------------------
    version                 INTEGER NOT NULL DEFAULT 1,

    -- Timestamps -------------------------------------------------------------
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID REFERENCES public.profiles(id),
    updated_by              UUID REFERENCES public.profiles(id)
);

-- Unique constraint: one active item per slug+category combo
CREATE UNIQUE INDEX idx_context_items_slug_cat
    ON context_items(slug, category) WHERE is_active = true;

-- Lookup by category (e.g. "show me all frameworks")
CREATE INDEX idx_context_items_category
    ON context_items(category);

-- Lookup by type (e.g. "show me all client profiles")
CREATE INDEX idx_context_items_type
    ON context_items(item_type);

-- Active items only (most queries filter on is_active)
CREATE INDEX idx_context_items_active
    ON context_items(is_active, item_type);

-- GIN indexes for array containment queries.
-- Example: WHERE applicable_skills @> ARRAY['email-gen']
-- This finds all items where email-gen is in the applicable_skills array.
CREATE INDEX idx_context_items_skills
    ON context_items USING gin(applicable_skills);
CREATE INDEX idx_context_items_clients
    ON context_items USING gin(applicable_clients);
CREATE INDEX idx_context_items_signals
    ON context_items USING gin(applicable_signals);
CREATE INDEX idx_context_items_industries
    ON context_items USING gin(applicable_industries);

-- Source path lookup (for migration idempotency checks)
CREATE INDEX idx_context_items_source
    ON context_items(source_path) WHERE source_path IS NOT NULL;

-- Full-text search vector (replaces Python TF-IDF ContextIndex).
-- tsvector is Postgres's built-in search index. It tokenizes the title + content,
-- removes stop words, stems words (e.g. "running" → "run"), and stores a
-- weighted, searchable representation.
--
-- GENERATED ALWAYS AS = Postgres auto-updates this whenever title/content change.
-- No manual maintenance needed.
ALTER TABLE context_items ADD COLUMN fts_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
    ) STORED;

-- GIN index on the search vector for fast full-text queries.
-- Example: WHERE fts_vector @@ plainto_tsquery('english', 'SaaS pricing model')
CREATE INDEX idx_context_items_fts
    ON context_items USING gin(fts_vector);

-- Auto-update updated_at on changes (reuses helper from migration 001)
CREATE TRIGGER context_items_updated_at
    BEFORE UPDATE ON context_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- TABLE 2: context_versions
-- ============================================================================
-- Immutable audit trail. Every time a context_item's content changes, we
-- insert a new row here with the old content. This gives us:
--   - Full change history (like git log for each piece of context)
--   - Rollback capability (restore any previous version)
--   - Diff views in the dashboard (compare version N vs N-1)
--
-- The key insight: context_items always has the CURRENT version.
-- context_versions has ALL versions (including current as the latest row).
-- ============================================================================

CREATE TABLE public.context_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_item_id     UUID NOT NULL REFERENCES context_items(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL,
    content             TEXT NOT NULL,
    content_hash        TEXT NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}',
    change_summary      TEXT,               -- "Updated ICP section", "Fixed persona matching"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES public.profiles(id),

    -- Each item can only have one of each version number
    UNIQUE (context_item_id, version)
);

-- Fast lookup: "show me all versions of item X, newest first"
CREATE INDEX idx_context_versions_item
    ON context_versions(context_item_id, version DESC);


-- ============================================================================
-- TABLE 3: context_load_log
-- ============================================================================
-- Analytics table. Every time the rack assembles a prompt, it logs what
-- context was loaded, how many tokens each slot contributed, and how long
-- assembly took. This answers questions like:
--   - "Which knowledge base files are loaded most often?"
--   - "How many tokens does the email-gen skill typically use for context?"
--   - "Is the semantic slot actually finding useful context?"
--
-- This is a write-heavy, read-occasionally table — no foreign keys,
-- no constraints beyond NOT NULL. It's an append-only log.
-- ============================================================================

CREATE TABLE public.context_load_log (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links to skill_executions table (from migration 001)
    execution_id            TEXT,

    -- What was being executed
    skill                   TEXT NOT NULL,
    client_slug             TEXT,
    model                   TEXT,

    -- The rack manifest: what each slot produced
    -- Format: [{"slot": "knowledge", "source": "supabase", "items": 3, "tokens": 1240}, ...]
    rack_slots              JSONB NOT NULL,

    -- Which specific items were loaded (UUIDs for supabase, paths for files)
    context_items_loaded    TEXT[] NOT NULL DEFAULT '{}',

    -- Token accounting
    total_context_tokens    INTEGER NOT NULL DEFAULT 0,
    total_prompt_tokens     INTEGER NOT NULL DEFAULT 0,

    -- Where did content come from?
    source_mode             TEXT NOT NULL DEFAULT 'file'
                            CHECK (source_mode IN ('file', 'supabase', 'hybrid')),

    -- Performance
    assembly_ms             INTEGER,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Show me context loads for email-gen over the last 7 days"
CREATE INDEX idx_context_load_skill
    ON context_load_log(skill, created_at DESC);

-- "Show me all context loads for the twelve-labs client"
CREATE INDEX idx_context_load_client
    ON context_load_log(client_slug, created_at DESC);

-- Time-based queries (dashboards, cleanup)
CREATE INDEX idx_context_load_created
    ON context_load_log(created_at DESC);


-- ============================================================================
-- TABLE 4: context_rack_config
-- ============================================================================
-- Defines the rack pipeline itself — which slots exist, their execution order,
-- whether they're enabled, and which provider (file/supabase/inline) they use.
--
-- This is the "control panel" of the rack. Change the order here, and the
-- prompt assembly order changes. Disable a slot, and that layer is skipped.
--
-- Seeded with the default configuration that matches current build_prompt()
-- behavior exactly — so flipping the feature flag changes nothing until you
-- explicitly reconfigure.
-- ============================================================================

CREATE TABLE public.context_rack_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_name       TEXT NOT NULL UNIQUE,
    slot_order      INTEGER NOT NULL,
    is_enabled      BOOLEAN NOT NULL DEFAULT true,
    provider        TEXT NOT NULL DEFAULT 'file'
                    CHECK (provider IN ('file', 'supabase', 'inline', 'hybrid')),
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with default rack configuration matching current build_prompt() layers.
-- slot_order determines execution sequence (10, 20, 30... leaves room for inserts).
INSERT INTO context_rack_config (slot_name, slot_order, provider, config) VALUES
    ('system',    10, 'inline',   '{"description": "Format-aware system instructions (JSON/markdown/HTML/text preamble)"}'),
    ('skill',     20, 'file',     '{"description": "Skill body from skills/{name}/skill.md"}'),
    ('memory',    30, 'file',     '{"description": "Prior entity knowledge from MemoryStore"}'),
    ('learnings', 40, 'file',     '{"description": "Persistent corrections from LearningEngine"}'),
    ('defaults',  50, 'file',     '{"description": "Auto-loaded default context (knowledge_base/_defaults/)"}'),
    ('knowledge', 60, 'file',     '{"description": "Explicit context refs from skill frontmatter + industry auto-load"}'),
    ('semantic',  70, 'file',     '{"description": "Auto-discovered relevant context (TF-IDF or Postgres FTS)", "top_k": 3}'),
    ('data',      80, 'inline',   '{"description": "Input data payload (JSON)"}'),
    ('campaign',  85, 'inline',   '{"description": "Optional campaign-level override instructions"}'),
    ('reminder',  90, 'inline',   '{"description": "Format-aware closing reminder"}');

-- Auto-update updated_at on changes
CREATE TRIGGER context_rack_config_updated_at
    BEFORE UPDATE ON context_rack_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE context_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_load_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_rack_config ENABLE ROW LEVEL SECURITY;

-- Context items: all authenticated users can read. Admins/editors can write.
CREATE POLICY context_items_read ON context_items
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY context_items_insert ON context_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
        )
    );
CREATE POLICY context_items_update ON context_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
        )
    );

-- Context versions: all authenticated users can read (audit trail)
CREATE POLICY context_versions_read ON context_versions
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY context_versions_insert ON context_versions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Context load log: all authenticated users can read and write
CREATE POLICY context_load_log_read ON context_load_log
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY context_load_log_insert ON context_load_log
    FOR INSERT WITH CHECK (true);  -- Server writes via service_role (bypasses RLS)

-- Rack config: all can read, only admins can modify
CREATE POLICY context_rack_config_read ON context_rack_config
    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY context_rack_config_update ON context_rack_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================================================
-- ENABLE REALTIME (for live dashboard updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE context_items;
ALTER PUBLICATION supabase_realtime ADD TABLE context_rack_config;
