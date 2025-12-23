/**
 * Bundle detection logic for identifying variety packs, gift boxes, and multi-product bundles.
 *
 * Bundles should be classified at a higher (less specific) taxonomy level since they
 * contain multiple distinct products that may span categories.
 */

import type { BundleDetection, ClassificationInput } from './types.js'

/** Words that strongly indicate a bundle (longer phrases first for matching) */
const BUNDLE_KEYWORDS = [
  'variety pack',
  'sample pack',
  'gift box',
  'gift set',
  'gift pack',
  'mix pack',
  'combo pack',
  'multi-pack',
  'multipack',
  'starter kit',
  'discovery set',
  'trial pack',
  'explorer pack',
  'variety',
  'sampler',
  'assortment',
  'assorted',
  'bundle',
  'collection',
  'mixed',
  'combo',
] as const

/** Tags that indicate bundle products */
const BUNDLE_TAGS = [
  'bundle',
  'variety',
  'gift',
  'gift-box',
  'sampler',
  'assortment',
  'multi-pack',
  'set',
  'collection',
] as const

/** ProductTypes that are inherently bundles */
const BUNDLE_PRODUCT_TYPES = [
  'gift box',
  'gift set',
  'variety pack',
  'bundle',
  'sampler',
  'assortment',
] as const

/** Maximum taxonomy depth for bundles (T2 = level 2, T3 = level 3) */
const BUNDLE_MAX_DEPTH = 3

/**
 * Detect if a product is a bundle based on various signals.
 *
 * @param input - The classification input
 * @returns Bundle detection result with confidence and signals
 */
export function detectBundle(input: ClassificationInput): BundleDetection {
  const signals: string[] = []
  let score = 0

  // Check title for bundle keywords
  const titleLower = input.title.toLowerCase()
  for (const keyword of BUNDLE_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      signals.push(`title contains "${keyword}"`)
      score += 0.4
      break // Only count once for title
    }
  }

  // Check description for bundle keywords
  if (input.description) {
    const descLower = input.description.toLowerCase()
    for (const keyword of BUNDLE_KEYWORDS) {
      if (descLower.includes(keyword)) {
        signals.push(`description contains "${keyword}"`)
        score += 0.2
        break
      }
    }
  }

  // Check ProductType
  if (input.productType) {
    const productTypeLower = input.productType.toLowerCase()
    for (const bundleType of BUNDLE_PRODUCT_TYPES) {
      if (productTypeLower.includes(bundleType)) {
        signals.push(`productType is "${input.productType}"`)
        score += 0.5
        break
      }
    }
  }

  // Check tags
  if (input.tags && input.tags.length > 0) {
    const tagsLower = input.tags.map((t) => t.toLowerCase())
    for (const bundleTag of BUNDLE_TAGS) {
      if (tagsLower.some((t) => t === bundleTag || t.includes(bundleTag))) {
        signals.push(`has bundle-related tag "${bundleTag}"`)
        score += 0.4
        break
      }
    }
  }

  // Check variants for variety signals
  if (input.variants && input.variants.length > 0) {
    const variantSignals = detectVariantBundleSignals(input.variants)
    if (variantSignals.length > 0) {
      signals.push(...variantSignals)
      score += 0.2 * variantSignals.length
    }
  }

  // Normalize score to 0-1 range
  const confidence = Math.min(score, 1)
  const isBundle = confidence >= 0.4

  return {
    isBundle,
    confidence,
    signals,
    recommendedMaxDepth: isBundle ? BUNDLE_MAX_DEPTH : 7,
  }
}

/**
 * Analyze variants for signals that indicate this is a bundle product.
 *
 * Note: Pack-size indicators alone (2-pack, 4-pack) do NOT indicate a bundle.
 * These are just quantity options for the same product.
 * A true bundle has different products/flavors within it (e.g., "Variety Pack: Cookie, Cracker, Brownie").
 */
function detectVariantBundleSignals(
  variants: NonNullable<ClassificationInput['variants']>,
): string[] {
  const signals: string[] = []

  // Pattern to identify pack-size-only variants (e.g., "2-pack", "4-pack", "6 count")
  const packSizeOnlyPattern = /^(\d+)\s*-?\s*(pack|count|ct|pc|pieces?|pk)$/i

  // Pattern to identify size-only variants (e.g., "small", "8oz")
  const sizeOnlyPattern =
    /^(small|medium|large|xs|s|m|l|xl|xxl|\d+\s*(oz|g|ml|lb|kg))$/i

  // Get variant titles, excluding pack-size-only and size-only variants
  const meaningfulVariants = variants
    .map((v) => v.title?.toLowerCase().trim())
    .filter(Boolean)
    .filter((t) => t && !packSizeOnlyPattern.test(t) && !sizeOnlyPattern.test(t))

  // If there are 3+ distinct meaningful variants, this might be a variety bundle
  const uniqueMeaningfulVariants = new Set(meaningfulVariants)
  if (uniqueMeaningfulVariants.size >= 3) {
    signals.push(`${uniqueMeaningfulVariants.size} distinct product variants`)
  }

  return signals
}

/**
 * Check if a string contains bundle-related keywords.
 * Useful for quick checks without full detection.
 */
export function hasBundleKeywords(text: string): boolean {
  const textLower = text.toLowerCase()
  return BUNDLE_KEYWORDS.some((keyword) => textLower.includes(keyword))
}

/**
 * Get the recommended maximum taxonomy depth based on bundle status.
 *
 * @param isBundle - Whether the product is a bundle
 * @returns Maximum depth (3 for bundles, 7 for regular products)
 */
export function getMaxDepthForBundle(isBundle: boolean): number {
  return isBundle ? BUNDLE_MAX_DEPTH : 7
}
