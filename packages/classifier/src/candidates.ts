/**
 * Candidate selection for taxonomy classification.
 * Combines ProductType mappings and embedding search to find category candidates.
 */

import {
  getCategoryByCode,
  matchTaxonomyCategories,
  type TaxonomyCategory,
} from '@bubble-ai/taxonomy'
import OpenAI from 'openai'
import type {
  CategoryCandidate,
  ClassificationInput,
  ProductTypeMapping,
} from './types.js'

/** Embedding model to use */
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

/** Default number of embedding candidates to retrieve */
const DEFAULT_MAX_CANDIDATES = 10

/**
 * Load ProductType mappings from the data file.
 */
export function loadProductTypeMappings(): ProductTypeMapping[] {
  // Dynamic import not needed - we can import JSON directly
  // For now, return empty array - will be populated from file
  return []
}

/**
 * Find a ProductType mapping for the given input.
 */
export function findProductTypeMapping(
  productType: string | undefined,
  mappings: ProductTypeMapping[],
): ProductTypeMapping | null {
  if (!productType) return null

  const normalized = productType.toLowerCase().trim()
  return (
    mappings.find((m) => m.productType.toLowerCase() === normalized) ?? null
  )
}

/**
 * Get candidates from ProductType mapping.
 */
export function getCandidatesFromProductType(
  mapping: ProductTypeMapping,
): CategoryCandidate[] {
  const category = getCategoryByCode(mapping.categoryCode)
  if (!category) return []

  return [
    {
      code: mapping.categoryCode,
      path: category.full_name,
      level: category.level,
      source: 'productType',
      score: 0.9, // High confidence for direct mapping
    },
  ]
}

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
    // Generate embedding for search text
    const embedding = await generateEmbedding(searchText)

    // Search for similar categories
    const results = await matchTaxonomyCategories(embedding, {
      matchCount: maxCandidates,
      filterLevel: maxDepth ?? null,
    })

    return results.map((r) => ({
      code: r.categoryCode,
      path: r.fullPath,
      level: r.level,
      source: 'embedding' as const,
      score: r.similarity,
    }))
  } catch (error) {
    // If embeddings aren't available, return empty
    console.warn('Embedding search failed:', error)
    return []
  }
}

/**
 * Build search text from classification input.
 * Combines title, description, and other fields for embedding search.
 */
export function buildSearchText(input: ClassificationInput): string {
  const parts: string[] = [input.title]

  if (input.productType) {
    parts.push(input.productType)
  }

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

  if (input.tags && input.tags.length > 0) {
    parts.push(input.tags.slice(0, 5).join(' '))
  }

  return parts.join(' | ')
}

/**
 * Get all category candidates for classification.
 * Combines ProductType mappings and embedding search.
 */
export async function getCandidates(
  input: ClassificationInput,
  mappings: ProductTypeMapping[],
  options: {
    maxCandidates?: number
    maxDepth?: number
  } = {},
): Promise<CategoryCandidate[]> {
  const { maxCandidates = DEFAULT_MAX_CANDIDATES, maxDepth } = options
  const candidates: CategoryCandidate[] = []

  // Try ProductType mapping first
  const mapping = findProductTypeMapping(input.productType, mappings)
  if (mapping) {
    const productTypeCandidates = getCandidatesFromProductType(mapping)
    candidates.push(...productTypeCandidates)
  }

  // Get embedding candidates
  const embeddingCandidates = await getCandidatesFromEmbeddings(
    input,
    maxCandidates,
    maxDepth,
  )
  candidates.push(...embeddingCandidates)

  // Deduplicate by code, keeping highest score
  const deduped = deduplicateCandidates(candidates)

  // Sort by score descending
  return deduped.sort((a, b) => b.score - a.score).slice(0, maxCandidates)
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
        source: 'productType',
        score: 0.7, // Lower score for children
      })
    }
  }

  return children
}
