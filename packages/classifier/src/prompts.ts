/**
 * LLM prompt templates for taxonomy classification.
 */

import type { CategoryCandidate, ClassificationInput } from './types.js'

/**
 * Build the system prompt for leaf category classification.
 */
export function buildClassificationSystemPrompt(): string {
  return `You are an expert product categorizer for the Shopify product taxonomy.
Your task is to select the most specific and accurate category for a product from a list of candidates.

Guidelines:
1. Choose the MOST SPECIFIC category that accurately describes the product
2. For bundles/variety packs, choose a broader category that encompasses all items
3. Consider the product type, description, and tags when making your decision
4. Provide a confidence score from 0 to 1 based on how certain you are
5. Explain your reasoning briefly

Respond in JSON format only.`
}

/**
 * Build the user prompt for leaf category classification.
 */
export function buildClassificationUserPrompt(
  input: ClassificationInput,
  candidates: CategoryCandidate[],
): string {
  const productInfo = formatProductInfo(input)
  const candidateList = formatCandidates(candidates)

  return `## Product Information
${productInfo}

## Candidate Categories
${candidateList}

Select the best category and respond with this exact JSON structure:
{
  "selected_code": "the category code you chose",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category is the best fit"
}`
}

/**
 * Format product information for the prompt.
 */
function formatProductInfo(input: ClassificationInput): string {
  const lines: string[] = []

  lines.push(`**Title:** ${input.title}`)

  if (input.productType) {
    lines.push(`**Product Type:** ${input.productType}`)
  }

  if (input.description) {
    const cleanDesc = input.description
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)
    lines.push(`**Description:** ${cleanDesc}`)
  }

  if (input.tags && input.tags.length > 0) {
    lines.push(`**Tags:** ${input.tags.join(', ')}`)
  }

  if (input.variants && input.variants.length > 0) {
    const variantTitles = input.variants
      .map((v) => v.title)
      .filter(Boolean)
      .slice(0, 5)
    if (variantTitles.length > 0) {
      lines.push(`**Variants:** ${variantTitles.join(', ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Format candidates for the prompt.
 */
function formatCandidates(candidates: CategoryCandidate[]): string {
  return candidates
    .map(
      (c, i) =>
        `${i + 1}. **${c.code}** - ${c.path} (Level ${c.level}, Score: ${c.score.toFixed(2)})`,
    )
    .join('\n')
}

/**
 * Parse the LLM classification response.
 */
export function parseClassificationResponse(response: string): {
  selectedCode: string
  confidence: number
  reasoning: string
} | null {
  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    return {
      selectedCode: parsed.selected_code || parsed.selectedCode,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning || '',
    }
  } catch {
    return null
  }
}

/**
 * Build prompt for attribute extraction.
 */
export function buildAttributeExtractionPrompt(
  input: ClassificationInput,
  categoryPath: string,
  availableAttributes: Array<{
    handle: string
    name: string
    values?: string[]
  }>,
): string {
  const productInfo = formatProductInfo(input)

  const attrList = availableAttributes
    .map((a) => {
      const valuesStr = a.values?.length
        ? ` (values: ${a.values.slice(0, 10).join(', ')})`
        : ''
      return `- **${a.handle}**: ${a.name}${valuesStr}`
    })
    .join('\n')

  return `## Product
${productInfo}

## Assigned Category
${categoryPath}

## Available Attributes
${attrList}

Extract applicable attribute values from the product information.
Only include attributes where you can confidently determine the value.

Respond with this exact JSON structure:
{
  "attributes": [
    {"handle": "attribute_handle", "value": "extracted_value", "confidence": 0.9}
  ]
}

If no attributes can be extracted, return: {"attributes": []}`
}

/**
 * Parse attribute extraction response.
 */
export function parseAttributeResponse(response: string): Array<{
  handle: string
  value: string
  confidence: number
}> {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    const attributes = parsed.attributes || []

    return attributes.map(
      (a: { handle: string; value: string; confidence?: number }) => ({
        handle: a.handle,
        value: a.value,
        confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0.5)),
      }),
    )
  } catch {
    return []
  }
}
