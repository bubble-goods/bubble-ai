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
 * Search for taxonomy categories using vector similarity.
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

  const { data, error } = await supabase.rpc('match_categories', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_level: filterLevel,
    category_prefix: categoryPrefix,
  })

  console.log('[DEBUG taxonomy] RPC response:', {
    error: error?.message ?? null,
    dataLength: data?.length ?? 0,
    data: data?.slice(0, 2), // First 2 results for debugging
  })

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`)
  }

  return (data ?? []).map(
    (row: {
      category_code: string
      category_name: string
      full_path: string
      level: number
      similarity: number
    }) => ({
      categoryCode: row.category_code,
      categoryName: row.category_name,
      fullPath: row.full_path,
      level: row.level,
      similarity: row.similarity,
    }),
  )
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
