/**
 * Classification input/output contracts for the Shopify taxonomy classifier.
 *
 * @see https://linear.app/bubble-goods/issue/BG-825
 */

/**
 * Input for classifying a product into Shopify taxonomy.
 */
export interface ClassificationInput {
  /** Product title */
  title: string
  /** Product description (HTML or plain text) */
  description?: string
  /** Product tags */
  tags?: string[]
  /** Shopify ProductType field */
  productType?: string
  /** Product variants with their details */
  variants?: ProductVariant[]
}

/**
 * Product variant information used for classification signals.
 */
export interface ProductVariant {
  /** Variant title (e.g., "Small", "Chocolate") */
  title?: string
  /** SKU code */
  sku?: string
  /** Variant options (e.g., { size: "Small", flavor: "Chocolate" }) */
  options?: Record<string, string>
}

/**
 * Result of classifying a product.
 */
export interface ClassificationOutput {
  /** The assigned taxonomy category */
  category: CategoryAssignment
  /** Extracted product attributes based on the category */
  attributes: AttributeAssignment[]
  /** LLM's reasoning for the classification */
  reasoning: string
  /** Whether this classification needs human review */
  needsReview: boolean
  /** Signals that influenced the classification */
  signals: ClassificationSignals
}

/**
 * Assigned taxonomy category with confidence.
 */
export interface CategoryAssignment {
  /** Category code (e.g., "fb-1-7-1") */
  code: string
  /** Full category path (e.g., "Food, Beverages & Tobacco > Food Items > ...") */
  path: string
  /** Shopify GID (e.g., "gid://shopify/TaxonomyCategory/fb-1-7-1") */
  gid: string
  /** Confidence score 0-1 */
  confidence: number
}

/**
 * Extracted attribute with confidence.
 */
export interface AttributeAssignment {
  /** Attribute handle (e.g., "flavor") */
  handle: string
  /** Human-readable attribute name */
  name: string
  /** Extracted value */
  value: string
  /** Confidence score 0-1 */
  confidence: number
}

/**
 * Signals that influenced the classification decision.
 */
export interface ClassificationSignals {
  /** Whether the product appears to be a bundle/variety pack */
  isBundle: boolean
  /** ProductType mapping match, if any */
  productTypeMatch?: string
  /** Top embedding similarity match */
  embeddingTopMatch?: string
  /** Embedding similarity score (0-1) */
  embeddingScore?: number
}

/**
 * Mapping from Shopify ProductType to taxonomy branch.
 * Used to constrain the search space for classification.
 */
export interface ProductTypeMapping {
  /** The ProductType value (case-insensitive match) */
  productType: string
  /** Target taxonomy category code to anchor search */
  categoryCode: string
  /** Optional: limit search depth from this anchor */
  maxDepth?: number
}

/**
 * Candidate category from embedding search or ProductType mapping.
 */
export interface CategoryCandidate {
  /** Category code */
  code: string
  /** Full category path */
  path: string
  /** Category level (0-7) */
  level: number
  /** Source of this candidate */
  source: 'embedding' | 'productType' | 'manual'
  /** Relevance score (0-1) */
  score: number
}

/**
 * Configuration for the classifier.
 */
export interface ClassifierConfig {
  /** Minimum confidence to auto-accept (default: 0.85) */
  confidenceThreshold?: number
  /** Maximum embedding candidates to consider (default: 10) */
  maxCandidates?: number
  /** Whether to extract attributes (default: true) */
  extractAttributes?: boolean
  /** LLM model to use (default: claude-sonnet) */
  model?: 'claude-sonnet' | 'claude-opus' | 'gpt-4o'
}

/**
 * Bundle detection result.
 */
export interface BundleDetection {
  /** Whether the product is detected as a bundle */
  isBundle: boolean
  /** Confidence in the bundle detection (0-1) */
  confidence: number
  /** Signals that contributed to the detection */
  signals: string[]
  /** Recommended maximum taxonomy depth for bundles */
  recommendedMaxDepth: number
}
