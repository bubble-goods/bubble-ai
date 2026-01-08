import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the classifier before importing the routes
vi.mock('@bubble-ai/classifier', () => ({
  classify: vi.fn(),
}))

// Mock taxonomy initialization
vi.mock('@bubble-ai/taxonomy', () => ({
  initTaxonomyFromData: vi.fn(),
  initSupabase: vi.fn(),
}))

import { classify } from '@bubble-ai/classifier'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '../worker.js'
import classifyRoutes from './classify.js'

const mockClassify = vi.mocked(classify)

// Create app with mock env bindings
function createTestApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>()

  // Mock environment middleware
  app.use('*', async (c, next) => {
    c.env = {
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      OPENAI_API_KEY: 'test-openai-key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      ENVIRONMENT: 'test',
    }
    await next()
  })

  app.route('/classify', classifyRoutes)
  return app
}

describe('POST /classify', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns classification result for valid product', async () => {
    mockClassify.mockResolvedValue({
      category: {
        code: 'fb-1-7-1',
        path: 'Food, Beverages & Tobacco > Beverages > Juice > Fruit Juice',
        gid: 'gid://shopify/TaxonomyCategory/fb-1-7-1',
        confidence: 0.92,
      },
      attributes: [
        { handle: 'flavor', name: 'Flavor', value: 'Orange', confidence: 0.95 },
      ],
      reasoning:
        'Product is clearly a fruit juice based on title and description',
      needsReview: false,
      signals: { isBundle: false },
    })

    const res = await app.request('/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          title: 'Organic Cold Pressed Orange Juice',
          description: 'Fresh squeezed organic orange juice',
        },
      }),
    })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.success).toBe(true)
    expect(data.result.category.code).toBe('fb-1-7-1')
    expect(data.result.needsReview).toBe(false)
    expect(data.meta.durationMs).toBeTypeOf('number')
  })

  it('returns 400 for missing product title', async () => {
    const res = await app.request('/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          description: 'Some description without title',
        },
      }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 500 when classifier throws', async () => {
    mockClassify.mockRejectedValue(new Error('Anthropic API rate limited'))

    const res = await app.request('/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          title: 'Some Product',
        },
      }),
    })

    expect(res.status).toBe(500)
    const data: any = await res.json()
    expect(data.error).toBe('Classification failed')
    expect(data.message).toBe('Anthropic API rate limited')
  })

  it('passes config options to classifier', async () => {
    mockClassify.mockResolvedValue({
      category: {
        code: 'fb-1',
        path: 'Food, Beverages & Tobacco',
        gid: 'gid://shopify/TaxonomyCategory/fb-1',
        confidence: 0.85,
      },
      attributes: [],
      reasoning: 'Generic food product',
      needsReview: true,
      signals: { isBundle: false },
    })

    const res = await app.request('/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: { title: 'Mystery Food Item' },
        config: {
          confidenceThreshold: 0.9,
          maxCandidates: 5,
          extractAttributes: false,
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(mockClassify).toHaveBeenCalledWith(
      { title: 'Mystery Food Item' },
      {
        confidenceThreshold: 0.9,
        maxCandidates: 5,
        extractAttributes: false,
      },
    )
  })
})

describe('POST /classify/batch', () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('classifies multiple products', async () => {
    mockClassify
      .mockResolvedValueOnce({
        category: {
          code: 'fb-1-7-1',
          path: 'Juice',
          gid: 'gid://1',
          confidence: 0.9,
        },
        attributes: [],
        reasoning: 'Juice',
        needsReview: false,
        signals: { isBundle: false },
      })
      .mockResolvedValueOnce({
        category: {
          code: 'fb-1-1',
          path: 'Coffee',
          gid: 'gid://2',
          confidence: 0.88,
        },
        attributes: [],
        reasoning: 'Coffee',
        needsReview: false,
        signals: { isBundle: false },
      })

    const res = await app.request('/classify/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [{ title: 'Orange Juice' }, { title: 'Cold Brew Coffee' }],
      }),
    })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.success).toBe(true)
    expect(data.results).toHaveLength(2)
    expect(data.meta.count).toBe(2)
    expect(data.meta.succeeded).toBe(2)
    expect(data.meta.failed).toBe(0)
  })

  it('handles partial failures in batch', async () => {
    mockClassify
      .mockResolvedValueOnce({
        category: {
          code: 'fb-1-7-1',
          path: 'Juice',
          gid: 'gid://1',
          confidence: 0.9,
        },
        attributes: [],
        reasoning: 'Juice',
        needsReview: false,
        signals: { isBundle: false },
      })
      .mockRejectedValueOnce(new Error('Classification failed'))

    const res = await app.request('/classify/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [{ title: 'Orange Juice' }, { title: 'Unknown Product' }],
      }),
    })

    expect(res.status).toBe(200)
    const data: any = await res.json()
    expect(data.success).toBe(true)
    expect(data.meta.succeeded).toBe(1)
    expect(data.meta.failed).toBe(1)
    expect(data.results[0].success).toBe(true)
    expect(data.results[1].success).toBe(false)
    expect(data.results[1].error).toBe('Classification failed')
  })
})
