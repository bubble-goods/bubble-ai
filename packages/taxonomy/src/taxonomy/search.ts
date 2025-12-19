import {
  extractCategoryCode,
  loadAttributesIndex,
  loadTaxonomy,
  loadTaxonomyFull,
  loadTaxonomyReverse,
} from './loader.js'
import type {
  CategoryMatch,
  TaxonomyAttribute,
  TaxonomyCategory,
} from './types.js'

/**
 * Map a category path to its GID.
 */
export function mapCategoryPathToGid(categoryPath: string): string | null {
  const taxonomy = loadTaxonomy()
  return taxonomy.get(categoryPath) ?? null
}

/**
 * Get both GID and category code for a category path.
 */
export function getCategoryInfo(
  categoryPath: string,
): { gid: string; code: string } | null {
  const gid = mapCategoryPathToGid(categoryPath)
  if (!gid) return null

  const code = extractCategoryCode(gid)
  if (!code) return null

  return { gid, code }
}

/**
 * Get list of all category paths.
 */
export function getCategoryList(): string[] {
  const taxonomy = loadTaxonomy()
  return Array.from(taxonomy.keys()).sort()
}

/**
 * Search for categories matching a query string.
 */
export function searchCategories(
  query: string,
  maxResults = 10,
): CategoryMatch[] {
  const queryLower = query.toLowerCase()
  const taxonomy = loadTaxonomy()
  const results: CategoryMatch[] = []

  for (const [path, gid] of taxonomy) {
    if (path.toLowerCase().includes(queryLower)) {
      const code = extractCategoryCode(gid)
      if (code) {
        results.push({ path, gid, code })
        if (results.length >= maxResults) break
      }
    }
  }

  return results
}

/**
 * Check if a category code exists in the taxonomy.
 */
export function validateCategoryCode(categoryCode: string): boolean {
  const gid = `gid://shopify/TaxonomyCategory/${categoryCode}`
  const reverseTaxonomy = loadTaxonomyReverse()
  return reverseTaxonomy.has(gid)
}

/**
 * Get category path from a category code.
 */
export function getCategoryPathFromCode(categoryCode: string): string | null {
  const gid = `gid://shopify/TaxonomyCategory/${categoryCode}`
  const reverseTaxonomy = loadTaxonomyReverse()
  return reverseTaxonomy.get(gid) ?? null
}

/**
 * Get full category details by category code.
 */
export function getCategoryByCode(
  categoryCode: string,
  includeAttributeValues = false,
): TaxonomyCategory | null {
  const taxonomy = loadTaxonomyFull()
  const category = taxonomy.get(categoryCode)

  if (!category) return null

  // Return a copy to avoid modifying cached data
  const result = { ...category }

  if (includeAttributeValues && result.attributes.length > 0) {
    const attributesIndex = loadAttributesIndex()
    const enrichedAttributes: TaxonomyAttribute[] = []

    for (const attr of result.attributes) {
      const fullAttr = attributesIndex.get(attr.handle)
      enrichedAttributes.push(fullAttr ? { ...fullAttr } : attr)
    }

    result.attributes = enrichedAttributes
  }

  return result
}

/**
 * Get attribute details by handle.
 */
export function getAttributeByHandle(
  attributeHandle: string,
): TaxonomyAttribute | null {
  const attributesIndex = loadAttributesIndex()
  return attributesIndex.get(attributeHandle) ?? null
}

/**
 * Get categories by level in the hierarchy.
 */
export function getCategoriesByLevel(level: number): TaxonomyCategory[] {
  const taxonomy = loadTaxonomyFull()
  const results: TaxonomyCategory[] = []

  for (const category of taxonomy.values()) {
    if (category.level === level) {
      results.push(category)
    }
  }

  return results
}

/**
 * Get all leaf categories (categories with no children).
 */
export function getLeafCategories(): TaxonomyCategory[] {
  const taxonomy = loadTaxonomyFull()
  const results: TaxonomyCategory[] = []

  for (const category of taxonomy.values()) {
    if (category.children.length === 0) {
      results.push(category)
    }
  }

  return results
}
