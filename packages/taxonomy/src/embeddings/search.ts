import type { CategorySearchResult } from '../taxonomy/types.js'
import { getSupabase } from './client.js'

export interface EmbeddingSearchOptions {
  matchThreshold?: number
  matchCount?: number
  filterLevel?: number | null
  /** Filter categories by code prefix (e.g., 'fb-' for food categories) */
  categoryPrefix?: string | null
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Search for taxonomy categories using vector similarity.
 * Uses client-side similarity calculation for accuracy (IVFFlat index can miss results after bulk updates).
 * Requires an embedding generated from OpenAI text-embedding-3-small.
 */
export async function matchTaxonomyCategories(
  queryEmbedding: number[],
  options: EmbeddingSearchOptions = {},
): Promise<CategorySearchResult[]> {
  const {
    matchThreshold = 0.5,
    matchCount = 5,
    filterLevel = null,
    categoryPrefix = null,
  } = options

  const supabase = getSupabase()

  console.log('[DEBUG taxonomy] Calling match_categories RPC with:', {
    matchThreshold,
    matchCount,
    filterLevel,
    categoryPrefix,
    embeddingLength: queryEmbedding.length,
  })

  // Build query with filters
  let query = supabase
    .from('embeddings')
    .select('category_code, category_name, full_path, level, embedding')

  if (filterLevel !== null) {
    query = query.eq('level', filterLevel)
  }

  if (categoryPrefix) {
    query = query.like('category_code', `${categoryPrefix}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`)
  }

  // Calculate similarities client-side for accuracy
  const results: CategorySearchResult[] = []
  for (const row of data ?? []) {
    // Parse embedding if it's a string (Supabase returns vectors as JSON strings)
    let embedding = row.embedding
    if (typeof embedding === 'string') {
      try {
        embedding = JSON.parse(embedding)
      } catch {
        continue // Skip invalid embeddings
      }
    }

    if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) {
      continue
    }

    const similarity = cosineSimilarity(queryEmbedding, embedding)
    if (similarity >= matchThreshold) {
      results.push({
        categoryCode: row.category_code,
        categoryName: row.category_name,
        fullPath: row.full_path,
        level: row.level,
        similarity,
      })
    }
  }

  // Sort by similarity descending and limit
  results.sort((a, b) => b.similarity - a.similarity)

  console.log('[DEBUG taxonomy] RPC response:', {
    error: null,
    dataLength: results.length,
    data: results.slice(0, 2),
  })

  return results.slice(0, matchCount)
}

/**
 * Get embedding for a single category by code.
 */
export async function getCategoryEmbedding(
  categoryCode: string,
): Promise<number[] | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('embeddings')
    .select('embedding')
    .eq('category_code', categoryCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Supabase query error: ${error.message}`)
  }

  return data?.embedding ?? null
}

/**
 * Check if embeddings have been populated.
 */
export async function getEmbeddingsCount(): Promise<number> {
  const supabase = getSupabase()

  const { count, error } = await supabase
    .from('embeddings')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`)
  }

  return count ?? 0
}
