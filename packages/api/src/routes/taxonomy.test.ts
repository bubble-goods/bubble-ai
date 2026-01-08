import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock taxonomy functions before importing routes
vi.mock('@bubble-ai/taxonomy', () => ({
  getTaxonomyVersion: vi.fn(),
  getCategoryList: vi.fn(),
  searchCategories: vi.fn(),
  getCategoriesByLevel: vi.fn(),
  getLeafCategories: vi.fn(),
  getCategoryByCode: vi.fn(),
  getCategoryPathFromCode: vi.fn(),
  validateCategoryCode: vi.fn(),
}))

import {
  getCategoriesByLevel,
  getCategoryByCode,
  getCategoryList,
  getCategoryPathFromCode,
  getLeafCategories,
  getTaxonomyVersion,
  searchCategories,
  validateCategoryCode,
} from '@bubble-ai/taxonomy'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '../worker.js'
import taxonomyRoutes from './taxonomy.js'

const mockGetTaxonomyVersion = vi.mocked(getTaxonomyVersion)
const mockGetCategoryList = vi.mocked(getCategoryList)
const mockSearchCategories = vi.mocked(searchCategories)
const mockGetCategoriesByLevel = vi.mocked(getCategoriesByLevel)
const mockGetLeafCategories = vi.mocked(getLeafCategories)
const mockGetCategoryByCode = vi.mocked(getCategoryByCode)
const mockGetCategoryPathFromCode = vi.mocked(getCategoryPathFromCode)
const mockValidateCategoryCode = vi.mocked(validateCategoryCode)

function createTestApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>()
  app.route('/taxonomy', taxonomyRoutes)
  return app
}

describe('GET /taxonomy', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns taxonomy metadata', async () => {
    mockGetTaxonomyVersion.mockReturnValue('2024-10')
    mockGetCategoryList.mockReturnValue(['Path 1', 'Path 2', 'Path 3'])

    const res = await app.request('/taxonomy')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.version).toBe('2024-10')
    expect(data.totalCategories).toBe(3)
  })
})

describe('GET /taxonomy/categories', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default category list', async () => {
    mockGetCategoryList.mockReturnValue([
      'Food > Beverages > Juice',
      'Food > Beverages > Coffee',
    ])

    const res = await app.request('/taxonomy/categories')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.count).toBe(2)
    expect(data.categories[0].path).toBe('Food > Beverages > Juice')
  })

  it('searches categories by query', async () => {
    mockSearchCategories.mockReturnValue([
      { code: 'fb-1-7-1', fullName: 'Fruit Juice', gid: 'gid://1', level: 3 },
    ] as any)

    const res = await app.request('/taxonomy/categories?q=juice')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.count).toBe(1)
    expect(mockSearchCategories).toHaveBeenCalledWith('juice', 50)
  })

  it('filters by level', async () => {
    mockGetCategoriesByLevel.mockReturnValue([
      {
        id: 'gid://shopify/TaxonomyCategory/fb-1',
        name: 'Food',
        full_name: 'Food, Beverages & Tobacco',
        level: 0,
        parent_id: null,
        ancestors: [],
        children: [],
        attributes: [],
      },
    ])

    const res = await app.request('/taxonomy/categories?level=0')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.level).toBe(0)
    expect(data.categories[0].name).toBe('Food')
    expect(mockGetCategoriesByLevel).toHaveBeenCalledWith(0)
  })

  it('returns leaf categories only', async () => {
    mockGetLeafCategories.mockReturnValue([
      {
        id: 'gid://shopify/TaxonomyCategory/fb-1-7-1',
        name: 'Fruit Juice',
        full_name: 'Food > Beverages > Juice > Fruit Juice',
        level: 3,
        parent_id: 'gid://shopify/TaxonomyCategory/fb-1-7',
        ancestors: [],
        children: [],
        attributes: [],
      },
    ])

    const res = await app.request('/taxonomy/categories?leaves=true')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.categories[0].name).toBe('Fruit Juice')
    expect(mockGetLeafCategories).toHaveBeenCalled()
  })

  it('respects limit parameter', async () => {
    mockGetCategoryList.mockReturnValue(['A', 'B', 'C', 'D', 'E'])

    const res = await app.request('/taxonomy/categories?limit=2')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.count).toBe(2)
  })
})

describe('GET /taxonomy/categories/{code}', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns category details', async () => {
    mockValidateCategoryCode.mockReturnValue(true)
    mockGetCategoryByCode.mockReturnValue({
      id: 'gid://shopify/TaxonomyCategory/fb-1-7-1',
      name: 'Fruit Juice',
      full_name: 'Food > Beverages > Juice > Fruit Juice',
      level: 3,
      parent_id: 'gid://shopify/TaxonomyCategory/fb-1-7',
      ancestors: [{ id: 'gid://1', name: 'Food' }],
      children: [],
      attributes: [],
    })

    const res = await app.request('/taxonomy/categories/fb-1-7-1')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.code).toBe('fb-1-7-1')
    expect(data.name).toBe('Fruit Juice')
    expect(data.level).toBe(3)
  })

  it('returns 404 for invalid code', async () => {
    mockValidateCategoryCode.mockReturnValue(false)

    const res = await app.request('/taxonomy/categories/invalid-code')

    expect(res.status).toBe(404)
    const data: any = await res.json()
    expect(data.error).toBe('Invalid category code')
  })

  it('returns 404 when category not found', async () => {
    mockValidateCategoryCode.mockReturnValue(true)
    mockGetCategoryByCode.mockReturnValue(null)

    const res = await app.request('/taxonomy/categories/fb-999')

    expect(res.status).toBe(404)
    const data: any = await res.json()
    expect(data.error).toBe('Category not found')
  })
})

describe('GET /taxonomy/categories/{code}/children', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns child categories', async () => {
    mockValidateCategoryCode.mockReturnValue(true)
    mockGetCategoryByCode
      .mockReturnValueOnce({
        id: 'gid://shopify/TaxonomyCategory/fb-1-7',
        name: 'Juice',
        full_name: 'Food > Beverages > Juice',
        level: 2,
        parent_id: 'gid://shopify/TaxonomyCategory/fb-1',
        ancestors: [],
        children: [
          {
            id: 'gid://shopify/TaxonomyCategory/fb-1-7-1',
            name: 'Fruit Juice',
          },
        ],
        attributes: [],
      })
      .mockReturnValueOnce({
        id: 'gid://shopify/TaxonomyCategory/fb-1-7-1',
        name: 'Fruit Juice',
        full_name: 'Food > Beverages > Juice > Fruit Juice',
        level: 3,
        parent_id: 'gid://shopify/TaxonomyCategory/fb-1-7',
        ancestors: [],
        children: [],
        attributes: [],
      })

    const res = await app.request('/taxonomy/categories/fb-1-7/children')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.parentCode).toBe('fb-1-7')
    expect(data.count).toBe(1)
    expect(data.children[0].name).toBe('Fruit Juice')
    expect(data.children[0].hasChildren).toBe(false)
  })

  it('returns 404 for invalid parent code', async () => {
    mockValidateCategoryCode.mockReturnValue(false)

    const res = await app.request('/taxonomy/categories/invalid/children')

    expect(res.status).toBe(404)
  })
})

describe('GET /taxonomy/categories/{code}/path', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns category path', async () => {
    mockValidateCategoryCode.mockReturnValue(true)
    mockGetCategoryPathFromCode.mockReturnValue(
      'Food, Beverages & Tobacco > Beverages > Juice > Fruit Juice',
    )

    const res = await app.request('/taxonomy/categories/fb-1-7-1/path')

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.code).toBe('fb-1-7-1')
    expect(data.path).toBe(
      'Food, Beverages & Tobacco > Beverages > Juice > Fruit Juice',
    )
  })

  it('returns 404 for invalid code', async () => {
    mockValidateCategoryCode.mockReturnValue(false)

    const res = await app.request('/taxonomy/categories/invalid/path')

    expect(res.status).toBe(404)
  })

  it('returns 404 when path not found', async () => {
    mockValidateCategoryCode.mockReturnValue(true)
    mockGetCategoryPathFromCode.mockReturnValue(null)

    const res = await app.request('/taxonomy/categories/fb-999/path')

    expect(res.status).toBe(404)
  })
})

describe('POST /taxonomy/validate', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates category codes', async () => {
    mockValidateCategoryCode
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    const res = await app.request('/taxonomy/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codes: ['fb-1-7-1', 'invalid', 'fb-1'],
      }),
    })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.count).toBe(3)
    expect(data.valid).toBe(2)
    expect(data.invalid).toBe(1)
    expect(data.results[0]).toEqual({ code: 'fb-1-7-1', valid: true })
    expect(data.results[1]).toEqual({ code: 'invalid', valid: false })
  })

  it('returns all valid for valid codes', async () => {
    mockValidateCategoryCode.mockReturnValue(true)

    const res = await app.request('/taxonomy/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codes: ['fb-1', 'fb-2'],
      }),
    })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.valid).toBe(2)
    expect(data.invalid).toBe(0)
  })
})
