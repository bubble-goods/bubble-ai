// Main classification

// Bundle detection
export {
  detectBundle,
  getMaxDepthForBundle,
  hasBundleKeywords,
} from './bundles.js'
// Candidate selection
export {
  buildSearchText,
  findProductTypeMapping,
  getCandidates,
  getCandidatesFromEmbeddings,
  getCandidatesFromProductType,
  getChildCandidates,
  loadProductTypeMappings,
} from './candidates.js'
export { classify, classifyOffline, getSearchText } from './classify.js'

// Confidence scoring
export {
  adjustCategoryForBundle,
  buildSignals,
  calculateConfidence,
  DEFAULT_CONFIDENCE_THRESHOLD,
  needsReview,
  scoreSpecificity,
  validateSelection,
} from './confidence.js'

// Prompts
export {
  buildAttributeExtractionPrompt,
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt,
  parseAttributeResponse,
  parseClassificationResponse,
} from './prompts.js'

// Types
export type {
  AttributeAssignment,
  BundleDetection,
  CategoryAssignment,
  CategoryCandidate,
  ClassificationInput,
  ClassificationOutput,
  ClassificationSignals,
  ClassifierConfig,
  ProductTypeMapping,
  ProductVariant,
} from './types.js'
