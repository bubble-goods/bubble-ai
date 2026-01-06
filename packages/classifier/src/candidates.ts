/**
 * Candidate selection for taxonomy classification.
 * Uses embedding search to find category candidates based on product content.
 */

import {
  getCategoryByCode,
  matchTaxonomyCategories,
  type TaxonomyCategory,
} from '@bubble-ai/taxonomy'
import OpenAI from 'openai'
import type { CategoryCandidate, ClassificationInput } from './types.js'

/** Embedding model to use */
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/** Default number of embedding candidates to retrieve */
const DEFAULT_MAX_CANDIDATES = 10

/** Category prefix for food products (Food, Beverages & Tobacco) */
const FOOD_CATEGORY_PREFIX = 'fb-'

/** Similarity threshold for embedding matches (lowered from 0.5 to capture more food categories) */
const EMBEDDING_MATCH_THRESHOLD = 0.3


/**
 * Generate embedding for text using OpenAI.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI()
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  })
  return response.data[0].embedding
}

/**
 * Get candidates from embedding similarity search.
 */
export async function getCandidatesFromEmbeddings(
  input: ClassificationInput,
  maxCandidates: number = DEFAULT_MAX_CANDIDATES,
  maxDepth?: number,
): Promise<CategoryCandidate[]> {
  // Build search text from input
  const searchText = buildSearchText(input)

  try {
    console.log('[DEBUG] Building search text...')
    console.log('[DEBUG] Search text:', searchText)

    // Generate embedding for search text
    console.log('[DEBUG] Generating embedding...')
    const embedding = await generateEmbedding(searchText)
    console.log('[DEBUG] Embedding generated, length:', embedding.length)

    // Search for similar categories (filtered to food categories only)
    console.log('[DEBUG] Searching taxonomy categories...')
    const results = await matchTaxonomyCategories(embedding, {
      matchThreshold: EMBEDDING_MATCH_THRESHOLD,
      matchCount: maxCandidates,
      filterLevel: maxDepth ?? null,
      categoryPrefix: FOOD_CATEGORY_PREFIX,
    })
    console.log('[DEBUG] Search results:', results.length, 'matches')

    return results.map((r) => ({
      code: r.categoryCode,
      path: r.fullPath,
      level: r.level,
      source: 'embedding' as const,
      score: r.similarity,
    }))
  } catch (error) {
    // If embeddings aren't available, return empty
    console.error('[ERROR] Embedding search failed:', error)
    return []
  }
}

/**
 * Build search text from classification input.
 * Combines title, description, and tags for embedding search.
 *
 * NOTE: ProductType is intentionally excluded to avoid biasing embedding search.
 * ProductType is often a broad merchant-assigned label (e.g., "Bakery") that may
 * not reflect where customers would look for the product. We want semantic matching
 * based on what the product actually is, not how the merchant categorized it.
 * ProductType is still passed to the LLM as context for its decision.
 */
export function buildSearchText(input: ClassificationInput): string {
  const parts: string[] = [input.title]

  if (input.description) {
    // Strip HTML and truncate description
    const cleanDesc = input.description
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500)
    if (cleanDesc) {
      parts.push(cleanDesc)
    }
  }

  // Include only product-descriptive tags, not marketing tags
  if (input.tags && input.tags.length > 0) {
    const productTags = input.tags
      .filter((t) => !isMarketingTag(t))
      .slice(0, 5)
    if (productTags.length > 0) {
      parts.push(productTags.join(' '))
    }
  }

  return parts.join(' | ')
}

/**
 * Check if a tag is primarily for marketing rather than product description.
 * Marketing tags shouldn't influence category embedding search.
 */
function isMarketingTag(tag: string): boolean {
  const marketingPatterns = [
    /^staff.?pick$/i,
    /^best.?seller$/i,
    /^new$/i,
    /^sale$/i,
    /^featured$/i,
    /^trending$/i,
    /^popular$/i,
    /^limited$/i,
    /^exclusive$/i,
  ]
  return marketingPatterns.some((pattern) => pattern.test(tag.trim()))
}

/**
 * Get all category candidates for classification.
 * Uses embedding search to find semantically similar categories.
 */
export async function getCandidates(
  input: ClassificationInput,
  options: {
    maxCandidates?: number
    maxDepth?: number
  } = {},
): Promise<CategoryCandidate[]> {
  const { maxCandidates = DEFAULT_MAX_CANDIDATES, maxDepth } = options

  // Get embedding candidates
  const candidates = await getCandidatesFromEmbeddings(input, maxCandidates, maxDepth)
  console.log(
    '[DEBUG] Embedding candidates:',
    JSON.stringify(candidates, null, 2),
  )

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score).slice(0, maxCandidates)
}

/**
 * Deduplicate candidates, keeping the highest score for each code.
 */
function deduplicateCandidates(
  candidates: CategoryCandidate[],
): CategoryCandidate[] {
  const byCode = new Map<string, CategoryCandidate>()

  for (const candidate of candidates) {
    const existing = byCode.get(candidate.code)
    if (!existing || candidate.score > existing.score) {
      byCode.set(candidate.code, candidate)
    }
  }

  return [...byCode.values()]
}

/**
 * Get child categories for a given parent code.
 * Useful for drilling down from a ProductType anchor.
 */
export function getChildCandidates(
  parentCode: string,
  allCategories: Map<string, TaxonomyCategory>,
): CategoryCandidate[] {
  const children: CategoryCandidate[] = []
  const parentPrefix = `${parentCode}-`

  for (const [code, category] of allCategories) {
    if (code.startsWith(parentPrefix)) {
      children.push({
        code,
        path: category.full_name,
        level: category.level,
        source: 'manual',
        score: 0.7, // Lower score for children
      })
    }
  }

  return children
}
