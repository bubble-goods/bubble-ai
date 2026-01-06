import { describe, expect, it } from 'vitest'
import {
  detectBundle,
  getMaxDepthForBundle,
  hasBundleKeywords,
} from '../src/bundles.js'
import type { ClassificationInput } from '../src/types.js'

describe('detectBundle', () => {
  it('detects variety pack in title', () => {
    const input: ClassificationInput = {
      title: 'Artisan Chocolate Variety Pack',
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.4)
    expect(result.signals).toContain('title contains "variety pack"')
    expect(result.recommendedMaxDepth).toBe(3)
  })

  it('detects gift box in title', () => {
    const input: ClassificationInput = {
      title: 'Holiday Gift Box - Premium Selection',
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.signals).toContain('title contains "gift box"')
  })

  it('detects bundle from productType', () => {
    const input: ClassificationInput = {
      title: 'Snack Collection',
      productType: 'Gift Box',
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.signals.some((s) => s.includes('productType'))).toBe(true)
  })

  it('detects bundle from tags', () => {
    const input: ClassificationInput = {
      title: 'Premium Snack Selection',
      tags: ['snacks', 'bundle', 'organic'],
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.signals.some((s) => s.includes('bundle-related tag'))).toBe(
      true,
    )
  })

  it('detects sampler in description', () => {
    const input: ClassificationInput = {
      title: 'Coffee Collection',
      description: 'A sampler of our finest roasts from around the world.',
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.signals.some((s) => s.includes('description'))).toBe(true)
  })

  it('does not flag regular product as bundle', () => {
    const input: ClassificationInput = {
      title: 'Organic Dark Chocolate Bar 70%',
      description: 'Rich dark chocolate made with organic cacao.',
      productType: 'Chocolate',
      tags: ['chocolate', 'organic', 'dark'],
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(false)
    expect(result.confidence).toBeLessThan(0.4)
    expect(result.recommendedMaxDepth).toBe(7)
  })

  it('detects bundle from multiple variant types', () => {
    const input: ClassificationInput = {
      title: 'Flavor Explorer Pack',
      variants: [
        { title: 'Chocolate' },
        { title: 'Vanilla' },
        { title: 'Strawberry' },
        { title: 'Caramel' },
      ],
    }
    const result = detectBundle(input)
    // Title alone should trigger, but variants add confidence
    expect(result.isBundle).toBe(true)
  })

  it('does not flag size variants as bundle', () => {
    const input: ClassificationInput = {
      title: 'Organic Honey',
      variants: [{ title: 'Small' }, { title: 'Medium' }, { title: 'Large' }],
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(false)
  })

  it('does NOT flag pack-size-only variants as bundle', () => {
    // Pack-size variants (2-pack, 6-pack) are quantity options, not variety bundles
    const input: ClassificationInput = {
      title: 'Granola Bars',
      variants: [
        { title: '6-pack' },
        { title: '12-pack' },
        { title: '24-pack' },
      ],
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(false)
    expect(result.signals.length).toBe(0)
  })

  it('combines multiple signals for higher confidence', () => {
    const input: ClassificationInput = {
      title: 'Holiday Variety Gift Box',
      productType: 'Gift Set',
      tags: ['gift', 'variety', 'bundle'],
      description: 'An assortment of our best sellers.',
    }
    const result = detectBundle(input)
    expect(result.isBundle).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
    expect(result.signals.length).toBeGreaterThanOrEqual(3)
  })
})

describe('hasBundleKeywords', () => {
  it('returns true for bundle keywords', () => {
    expect(hasBundleKeywords('Variety Pack')).toBe(true)
    expect(hasBundleKeywords('gift box set')).toBe(true)
    expect(hasBundleKeywords('SAMPLER collection')).toBe(true)
  })

  it('returns false for non-bundle text', () => {
    expect(hasBundleKeywords('Organic Dark Chocolate')).toBe(false)
    expect(hasBundleKeywords('Single Origin Coffee')).toBe(false)
  })
})

describe('getMaxDepthForBundle', () => {
  it('returns 3 for bundles', () => {
    expect(getMaxDepthForBundle(true)).toBe(3)
  })

  it('returns 7 for non-bundles', () => {
    expect(getMaxDepthForBundle(false)).toBe(7)
  })
})
