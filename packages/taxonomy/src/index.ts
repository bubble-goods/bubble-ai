// Taxonomy types

// Embeddings client
export {
  getSupabase,
  initSupabase,
  initSupabaseFromEnv,
  type SupabaseConfig,
} from './embeddings/client.js'
// Embeddings search
export {
  type EmbeddingSearchOptions,
  getCategoryEmbedding,
  getEmbeddingsCount,
  matchTaxonomyCategories,
} from './embeddings/search.js'
// Taxonomy loader
export {
  clearCaches,
  extractCategoryCode,
  getTaxonomyVersion,
  loadAttributesIndex,
  loadTaxonomy,
  loadTaxonomyFull,
  loadTaxonomyReverse,
} from './taxonomy/loader.js'
// Taxonomy search
export {
  getAttributeByHandle,
  getCategoriesByLevel,
  getCategoryByCode,
  getCategoryInfo,
  getCategoryList,
  getCategoryPathFromCode,
  getLeafCategories,
  mapCategoryPathToGid,
  searchCategories,
  validateCategoryCode,
} from './taxonomy/search.js'
export type {
  AttributeValue,
  CategoryMatch,
  CategoryRef,
  CategorySearchResult,
  TaxonomyAttribute,
  TaxonomyCategory,
  TaxonomyData,
  TaxonomyVertical,
} from './taxonomy/types.js'
