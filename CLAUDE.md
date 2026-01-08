# CLAUDE.md

## Linear Configuration

- **Default Team:** Tech
- **Required Label:** `Repo:ai` (add to all issues created from this repository)

## Project Overview

`bubble-ai` is a TypeScript library for AI/ML utilities, starting with Shopify product taxonomy embeddings and categorization.

**Linear Issue:** BG-733

## Current Status

Project initialized with TypeScript, Vitest, Supabase JS, and OpenAI SDK installed.

## Source Code to Port

The original Python code is in the `bubble` repo (not merged to main):

### Taxonomy Data (from bubble repo, commit 5ad3e6e)
```bash
# Run from bubble repo to extract:
git show 5ad3e6e:shopify_taxonomy/taxonomy.json > ../bubble-ai/data/taxonomy.json
git show 5ad3e6e:shopify_taxonomy/categories.txt > ../bubble-ai/data/categories.txt
git show 5ad3e6e:shopify_taxonomy/__init__.py  # Reference for porting to TypeScript
```

### Supabase Schema (from bubble repo, BG-708 branch)
```bash
git show BG-708-taxonomy-embeddings-supabase:local_scripts/supabase/setup_taxonomy_embeddings.sql > ../bubble-ai/supabase/migrations/001_taxonomy_embeddings.sql
git show BG-708-taxonomy-embeddings-supabase:local_scripts/supabase/populate_taxonomy_embeddings.py  # Reference for porting
```

## Target Structure

```
bubble-ai/
├── src/
│   ├── index.ts                 # Main exports
│   ├── taxonomy/
│   │   ├── loader.ts            # Load taxonomy from JSON
│   │   ├── search.ts            # Search/filter categories
│   │   └── types.ts             # TypeScript types
│   ├── embeddings/
│   │   ├── client.ts            # Supabase client wrapper
│   │   └── search.ts            # Vector similarity search
│   └── categorization/
│       └── strategies/          # OpenAI categorization strategies
├── data/
│   ├── taxonomy.json            # ~11,764 Shopify categories
│   └── categories.txt           # GID : path format
├── scripts/
│   └── populate-embeddings.ts   # CLI to populate Supabase
├── supabase/migrations/
│   └── 001_taxonomy_embeddings.sql
└── tests/
```

## Key Concepts

### Taxonomy Structure
- ~11,764 Shopify product categories
- Each has: GID (e.g., `gid://shopify/TaxonomyCategory/fb-1-7-1`), name, full path, level (0-7)
- `categories.txt`: Simple `GID : Full Path` format
- `taxonomy.json`: Full data with attributes

### Embedding Search (Supabase + pgvector)
- Embeddings stored in `shopify_taxonomy_embeddings` table
- Uses OpenAI `text-embedding-3-small` (1536 dimensions)
- `match_taxonomy_categories()` RPC function for similarity search
- IVFFlat index with 100 lists for fast search

## Development Commands

```bash
npm run build      # Compile TypeScript
npm run test       # Run Vitest tests
npm run typecheck  # Type checking only
```

## Next Steps

1. Extract taxonomy data from bubble repo
2. Create TypeScript types for taxonomy structure
3. Implement taxonomy loader and search functions
4. Add Supabase migration and client wrapper
5. Create embedding population script
6. Add unit tests
