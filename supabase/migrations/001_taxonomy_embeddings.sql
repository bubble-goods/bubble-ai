-- =============================================================================
-- Taxonomy Schema Setup Script
-- =============================================================================
--
-- This script sets up the taxonomy schema with pgvector for semantic search
-- over Shopify product taxonomy categories.
--
-- Run this script in your Supabase SQL Editor or via psql.
--
-- Related: BG-708, BG-733
-- =============================================================================

-- Enable pgvector extension (required for vector operations)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create taxonomy schema
CREATE SCHEMA IF NOT EXISTS taxonomy;

-- Grant permissions for Supabase roles
GRANT USAGE ON SCHEMA taxonomy TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA taxonomy GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA taxonomy GRANT USAGE, SELECT ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA taxonomy GRANT EXECUTE ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- Create table for taxonomy embeddings
CREATE TABLE IF NOT EXISTS taxonomy.embeddings (
    id SERIAL PRIMARY KEY,
    category_code TEXT NOT NULL UNIQUE,    -- e.g., "fb-1-7-1"
    category_name TEXT NOT NULL,            -- e.g., "Juice"
    full_path TEXT NOT NULL,                -- e.g., "Food, Beverages & Tobacco > Beverages > Juice"
    level INTEGER NOT NULL,                 -- Hierarchy depth (0-7)
    embedding VECTOR(1536),                 -- text-embedding-3-small dimensions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE taxonomy.embeddings IS
    'Vector embeddings for Shopify product taxonomy categories, enabling semantic similarity search for product categorization.';

COMMENT ON COLUMN taxonomy.embeddings.category_code IS
    'Unique category code extracted from Shopify GID (e.g., "fb-1-7-1" from "gid://shopify/TaxonomyCategory/fb-1-7-1")';

COMMENT ON COLUMN taxonomy.embeddings.full_path IS
    'Complete category path used for embedding (e.g., "Food, Beverages & Tobacco > Beverages > Juice")';

COMMENT ON COLUMN taxonomy.embeddings.embedding IS
    'OpenAI text-embedding-3-small vector (1536 dimensions) generated from full_path';

-- Create IVFFlat index for fast similarity search
-- 100 lists is optimal for ~11,764 categories (sqrt(n) rule of thumb)
-- This index enables fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
ON taxonomy.embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_level
ON taxonomy.embeddings (level);

CREATE INDEX IF NOT EXISTS idx_embeddings_category_code
ON taxonomy.embeddings (category_code);

-- =============================================================================
-- Similarity Search Function
-- =============================================================================
--
-- This function performs semantic similarity search to find taxonomy categories
-- that best match a given query embedding (e.g., from a product description).
--
-- Usage from n8n or application code:
--   SELECT * FROM taxonomy.match_categories(
--     query_embedding := '[0.1, 0.2, ...]'::vector,
--     match_threshold := 0.5,
--     match_count := 5,
--     filter_level := NULL  -- or specific level (0-7) to filter
--   );
-- =============================================================================

CREATE OR REPLACE FUNCTION taxonomy.match_categories(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5,
    filter_level INT DEFAULT NULL
)
RETURNS TABLE (
    category_code TEXT,
    category_name TEXT,
    full_path TEXT,
    level INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Search more index clusters for better accuracy (default is 1)
    SET LOCAL ivfflat.probes = 10;

    RETURN QUERY
    SELECT
        t.category_code,
        t.category_name,
        t.full_path,
        t.level,
        1 - (t.embedding <=> query_embedding) AS similarity
    FROM taxonomy.embeddings t
    WHERE
        1 - (t.embedding <=> query_embedding) > match_threshold
        AND (filter_level IS NULL OR t.level = filter_level)
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment for function documentation
COMMENT ON FUNCTION taxonomy.match_categories IS
    'Performs semantic similarity search to find taxonomy categories matching a query embedding. Returns top N matches above the threshold.';

-- Grant explicit permissions on created objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA taxonomy TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA taxonomy TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA taxonomy TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- Verification Queries (run after populating embeddings)
-- =============================================================================
--
-- Check total count:
--   SELECT COUNT(*) FROM taxonomy.embeddings;
--   -- Expected: 11,764
--
-- Check level distribution:
--   SELECT level, COUNT(*) FROM taxonomy.embeddings GROUP BY level ORDER BY level;
--
-- Test similarity search (requires an embedding):
--   SELECT * FROM taxonomy.match_categories(
--     (SELECT embedding FROM taxonomy.embeddings WHERE category_code = 'fb-1-7-1'),
--     0.5, 5, NULL
--   );
-- =============================================================================
