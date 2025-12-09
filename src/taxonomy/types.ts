/**
 * Reference to a child or ancestor category (abbreviated form)
 */
export interface CategoryRef {
  id: string
  name: string
}

/**
 * Attribute definition applicable to a category
 */
export interface TaxonomyAttribute {
  id: string
  name: string
  handle: string
  description: string
  extended: boolean
  values?: AttributeValue[]
}

/**
 * Possible value for an attribute
 */
export interface AttributeValue {
  id: string
  name: string
  handle: string
}

/**
 * Full category details from taxonomy.json
 */
export interface TaxonomyCategory {
  id: string
  level: number
  name: string
  full_name: string
  parent_id: string | null
  attributes: TaxonomyAttribute[]
  children: CategoryRef[]
  ancestors: CategoryRef[]
}

/**
 * Vertical (top-level category group)
 */
export interface TaxonomyVertical {
  name: string
  prefix: string
  categories: TaxonomyCategory[]
}

/**
 * Root structure of taxonomy.json
 */
export interface TaxonomyData {
  version: string
  verticals: TaxonomyVertical[]
  attributes?: TaxonomyAttribute[]
}

/**
 * Search result with similarity score (for embedding search)
 */
export interface CategorySearchResult {
  categoryCode: string
  categoryName: string
  fullPath: string
  level: number
  similarity: number
}

/**
 * Simple search result for text-based search
 */
export interface CategoryMatch {
  path: string
  gid: string
  code: string
}
