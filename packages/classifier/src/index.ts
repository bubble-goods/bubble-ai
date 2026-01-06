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
  getCandidates,
  getCandidatesFromEmbeddings,
  getChildCandidates,
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
  ProductVariant,
} from './types.js'
