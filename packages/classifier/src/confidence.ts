/**
 * Confidence scoring for classification results.
 */

import type {
  BundleDetection,
  CategoryCandidate,
  ClassificationSignals,
} from './types.js'

/** Default threshold for auto-accepting classifications */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85

/** Weights for combining confidence signals */
const WEIGHTS = {
  llmConfidence: 0.6,
  embeddingScore: 0.3,
  bundleAdjustment: 0.1,
}

/**
 * Calculate combined confidence score from multiple signals.
 */
export function calculateConfidence(params: {
  llmConfidence: number
  embeddingScore?: number
  bundleDetection?: BundleDetection
}): number {
  const { llmConfidence, embeddingScore, bundleDetection } = params

  let score = 0

  // LLM confidence is the primary signal
  score += llmConfidence * WEIGHTS.llmConfidence

  // Embedding similarity score
  if (embeddingScore !== undefined) {
    score += embeddingScore * WEIGHTS.embeddingScore
  }

  // Bundle adjustment - slight penalty for bundles (harder to classify precisely)
  if (bundleDetection?.isBundle) {
    score -= WEIGHTS.bundleAdjustment * (1 - bundleDetection.confidence)
  }

  // Normalize to 0-1 range
  return Math.min(1, Math.max(0, score))
}

/**
 * Determine if a classification needs human review.
 */
export function needsReview(
  confidence: number,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  return confidence < threshold
}

/**
 * Build classification signals from various inputs.
 */
export function buildSignals(params: {
  bundleDetection: BundleDetection
  topCandidate: CategoryCandidate | null
}): ClassificationSignals {
  const { bundleDetection, topCandidate } = params

  return {
    isBundle: bundleDetection.isBundle,
    embeddingTopMatch: topCandidate?.path,
    embeddingScore: topCandidate?.score,
  }
}

/**
 * Adjust category depth based on bundle status and confidence.
 */
export function adjustCategoryForBundle(
  selectedCode: string,
  bundleDetection: BundleDetection,
): string {
  if (!bundleDetection.isBundle) {
    return selectedCode
  }

  // For bundles, cap at recommended max depth
  const parts = selectedCode.split('-')
  const maxParts = bundleDetection.recommendedMaxDepth + 1 // +1 for vertical prefix

  if (parts.length > maxParts) {
    return parts.slice(0, maxParts).join('-')
  }

  return selectedCode
}

/**
 * Score category specificity.
 * Higher levels (more specific) get higher scores.
 */
export function scoreSpecificity(level: number, maxLevel: number = 7): number {
  return level / maxLevel
}

/**
 * Validate that the selected category is among the candidates.
 */
export function validateSelection(
  selectedCode: string,
  candidates: CategoryCandidate[],
): CategoryCandidate | null {
  return candidates.find((c) => c.code === selectedCode) ?? null
}
