import type { CategorySearchResult } from '../taxonomy/types.js'
import { getSupabase } from './client.js'

export interface EmbeddingSearchOptions {
  matchThreshold?: number
  matchCount?: number
  filterLevel?: number | null
}

/**
 * Search for taxonomy categories using vector similarity.
 * Requires an embedding generated from OpenAI text-embedding-3-small.
 */
export async function matchTaxonomyCategories(
  queryEmbedding: number[],
  options: EmbeddingSearchOptions = {},
): Promise<CategorySearchResult[]> {
  const { matchThreshold = 0.5, matchCount = 5, filterLevel = null } = options

  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('match_taxonomy_categories', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_level: filterLevel,
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
    .from('shopify_taxonomy_embeddings')
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
    .from('shopify_taxonomy_embeddings')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`)
  }

  return count ?? 0
}
