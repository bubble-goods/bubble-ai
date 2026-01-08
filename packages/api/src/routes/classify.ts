/**
 * Classification routes for product taxonomy classification.
 */

import { type ClassificationInput, classify } from '@bubble-ai/classifier'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../worker.js'

// Input validation schema
const ClassificationInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  productType: z.string().optional(),
  variants: z
    .array(
      z.object({
        title: z.string().optional(),
        sku: z.string().optional(),
        options: z.record(z.string()).optional(),
      }),
    )
    .optional(),
})

// Config validation schema
const ConfigSchema = z
  .object({
    confidenceThreshold: z.number().min(0).max(1).optional(),
    maxCandidates: z.number().int().min(1).max(50).optional(),
    extractAttributes: z.boolean().optional(),
    model: z.enum(['claude-sonnet', 'claude-opus', 'gpt-4o']).optional(),
  })
  .optional()

// Request body schema
const ClassifyRequestSchema = z.object({
  product: ClassificationInputSchema,
  config: ConfigSchema,
})

// Batch request schema
const BatchRequestSchema = z.object({
  products: z.array(ClassificationInputSchema).min(1).max(10),
  config: ConfigSchema,
})

const app = new Hono<{ Bindings: Env }>()

/**
 * POST /classify - Classify a single product
 */
app.post('/', async (c) => {
  const startTime = Date.now()

  try {
    const body = await c.req.json()
    const parsed = ClassifyRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: 'Validation error',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        400,
      )
    }

    const { product, config } = parsed.data

    // Set API keys for SDK clients
    if (typeof process !== 'undefined' && process.env) {
      process.env.ANTHROPIC_API_KEY = c.env.ANTHROPIC_API_KEY
      process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY
    }

    const result = await classify(product as ClassificationInput, config)
    const duration = Date.now() - startTime

    return c.json({
      success: true,
      result,
      meta: {
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Classification error:', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    })

    return c.json(
      {
        error: 'Classification failed',
        message,
        meta: {
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      500,
    )
  }
})

/**
 * POST /classify/batch - Classify multiple products (1-10)
 */
app.post('/batch', async (c) => {
  const startTime = Date.now()

  try {
    const body = await c.req.json()
    const parsed = BatchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        {
          error: 'Validation error',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        400,
      )
    }

    const { products, config } = parsed.data

    // Set API keys for SDK clients
    if (typeof process !== 'undefined' && process.env) {
      process.env.ANTHROPIC_API_KEY = c.env.ANTHROPIC_API_KEY
      process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY
    }

    // Process products sequentially to avoid rate limits
    const results = []
    for (const product of products) {
      try {
        const result = await classify(product as ClassificationInput, config)
        results.push({ success: true, result })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push({ success: false, error: message })
      }
    }

    const duration = Date.now() - startTime

    return c.json({
      success: true,
      results,
      meta: {
        count: products.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Batch classification error:', { error: message, duration })

    return c.json(
      {
        error: 'Batch classification failed',
        message,
        meta: {
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      500,
    )
  }
})

export default app
