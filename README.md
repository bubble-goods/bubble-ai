# bubble-ai

AI/ML utilities for Bubble Goods, starting with Shopify product taxonomy embeddings and categorization.

## Features

- **Taxonomy Loader**: Load and cache Shopify's ~11,764 product categories
- **Search Functions**: Search categories by text, code, level, or path
- **Embedding Search**: Vector similarity search via Supabase + pgvector
- **Population Script**: Generate OpenAI embeddings and populate Supabase

## Installation

```bash
npm install
```

## Usage

### Taxonomy Search (Local)

```typescript
import {
  searchCategories,
  getCategoryByCode,
  getCategoryInfo,
  validateCategoryCode,
} from 'bubble-ai'

// Search categories by text
const results = searchCategories('juice', 5)
// [{ path: 'Food, Beverages & Tobacco > Beverages > Juice', gid: '...', code: 'fb-1-7' }, ...]

// Get category details by code
const category = getCategoryByCode('fb-1-7-1')
// { id: 'gid://...', name: 'Juice', level: 3, attributes: [...], ... }

// Get GID and code from path
const info = getCategoryInfo('Food, Beverages & Tobacco > Beverages > Juice')
// { gid: 'gid://shopify/TaxonomyCategory/fb-1-7', code: 'fb-1-7' }

// Validate a category code
validateCategoryCode('fb-1-7-1') // true
validateCategoryCode('invalid') // false
```

### Embedding Search (Supabase)

```typescript
import { initSupabase, matchTaxonomyCategories } from 'bubble-ai'
import OpenAI from 'openai'

// Initialize Supabase client
initSupabase({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
})

// Generate embedding for your query
const openai = new OpenAI()
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'organic cold pressed orange juice',
})
const embedding = response.data[0].embedding

// Search for similar categories
const matches = await matchTaxonomyCategories(embedding, {
  matchThreshold: 0.5,
  matchCount: 5,
})
// [{ categoryCode: 'fb-1-7-1', categoryName: 'Juice', similarity: 0.85, ... }, ...]
```

## Setup

### 1. Supabase Migration

Run the migration in your Supabase SQL Editor:

```bash
# Copy contents of supabase/migrations/001_taxonomy_embeddings.sql
```

This creates:
- `shopify_taxonomy_embeddings` table with pgvector
- `match_taxonomy_categories()` RPC function
- IVFFlat index for fast similarity search

### 2. Populate Embeddings

```bash
# Set environment variables
export OPENAI_API_KEY=sk-...
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_KEY=eyJ...

# Run population script
npm run populate-embeddings

# Options
npm run populate-embeddings -- --batch-size 50
npm run populate-embeddings -- --dry-run
npm run populate-embeddings -- --limit 100
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Build
npm run build
```

## Project Structure

```
bubble-ai/
├── src/
│   ├── index.ts              # Main exports
│   ├── taxonomy/
│   │   ├── types.ts          # TypeScript types
│   │   ├── loader.ts         # Load taxonomy data (cached)
│   │   └── search.ts         # Search/filter functions
│   └── embeddings/
│       ├── client.ts         # Supabase client wrapper
│       └── search.ts         # Vector similarity search
├── data/
│   ├── taxonomy.json         # Full Shopify taxonomy (~11,764 categories)
│   └── categories.txt        # GID : path format
├── scripts/
│   └── populate-embeddings.ts
├── supabase/migrations/
│   └── 001_taxonomy_embeddings.sql
└── tests/
    └── taxonomy.test.ts
```

## API Reference

### Taxonomy Functions

| Function | Description |
|----------|-------------|
| `loadTaxonomy()` | Load path → GID mapping (cached) |
| `loadTaxonomyFull()` | Load full category details (cached) |
| `searchCategories(query, maxResults?)` | Text search across categories |
| `getCategoryByCode(code)` | Get full category by code |
| `getCategoryInfo(path)` | Get GID and code from path |
| `getCategoryPathFromCode(code)` | Get path from code |
| `validateCategoryCode(code)` | Check if code exists |
| `getCategoriesByLevel(level)` | Get all categories at level |
| `getLeafCategories()` | Get categories with no children |
| `extractCategoryCode(gid)` | Extract code from GID string |
| `getTaxonomyVersion()` | Get taxonomy version |

### Embedding Functions

| Function | Description |
|----------|-------------|
| `initSupabase(config)` | Initialize Supabase client |
| `initSupabaseFromEnv()` | Initialize from env vars |
| `matchTaxonomyCategories(embedding, options?)` | Vector similarity search |
| `getCategoryEmbedding(code)` | Get stored embedding |
| `getEmbeddingsCount()` | Count populated embeddings |

## Related

- [BG-733](https://linear.app/bubble-goods/issue/BG-733) - Linear issue
- [Shopify Product Taxonomy](https://shopify.dev/docs/apps/selling-strategies/categories/taxonomy)
