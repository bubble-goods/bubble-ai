import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  extractCategoryCode,
  getCategoriesByLevel,
  getCategoryByCode,
  getCategoryInfo,
  getCategoryList,
  getCategoryPathFromCode,
  getLeafCategories,
  getTaxonomyVersion,
  initTaxonomyFromData,
  loadTaxonomy,
  loadTaxonomyFull,
  mapCategoryPathToGid,
  searchCategories,
  type TaxonomyData,
  validateCategoryCode,
} from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../data')

// Load taxonomy data once for all tests
const categoriesText = readFileSync(resolve(dataDir, 'categories.txt'), 'utf-8')
const taxonomyJson = JSON.parse(
  readFileSync(resolve(dataDir, 'taxonomy.json'), 'utf-8'),
) as TaxonomyData

describe('taxonomy loader', () => {
  beforeAll(() => {
    initTaxonomyFromData(categoriesText, taxonomyJson)
  })

  afterEach(() => {
    // Re-initialize after clearing (some tests call clearCaches)
    initTaxonomyFromData(categoriesText, taxonomyJson)
  })

  describe('extractCategoryCode', () => {
    it('extracts code from valid GID', () => {
      expect(
        extractCategoryCode('gid://shopify/TaxonomyCategory/fb-1-7-1'),
      ).toBe('fb-1-7-1')
    })

    it('extracts code from root category GID', () => {
      expect(extractCategoryCode('gid://shopify/TaxonomyCategory/ap')).toBe(
        'ap',
      )
    })

    it('returns null for invalid GID', () => {
      expect(extractCategoryCode('invalid')).toBeNull()
      expect(extractCategoryCode('gid://other/Category/test')).toBeNull()
    })
  })

  describe('loadTaxonomy', () => {
    it('loads taxonomy from categories.txt', () => {
      const taxonomy = loadTaxonomy()
      expect(taxonomy.size).toBeGreaterThan(10000)
    })

    it('maps category paths to GIDs', () => {
      const taxonomy = loadTaxonomy()
      expect(taxonomy.get('Animals & Pet Supplies')).toBe(
        'gid://shopify/TaxonomyCategory/ap',
      )
    })

    it('caches results', () => {
      const taxonomy1 = loadTaxonomy()
      const taxonomy2 = loadTaxonomy()
      expect(taxonomy1).toBe(taxonomy2)
    })
  })

  describe('loadTaxonomyFull', () => {
    it('loads full taxonomy from taxonomy.json', () => {
      const taxonomy = loadTaxonomyFull()
      expect(taxonomy.size).toBeGreaterThan(10000)
    })

    it('includes category details', () => {
      const taxonomy = loadTaxonomyFull()
      const category = taxonomy.get('ap')
      expect(category).toBeDefined()
      expect(category?.name).toBe('Animals & Pet Supplies')
      expect(category?.level).toBe(0)
    })
  })

  describe('getTaxonomyVersion', () => {
    it('returns version string', () => {
      const version = getTaxonomyVersion()
      expect(version).toMatch(/^\d{4}-\d{2}/)
    })
  })
})

describe('taxonomy search', () => {
  beforeAll(() => {
    initTaxonomyFromData(categoriesText, taxonomyJson)
  })

  afterEach(() => {
    // Re-initialize after clearing (some tests call clearCaches)
    initTaxonomyFromData(categoriesText, taxonomyJson)
  })

  describe('mapCategoryPathToGid', () => {
    it('returns GID for valid path', () => {
      expect(mapCategoryPathToGid('Animals & Pet Supplies')).toBe(
        'gid://shopify/TaxonomyCategory/ap',
      )
    })

    it('returns null for invalid path', () => {
      expect(mapCategoryPathToGid('Nonexistent Category')).toBeNull()
    })
  })

  describe('getCategoryInfo', () => {
    it('returns GID and code for valid path', () => {
      const info = getCategoryInfo('Animals & Pet Supplies')
      expect(info).toEqual({
        gid: 'gid://shopify/TaxonomyCategory/ap',
        code: 'ap',
      })
    })

    it('returns null for invalid path', () => {
      expect(getCategoryInfo('Nonexistent Category')).toBeNull()
    })
  })

  describe('getCategoryList', () => {
    it('returns sorted list of all category paths', () => {
      const list = getCategoryList()
      expect(list.length).toBeGreaterThan(10000)
      expect(list[0] < list[1]).toBe(true)
    })
  })

  describe('searchCategories', () => {
    it('finds categories matching query', () => {
      const results = searchCategories('juice')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].path.toLowerCase()).toContain('juice')
    })

    it('respects maxResults', () => {
      const results = searchCategories('food', 3)
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('is case-insensitive', () => {
      const lower = searchCategories('juice', 5)
      const upper = searchCategories('JUICE', 5)
      expect(lower.length).toBe(upper.length)
    })
  })

  describe('validateCategoryCode', () => {
    it('returns true for valid codes', () => {
      expect(validateCategoryCode('ap')).toBe(true)
      expect(validateCategoryCode('fb-1-7-1')).toBe(true)
    })

    it('returns false for invalid codes', () => {
      expect(validateCategoryCode('invalid')).toBe(false)
      expect(validateCategoryCode('zz-99-99')).toBe(false)
    })
  })

  describe('getCategoryPathFromCode', () => {
    it('returns path for valid code', () => {
      expect(getCategoryPathFromCode('ap')).toBe('Animals & Pet Supplies')
    })

    it('returns null for invalid code', () => {
      expect(getCategoryPathFromCode('invalid')).toBeNull()
    })
  })

  describe('getCategoryByCode', () => {
    it('returns full category details', () => {
      const category = getCategoryByCode('ap')
      expect(category).toBeDefined()
      expect(category?.name).toBe('Animals & Pet Supplies')
      expect(category?.level).toBe(0)
      expect(category?.children).toBeDefined()
    })

    it('returns null for invalid code', () => {
      expect(getCategoryByCode('invalid')).toBeNull()
    })
  })

  describe('getCategoriesByLevel', () => {
    it('returns categories at specified level', () => {
      const categories = getCategoriesByLevel(0)
      expect(categories.length).toBeGreaterThan(0)
      for (const cat of categories) {
        expect(cat.level).toBe(0)
      }
    })
  })

  describe('getLeafCategories', () => {
    it('returns categories with no children', () => {
      const leaves = getLeafCategories()
      expect(leaves.length).toBeGreaterThan(0)
      for (const cat of leaves) {
        expect(cat.children.length).toBe(0)
      }
    })
  })
})
