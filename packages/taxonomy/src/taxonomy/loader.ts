import type {
  TaxonomyAttribute,
  TaxonomyCategory,
  TaxonomyData,
} from './types.js'

// Cached data (loaded once per process)
let taxonomyCache: Map<string, string> | null = null
let reverseTaxonomyCache: Map<string, string> | null = null
let fullTaxonomyCache: Map<string, TaxonomyCategory> | null = null
let attributesCache: Map<string, TaxonomyAttribute> | null = null
let taxonomyVersion: string | null = null

/**
 * Initialize taxonomy from pre-loaded data.
 * Must be called before using any taxonomy functions.
 */
export function initTaxonomyFromData(
  categoriesText: string,
  taxonomyData: TaxonomyData,
): void {
  // Parse categories.txt content
  taxonomyCache = new Map()
  for (const line of categoriesText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(
      /^(gid:\/\/shopify\/TaxonomyCategory\/[\w-]+)\s*:\s*(.+)$/,
    )
    if (match) {
      const [, gid, categoryPath] = match
      taxonomyCache.set(categoryPath.trim(), gid)
    }
  }

  // Build reverse taxonomy
  reverseTaxonomyCache = new Map()
  for (const [path, gid] of taxonomyCache) {
    reverseTaxonomyCache.set(gid, path)
  }

  // Parse taxonomy.json content
  fullTaxonomyCache = new Map()
  taxonomyVersion = taxonomyData.version

  for (const vertical of taxonomyData.verticals) {
    for (const category of vertical.categories) {
      const code = extractCategoryCode(category.id)
      if (code) {
        fullTaxonomyCache.set(code, category)
      }
    }
  }

  // Parse attributes
  attributesCache = new Map()
  if (taxonomyData.attributes) {
    for (const attr of taxonomyData.attributes) {
      if (attr.handle) {
        attributesCache.set(attr.handle, attr)
      }
    }
  }
}

function ensureInitialized(): void {
  if (!taxonomyCache) {
    throw new Error(
      'Taxonomy not initialized. Call initTaxonomyFromData() first.',
    )
  }
}

/**
 * Get taxonomy mapping (category path -> GID).
 */
export function loadTaxonomy(): Map<string, string> {
  ensureInitialized()
  return taxonomyCache!
}

/**
 * Get reverse taxonomy mapping (GID -> category path).
 */
export function loadTaxonomyReverse(): Map<string, string> {
  ensureInitialized()
  return reverseTaxonomyCache!
}

/**
 * Get full taxonomy with category details.
 */
export function loadTaxonomyFull(): Map<string, TaxonomyCategory> {
  ensureInitialized()
  return fullTaxonomyCache!
}

/**
 * Get attribute definitions indexed by handle.
 */
export function loadAttributesIndex(): Map<string, TaxonomyAttribute> {
  ensureInitialized()
  return attributesCache!
}

/**
 * Extract category code from GID.
 * @example extractCategoryCode("gid://shopify/TaxonomyCategory/fr-1-2") // "fr-1-2"
 */
export function extractCategoryCode(gid: string): string | null {
  const match = gid.match(/^gid:\/\/shopify\/TaxonomyCategory\/([\w-]+)$/)
  return match ? match[1] : null
}

/**
 * Get the version of the loaded taxonomy data.
 */
export function getTaxonomyVersion(): string {
  ensureInitialized()
  return taxonomyVersion!
}

/**
 * Clear all caches (useful for testing).
 */
export function clearCaches(): void {
  taxonomyCache = null
  reverseTaxonomyCache = null
  fullTaxonomyCache = null
  attributesCache = null
  taxonomyVersion = null
}
