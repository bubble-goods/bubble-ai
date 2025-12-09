import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  TaxonomyAttribute,
  TaxonomyCategory,
  TaxonomyData,
} from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data')

// Cached data (loaded once per process)
let taxonomyCache: Map<string, string> | null = null
let reverseTaxonomyCache: Map<string, string> | null = null
let fullTaxonomyCache: Map<string, TaxonomyCategory> | null = null
let attributesCache: Map<string, TaxonomyAttribute> | null = null
let taxonomyVersion: string | null = null

/**
 * Load taxonomy from categories.txt (cached).
 * Maps category paths to GIDs.
 */
export function loadTaxonomy(): Map<string, string> {
  if (taxonomyCache) return taxonomyCache

  taxonomyCache = new Map()
  const content = readFileSync(join(DATA_DIR, 'categories.txt'), 'utf-8')

  for (const line of content.split('\n')) {
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

  return taxonomyCache
}

/**
 * Load reverse taxonomy mapping (GID -> category path) (cached).
 */
export function loadTaxonomyReverse(): Map<string, string> {
  if (reverseTaxonomyCache) return reverseTaxonomyCache

  const taxonomy = loadTaxonomy()
  reverseTaxonomyCache = new Map()

  for (const [path, gid] of taxonomy) {
    reverseTaxonomyCache.set(gid, path)
  }

  return reverseTaxonomyCache
}

/**
 * Load full taxonomy with attributes from taxonomy.json (cached).
 * Returns a map of category codes to full category details.
 */
export function loadTaxonomyFull(): Map<string, TaxonomyCategory> {
  if (fullTaxonomyCache) return fullTaxonomyCache

  fullTaxonomyCache = new Map()
  const content = readFileSync(join(DATA_DIR, 'taxonomy.json'), 'utf-8')
  const data: TaxonomyData = JSON.parse(content)

  taxonomyVersion = data.version

  for (const vertical of data.verticals) {
    for (const category of vertical.categories) {
      const code = extractCategoryCode(category.id)
      if (code) {
        fullTaxonomyCache.set(code, category)
      }
    }
  }

  return fullTaxonomyCache
}

/**
 * Load attribute definitions indexed by handle (cached).
 */
export function loadAttributesIndex(): Map<string, TaxonomyAttribute> {
  if (attributesCache) return attributesCache

  attributesCache = new Map()
  const content = readFileSync(join(DATA_DIR, 'taxonomy.json'), 'utf-8')
  const data: TaxonomyData = JSON.parse(content)

  if (data.attributes) {
    for (const attr of data.attributes) {
      if (attr.handle) {
        attributesCache.set(attr.handle, attr)
      }
    }
  }

  return attributesCache
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
  if (taxonomyVersion) return taxonomyVersion

  const content = readFileSync(join(DATA_DIR, 'taxonomy.json'), 'utf-8')
  const data: TaxonomyData = JSON.parse(content)
  taxonomyVersion = data.version

  return taxonomyVersion
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
