import { describe, expect, it } from 'vitest'
import {
  buildClassificationSystemPrompt,
  buildClassificationUserPrompt,
  parseAttributeResponse,
  parseClassificationResponse,
} from '../src/prompts.js'
import type { CategoryCandidate, ClassificationInput } from '../src/types.js'

describe('buildClassificationSystemPrompt', () => {
  it('returns a non-empty system prompt', () => {
    const prompt = buildClassificationSystemPrompt()
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('product categorizer')
    expect(prompt).toContain('JSON')
  })
})

describe('buildClassificationUserPrompt', () => {
  it('includes product information', () => {
    const input: ClassificationInput = {
      title: 'Organic Dark Chocolate Bar',
      productType: 'Chocolate',
      description: 'Rich dark chocolate made with organic cacao.',
      tags: ['chocolate', 'organic', 'dark'],
    }
    const candidates: CategoryCandidate[] = [
      {
        code: 'fb-1-3-1',
        path: 'Food > Candy & Chocolate > Chocolate',
        level: 3,
        source: 'embedding',
        score: 0.95,
      },
    ]

    const prompt = buildClassificationUserPrompt(input, candidates)

    expect(prompt).toContain('Organic Dark Chocolate Bar')
    expect(prompt).toContain('Chocolate')
    expect(prompt).toContain('organic cacao')
    expect(prompt).toContain('fb-1-3-1')
  })

  it('handles minimal input', () => {
    const input: ClassificationInput = {
      title: 'Product',
    }
    const candidates: CategoryCandidate[] = [
      {
        code: 'fb-1',
        path: 'Food Items',
        level: 1,
        source: 'embedding',
        score: 0.5,
      },
    ]

    const prompt = buildClassificationUserPrompt(input, candidates)
    expect(prompt).toContain('Product')
    expect(prompt).toContain('fb-1')
  })
})

describe('parseClassificationResponse', () => {
  it('parses valid JSON response', () => {
    const response = `{
      "selected_code": "fb-1-3-1",
      "confidence": 0.95,
      "reasoning": "This is dark chocolate"
    }`

    const result = parseClassificationResponse(response)

    expect(result).toEqual({
      selectedCode: 'fb-1-3-1',
      confidence: 0.95,
      reasoning: 'This is dark chocolate',
    })
  })

  it('extracts JSON from markdown code block', () => {
    const response = `Here is my analysis:
\`\`\`json
{
  "selected_code": "fb-1-3",
  "confidence": 0.8,
  "reasoning": "Candy category"
}
\`\`\``

    const result = parseClassificationResponse(response)

    expect(result?.selectedCode).toBe('fb-1-3')
    expect(result?.confidence).toBe(0.8)
  })

  it('clamps confidence to 0-1 range', () => {
    const response = `{"selected_code": "x", "confidence": 1.5, "reasoning": ""}`
    const result = parseClassificationResponse(response)
    expect(result?.confidence).toBe(1)
  })

  it('returns null for invalid JSON', () => {
    const result = parseClassificationResponse('not json')
    expect(result).toBeNull()
  })
})

describe('parseAttributeResponse', () => {
  it('parses valid attribute response', () => {
    const response = `{
      "attributes": [
        {"handle": "flavor", "value": "dark chocolate", "confidence": 0.9},
        {"handle": "organic", "value": "true", "confidence": 0.95}
      ]
    }`

    const result = parseAttributeResponse(response)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      handle: 'flavor',
      value: 'dark chocolate',
      confidence: 0.9,
    })
  })

  it('returns empty array for empty attributes', () => {
    const response = '{"attributes": []}'
    const result = parseAttributeResponse(response)
    expect(result).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    const result = parseAttributeResponse('invalid')
    expect(result).toEqual([])
  })

  it('defaults confidence to 0.5 if missing', () => {
    const response = '{"attributes": [{"handle": "x", "value": "y"}]}'
    const result = parseAttributeResponse(response)
    expect(result[0].confidence).toBe(0.5)
  })
})
