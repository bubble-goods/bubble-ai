import { describe, expect, it } from 'vitest'
import {
  adjustCategoryForBundle,
  buildSignals,
  calculateConfidence,
  DEFAULT_CONFIDENCE_THRESHOLD,
  needsReview,
  scoreSpecificity,
  validateSelection,
} from '../src/confidence.js'
import type { BundleDetection, CategoryCandidate } from '../src/types.js'

describe('calculateConfidence', () => {
  it('calculates confidence from LLM score', () => {
    const confidence = calculateConfidence({
      llmConfidence: 1.0,
    })
    // LLM weight is 0.85
    expect(confidence).toBeCloseTo(0.85, 1)
  })

  it('adds embedding score contribution', () => {
    const withoutEmbedding = calculateConfidence({
      llmConfidence: 0.8,
    })
    const withEmbedding = calculateConfidence({
      llmConfidence: 0.8,
      embeddingScore: 0.9,
    })
    expect(withEmbedding).toBeGreaterThan(withoutEmbedding)
  })

  it('applies bundle penalty', () => {
    const bundleDetection: BundleDetection = {
      isBundle: true,
      confidence: 0.5,
      signals: [],
      recommendedMaxDepth: 3,
    }
    const withBundle = calculateConfidence({
      llmConfidence: 0.9,
      bundleDetection,
    })
    const without = calculateConfidence({
      llmConfidence: 0.9,
    })
    expect(withBundle).toBeLessThan(without)
  })

  it('clamps result to 0-1 range', () => {
    const max = calculateConfidence({
      llmConfidence: 1.0,
      embeddingScore: 1.0,
    })
    expect(max).toBeLessThanOrEqual(1)
    expect(max).toBeGreaterThanOrEqual(0)
  })
})

describe('needsReview', () => {
  it('returns true when confidence below threshold', () => {
    expect(needsReview(0.7)).toBe(true)
    expect(needsReview(0.84)).toBe(true)
  })

  it('returns false when confidence at or above threshold', () => {
    expect(needsReview(0.85)).toBe(false)
    expect(needsReview(0.95)).toBe(false)
  })

  it('uses custom threshold', () => {
    expect(needsReview(0.7, 0.6)).toBe(false)
    expect(needsReview(0.5, 0.6)).toBe(true)
  })

  it('exports default threshold', () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.85)
  })
})

describe('buildSignals', () => {
  it('builds signals from inputs', () => {
    const bundleDetection: BundleDetection = {
      isBundle: true,
      confidence: 0.8,
      signals: ['title contains "variety"'],
      recommendedMaxDepth: 3,
    }
    const candidate: CategoryCandidate = {
      code: 'fb-1',
      path: 'Food Items',
      level: 1,
      source: 'embedding',
      score: 0.9,
    }

    const signals = buildSignals({
      bundleDetection,
      topCandidate: candidate,
    })

    expect(signals.isBundle).toBe(true)
    expect(signals.embeddingTopMatch).toBe('Food Items')
    expect(signals.embeddingScore).toBe(0.9)
  })

  it('handles null values', () => {
    const bundleDetection: BundleDetection = {
      isBundle: false,
      confidence: 0.1,
      signals: [],
      recommendedMaxDepth: 7,
    }

    const signals = buildSignals({
      bundleDetection,
      topCandidate: null,
    })

    expect(signals.isBundle).toBe(false)
    expect(signals.embeddingTopMatch).toBeUndefined()
  })
})

describe('adjustCategoryForBundle', () => {
  it('returns original code for non-bundles', () => {
    const bundleDetection: BundleDetection = {
      isBundle: false,
      confidence: 0.1,
      signals: [],
      recommendedMaxDepth: 7,
    }
    const result = adjustCategoryForBundle('fb-1-3-1-2', bundleDetection)
    expect(result).toBe('fb-1-3-1-2')
  })

  it('truncates code for bundles at max depth', () => {
    const bundleDetection: BundleDetection = {
      isBundle: true,
      confidence: 0.9,
      signals: [],
      recommendedMaxDepth: 3,
    }
    // Code has 5 parts (fb-1-3-1-2), maxDepth 3 means keep 4 parts
    const result = adjustCategoryForBundle('fb-1-3-1-2', bundleDetection)
    expect(result).toBe('fb-1-3-1')
  })

  it('keeps short codes unchanged', () => {
    const bundleDetection: BundleDetection = {
      isBundle: true,
      confidence: 0.9,
      signals: [],
      recommendedMaxDepth: 3,
    }
    const result = adjustCategoryForBundle('fb-1', bundleDetection)
    expect(result).toBe('fb-1')
  })
})

describe('scoreSpecificity', () => {
  it('returns 0 for level 0', () => {
    expect(scoreSpecificity(0)).toBe(0)
  })

  it('returns 1 for max level', () => {
    expect(scoreSpecificity(7)).toBe(1)
  })

  it('returns proportional score', () => {
    expect(scoreSpecificity(3)).toBeCloseTo(3 / 7, 2)
  })

  it('uses custom max level', () => {
    expect(scoreSpecificity(5, 10)).toBe(0.5)
  })
})

describe('validateSelection', () => {
  const candidates: CategoryCandidate[] = [
    { code: 'fb-1', path: 'Food', level: 1, source: 'embedding', score: 0.9 },
    { code: 'fb-2', path: 'Bev', level: 1, source: 'embedding', score: 0.8 },
  ]

  it('returns candidate if found', () => {
    const result = validateSelection('fb-1', candidates)
    expect(result?.code).toBe('fb-1')
  })

  it('returns null if not found', () => {
    const result = validateSelection('fb-99', candidates)
    expect(result).toBeNull()
  })
})
