import type {
  TaxonomyAttribute,
  TaxonomyCategory,
  TaxonomyData,
} from './types.js'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-compatible require for file reading in Node.js
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

// Cached data (loaded once per process)
let taxonomyCache: Map<string, string> | null = null
let reverseTaxonomyCache: Map<string, string> | null = null
let fullTaxonomyCache: Map<string, TaxonomyCategory> | null = null
let attributesCache: Map<string, TaxonomyAttribute> | null = null
let taxonomyVersion: string | null = null

// Flag to track if we're initialized from bundled data (Workers mode)
let initializedFromData = false

/**
 * Initialize taxonomy from pre-loaded data (for Cloudflare Workers).
 * Call this before using any taxonomy functions in a Worker environment.
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

  initializedFromData = true
}

/**
 * Helper to get data directory path (Node.js only).
 */
function getDataDir(): string {
  return join(__dirname, '../../data')
}

/**
 * Read file from data directory (Node.js only).
 */
function readDataFile(filename: string): string {
  const { readFileSync } = require('node:fs')
  return readFileSync(join(getDataDir(), filename), 'utf-8')
}

/**
 * Load taxonomy from categories.txt (cached).
 * Maps category paths to GIDs.
 */
export function loadTaxonomy(): Map<string, string> {
  if (taxonomyCache) return taxonomyCache

  // In Workers, must be initialized via initTaxonomyFromData first
  if (typeof require === 'undefined') {
    throw new Error(
      'Taxonomy not initialized. Call initTaxonomyFromData() first in Worker environments.',
    )
  }

  taxonomyCache = new Map()
  const content = readDataFile('categories.txt')

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
 * Check if we're in a Node.js environment (can use fs/path).
 * Workers and browsers don't have process.versions.node
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined
}

/**
 * Load full taxonomy with attributes from taxonomy.json (cached).
 * Returns a map of category codes to full category details.
 */
export function loadTaxonomyFull(): Map<string, TaxonomyCategory> {
  if (fullTaxonomyCache) return fullTaxonomyCache

  // In Workers/browsers, must be initialized via initTaxonomyFromData first
  if (!isNodeEnvironment()) {
    throw new Error(
      'Taxonomy not initialized. Call initTaxonomyFromData() first in Worker environments.',
    )
  }

  fullTaxonomyCache = new Map()
  const content = readDataFile('taxonomy.json')
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

  // In Workers, must be initialized via initTaxonomyFromData first
  if (typeof require === 'undefined') {
    throw new Error(
      'Taxonomy not initialized. Call initTaxonomyFromData() first in Worker environments.',
    )
  }

  attributesCache = new Map()
  const content = readDataFile('taxonomy.json')
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

  // In Workers, must be initialized via initTaxonomyFromData first
  if (typeof require === 'undefined') {
    throw new Error(
      'Taxonomy not initialized. Call initTaxonomyFromData() first in Worker environments.',
    )
  }

  const content = readDataFile('taxonomy.json')
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
