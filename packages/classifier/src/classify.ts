/**
 * Main classification logic for categorizing products into Shopify taxonomy.
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAttributeByHandle, getCategoryByCode } from '@bubble-ai/taxonomy'
import { detectBundle } from './bundles.js'
import { buildSearchText, getCandidates } from './candidates.js'
import {
  adjustCategoryForBundle,
  buildSignals,
  calculateConfidence,
  DEFAULT_CONFIDENCE_THRESHOLD,
  needsReview,
  validateSelection,
} from './confidence.js'
import {
  buildAttributeExtractionPrompt,
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt,
  parseAttributeResponse,
  parseClassificationResponse,
} from './prompts.js'
import type {
  AttributeAssignment,
  CategoryAssignment,
  ClassificationInput,
  ClassificationOutput,
  ClassifierConfig,
} from './types.js'

/** Anthropic client - created once at module load */
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Default classifier configuration */
const DEFAULT_CONFIG: Required<ClassifierConfig> = {
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  maxCandidates: 10,
  extractAttributes: true,
  model: 'claude-sonnet',
}

/** Model mapping for Anthropic API */
const MODEL_MAP = {
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'claude-opus': 'claude-opus-4-20250514',
  'gpt-4o': 'claude-sonnet-4-20250514', // Fallback to Sonnet
} as const

/**
 * Classify a product into the Shopify taxonomy.
 */
export async function classify(
  input: ClassificationInput,
  config: ClassifierConfig = {},
): Promise<ClassificationOutput> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Step 1: Detect if product is a bundle
  const bundleDetection = detectBundle(input)
  const maxDepth = bundleDetection.isBundle
    ? bundleDetection.recommendedMaxDepth
    : undefined

  // Step 2: Get category candidates from embedding search
  const candidates = await getCandidates(input, {
    maxCandidates: cfg.maxCandidates,
    maxDepth,
  })

  if (candidates.length === 0) {
    throw new Error('No category candidates found for product')
  }

  // Step 3: Use LLM to select best category
  const systemPrompt = buildClassificationSystemPrompt()
  const userPrompt = buildClassificationUserPrompt(input, candidates)

  // Debug: log candidates being sent to LLM
  console.log(
    '[DEBUG] Candidates for LLM:',
    JSON.stringify(
      candidates.map((c) => ({ code: c.code, path: c.path, score: c.score })),
      null,
      2,
    ),
  )

  const response = await anthropic.messages.create({
    model: MODEL_MAP[cfg.model],
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parseClassificationResponse(responseText)

  if (!parsed) {
    throw new Error('Failed to parse LLM classification response')
  }

  // Step 4: Validate selection
  const selectedCandidate = validateSelection(parsed.selectedCode, candidates)
  if (!selectedCandidate) {
    // Fall back to top candidate if LLM selected invalid code
    console.warn(
      `LLM selected invalid code ${parsed.selectedCode}, falling back to top candidate`,
    )
  }

  const finalCode = selectedCandidate?.code ?? candidates[0].code
  const adjustedCode = adjustCategoryForBundle(finalCode, bundleDetection)

  // Step 5: Get category details
  const category = getCategoryByCode(adjustedCode)
  if (!category) {
    throw new Error(`Category not found: ${adjustedCode}`)
  }

  // Step 6: Calculate confidence
  const confidence = calculateConfidence({
    llmConfidence: parsed.confidence,
    embeddingScore: candidates[0]?.score,
    bundleDetection,
  })

  // Step 7: Extract attributes if enabled
  let attributes: AttributeAssignment[] = []
  if (cfg.extractAttributes && category.attributes) {
    attributes = await extractAttributes(
      input,
      category.full_name,
      category.attributes,
      cfg.model,
    )
  }

  // Step 8: Build final output
  const signals = buildSignals({
    bundleDetection,
    topCandidate: candidates[0] ?? null,
  })

  const categoryAssignment: CategoryAssignment = {
    code: adjustedCode,
    path: category.full_name,
    gid: category.id,
    confidence,
  }

  return {
    category: categoryAssignment,
    attributes,
    reasoning: parsed.reasoning,
    needsReview: needsReview(confidence, cfg.confidenceThreshold),
    signals,
  }
}

/**
 * Extract attributes for the classified category.
 */
async function extractAttributes(
  input: ClassificationInput,
  categoryPath: string,
  attributeRefs: Array<{ id: string; name: string }>,
  model: ClassifierConfig['model'] = 'claude-sonnet',
): Promise<AttributeAssignment[]> {
  // Get full attribute details
  const availableAttributes = attributeRefs
    .map((ref) => {
      const attr = getAttributeByHandle(
        ref.name.toLowerCase().replace(/ /g, '_'),
      )
      if (!attr) return null
      return {
        handle: attr.handle,
        name: attr.name,
        values: attr.values?.map((v) => v.name),
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  if (availableAttributes.length === 0) {
    return []
  }

  const prompt = buildAttributeExtractionPrompt(
    input,
    categoryPath,
    availableAttributes,
  )

  const response = await anthropic.messages.create({
    model: MODEL_MAP[model ?? 'claude-sonnet'],
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parseAttributeResponse(responseText)

  // Map to AttributeAssignment format
  return parsed.map((a) => {
    const attrDef = availableAttributes.find((def) => def.handle === a.handle)
    return {
      handle: a.handle,
      name: attrDef?.name ?? a.handle,
      value: a.value,
      confidence: a.confidence,
    }
  })
}

/**
 * Classify a product without calling the LLM (for testing/offline use).
 * Uses only embedding search.
 */
export async function classifyOffline(
  input: ClassificationInput,
  config: ClassifierConfig = {},
): Promise<ClassificationOutput> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const bundleDetection = detectBundle(input)
  const maxDepth = bundleDetection.isBundle
    ? bundleDetection.recommendedMaxDepth
    : undefined

  const candidates = await getCandidates(input, {
    maxCandidates: cfg.maxCandidates,
    maxDepth,
  })

  if (candidates.length === 0) {
    throw new Error('No category candidates found for product')
  }

  const topCandidate = candidates[0]
  const adjustedCode = adjustCategoryForBundle(
    topCandidate.code,
    bundleDetection,
  )

  const category = getCategoryByCode(adjustedCode)
  if (!category) {
    throw new Error(`Category not found: ${adjustedCode}`)
  }

  const confidence = calculateConfidence({
    llmConfidence: 0.5, // No LLM confidence in offline mode
    embeddingScore: topCandidate.score,
    bundleDetection,
  })

  const signals = buildSignals({
    bundleDetection,
    topCandidate,
  })

  return {
    category: {
      code: adjustedCode,
      path: category.full_name,
      gid: category.id,
      confidence,
    },
    attributes: [],
    reasoning: 'Selected top embedding match (offline mode)',
    needsReview: true, // Always needs review in offline mode
    signals,
  }
}

/**
 * Get search text that will be used for embedding lookup.
 * Useful for debugging.
 */
export function getSearchText(input: ClassificationInput): string {
  return buildSearchText(input)
}
