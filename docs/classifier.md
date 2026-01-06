# Product Taxonomy Classifier

The classifier service categorizes products into Shopify's standardized product taxonomy using semantic embedding search and LLM-powered selection.

## Overview

The classifier takes product information (title, description, tags) and assigns:
- A taxonomy category (from 11,764 Shopify categories)
- Product attributes based on the assigned category
- Confidence score indicating classification reliability

## Architecture

```
┌─────────────────┐
│  Product Input  │
│  title, desc,   │
│  tags, variants │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Bundle Detection│ ──► Detects variety packs, gift boxes
└────────┬────────┘     Caps category depth for bundles
         │
         ▼
┌─────────────────┐
│ Embedding Search│ ──► OpenAI text-embedding-3-small
│                 │     Supabase pgvector similarity
└────────┬────────┘     Returns top 10 candidates
         │
         ▼
┌─────────────────┐
│  LLM Selection  │ ──► Claude selects best category
│                 │     from embedding candidates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Confidence    │ ──► 0.6×LLM + 0.3×embedding
│    Scoring      │     - 0.1×bundlePenalty
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Attributes    │ ──► Optional extraction based
│   Extraction    │     on category schema
└─────────────────┘
```

## Input/Output

### Input

```typescript
interface ClassificationInput {
  title: string              // Required: product title
  description?: string       // HTML or plain text
  tags?: string[]            // Product tags
  productType?: string       // Used for bundle detection only
  variants?: Array<{
    title?: string
    sku?: string
    options?: Record<string, string>
  }>
}
```

### Output

```typescript
interface ClassificationOutput {
  category: {
    code: string           // e.g., "fb-2-17-5"
    path: string           // e.g., "Food Items > Snack Foods > Crackers"
    gid: string            // Shopify GID
    confidence: number     // 0-1
  }
  attributes: Array<{
    handle: string
    name: string
    value: string
    confidence: number
  }>
  reasoning: string        // LLM explanation
  needsReview: boolean     // true if confidence < 0.85
  signals: {
    isBundle: boolean
    embeddingTopMatch?: string
    embeddingScore?: number
  }
}
```

## Classification Strategy

### 1. Bundle Detection

Identifies variety packs, gift boxes, and samplers using multiple signals:

| Signal | Weight | Examples |
|--------|--------|----------|
| Title keywords | 0.4 | "variety pack", "gift box", "sampler" |
| Description | 0.2 | Bundle-related terms in description |
| ProductType | 0.5 | "Gift Box", "Variety Pack" |
| Tags | 0.4 | Bundle-related tags |
| Variants | 0.2 | 3+ distinct meaningful variants |

Bundles are capped at taxonomy depth 3 to avoid overly specific categorization.

### 2. Embedding Search

Generates semantic embeddings from product content:

```
searchText = title | description (cleaned, max 500 chars) | tags (non-marketing, max 5)
```

**Intentionally excluded from search text:**
- `productType` - unreliable merchant data
- Marketing tags: "staff-pick", "best-seller", "trending", "sale", "featured", etc.

**Search parameters:**
- Model: `text-embedding-3-small` (1536 dimensions)
- Threshold: 0.3 similarity
- Results: Top 10 candidates
- Filter: Food categories only (`fb-` prefix)

### 3. LLM Selection

Claude evaluates embedding candidates using merchandising-focused reasoning:

**Prompt guidance:**
- "Where would a shopper look for this product?"
- Focus on physical form and consumption occasion
- Prioritize discoverability over production method
- Examples: crispbread → crackers (not bakery), dried fruit → snacks (not produce)

### 4. Confidence Scoring

```
confidence = 0.6 × llmConfidence + 0.3 × embeddingScore - 0.1 × bundlePenalty
```

| Threshold | Action |
|-----------|--------|
| >= 0.85 | Auto-accept |
| < 0.85 | Needs review |

## API Endpoints

### POST /classify

Classify a single product.

```bash
curl -X POST https://classifier.bubble.workers.dev/classify \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "title": "Organic Norwegian Crispbread",
      "description": "Crunchy whole grain crackers...",
      "tags": ["organic", "gluten-free"]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "category": {
      "code": "fb-2-17-5",
      "path": "Food, Beverages & Tobacco > Food Items > Snack Foods > Crackers",
      "gid": "gid://shopify/TaxonomyCategory/fb-2-17-5",
      "confidence": 0.87
    },
    "attributes": [],
    "reasoning": "This is a shelf-stable crispbread eaten with toppings...",
    "needsReview": false,
    "signals": {
      "isBundle": false,
      "embeddingTopMatch": "Food Items > Snack Foods > Crackers",
      "embeddingScore": 0.92
    }
  },
  "meta": {
    "durationMs": 8500,
    "timestamp": "2026-01-06T12:00:00.000Z"
  }
}
```

### POST /classify/batch

Classify up to 10 products (processed sequentially).

```bash
curl -X POST https://classifier.bubble.workers.dev/classify/batch \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"title": "Product 1", "description": "..."},
      {"title": "Product 2", "description": "..."}
    ]
  }'
```

### GET /health

Health check endpoint.

## Configuration

```typescript
interface ClassifierConfig {
  confidenceThreshold?: number  // Default: 0.85
  maxCandidates?: number        // Default: 10
  extractAttributes?: boolean   // Default: true
  model?: 'claude-sonnet' | 'claude-opus'  // Default: claude-sonnet
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

## Development

### Running Tests

```bash
cd packages/classifier
npm test
```

### Calibration

Test classifier against sample products:

```bash
npm run calibrate           # Full mode (with LLM)
npm run calibrate:offline   # Embedding-only mode
```

### Local Development

```bash
npm run dev   # Start Wrangler dev server
```

### Deployment

```bash
npm run deploy          # Production
npm run deploy:staging  # Staging environment
```

## Design Decisions

### Why ProductType is Not Used for Classification

`product.productType` is a free-text Shopify field that merchants modify for operational reasons unrelated to actual product categorization. For example, a jam might have `productType: "Pantry"` because an ops team member changed it for inventory purposes.

Using unreliable data as a high-confidence signal would inject confusion into classification results. ProductType is still accepted in input (for bundle detection) but is not used for category selection.

### Why Embedding Search Uses Limited Product Data

The embedding search intentionally excludes:
- **ProductType**: Unreliable merchant labels
- **Marketing tags**: "staff-pick", "trending", etc. don't describe the product

This ensures semantic matching is based on what the product actually is, not how it's marketed or labeled.

### Bundle Depth Limiting

Bundles (variety packs, gift boxes) are capped at taxonomy level 3 because:
- They contain multiple products that may span categories
- Overly specific categorization is misleading
- Broader categories provide better discoverability

## Related Issues

- [BG-825](https://linear.app/bubble-goods/issue/BG-825) - Build classifier service
- [BG-861](https://linear.app/bubble-goods/issue/BG-861) - Catalog migration (2.8K products)
- [BG-862](https://linear.app/bubble-goods/issue/BG-862) - n8n integration for new products
- [BG-733](https://linear.app/bubble-goods/issue/BG-733) - Original taxonomy work
