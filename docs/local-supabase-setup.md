# Local Supabase Setup

This guide explains how to test `bubble-ai` with a local Supabase instance.

## Prerequisites

- OpenAI API key (for generating embeddings)
- Local Supabase running (via Docker)

## Option A: Using Existing Supabase (Recommended)

If you already have Supabase running locally (e.g., for the main `bubble` project):

### 1. Apply the Migration

**Via Supabase Studio** (easiest):
1. Open http://localhost:54323 (Supabase Studio)
2. Go to SQL Editor
3. Paste contents of `supabase/migrations/001_taxonomy_embeddings.sql`
4. Run

**Via psql**:
```bash
psql -h localhost -p 54322 -U postgres -d postgres \
  < supabase/migrations/001_taxonomy_embeddings.sql
```

### 2. Get Your Credentials

From your existing Supabase project directory:
```bash
supabase status
```

Note the `API URL` and `service_role key`.

### 3. Set Environment Variables

Create `.env.local`:
```bash
# Local Supabase
SUPABASE_URL_DEV=http://localhost:54321
SUPABASE_SERVICE_KEY_DEV=eyJ...  # service_role key from supabase status
SUPABASE_ANON_KEY_DEV=eyJ...     # anon key (for client queries)

# OpenAI
OPENAI_API_KEY=sk-...
```

The `_DEV` suffix is checked first, allowing separate local/production configs.

## Option B: Fresh Supabase Setup

If you don't have Supabase running:

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# or npm
npm install -g supabase
```

### 2. Start Local Supabase

```bash
# Initialize (creates supabase/ directory)
supabase init

# Start Docker containers
supabase start
```

### 3. Apply Migration

```bash
supabase db push
```

### 4. Get Credentials

```bash
supabase status
```

## Populate Embeddings

### Quick Test (100 categories)

```bash
# Load environment
source .env.local  # or however you load env vars

# Test with limited data
npm run populate-embeddings -- --limit 100
```

### Full Population

```bash
npm run populate-embeddings
```

This processes ~11,764 categories in batches. Takes 2-3 minutes.

### Dry Run (No Supabase Writes)

```bash
npm run populate-embeddings -- --dry-run --limit 100
```

## Verify Setup

### Via SQL (Supabase Studio)

```sql
-- Check count (expected: 11,764)
SELECT COUNT(*) FROM taxonomy.embeddings;

-- Check level distribution
SELECT level, COUNT(*)
FROM taxonomy.embeddings
GROUP BY level
ORDER BY level;

-- Test similarity search
SELECT * FROM taxonomy.match_categories(
  (SELECT embedding FROM taxonomy.embeddings WHERE category_code = 'fb-1-7-1'),
  0.5, 5, NULL
);
```

### Via TypeScript

```typescript
import { initSupabase, matchTaxonomyCategories, getEmbeddingsCount } from 'bubble-ai'
import OpenAI from 'openai'

// Initialize
initSupabase({
  url: process.env.SUPABASE_URL_DEV!,
  anonKey: process.env.SUPABASE_ANON_KEY_DEV!,
})

// Check count
const count = await getEmbeddingsCount()
console.log(`Embeddings populated: ${count}`)

// Generate a test embedding
const openai = new OpenAI()
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'organic cold pressed juice',
})

// Search
const matches = await matchTaxonomyCategories(response.data[0].embedding, {
  matchCount: 5,
  matchThreshold: 0.3,
})
console.log(matches)
```

## Cleanup

```bash
# Stop local Supabase
supabase stop

# Remove all data (optional)
supabase stop --no-backup
```

## Troubleshooting

### "relation taxonomy.embeddings does not exist"

Migration hasn't been applied. Run the SQL in Supabase Studio.

### "Supabase client not initialized"

Call `initSupabase()` before using embedding search functions.

### "Missing environment variable"

Check that `.env.local` is loaded. The script looks for `SUPABASE_URL_DEV` first, then `SUPABASE_URL`.

### IVFFlat index not working

The IVFFlat index requires data to be present before it's effective. After populating, you may want to recreate it:

```sql
REINDEX INDEX taxonomy.idx_embeddings_vector;
```
