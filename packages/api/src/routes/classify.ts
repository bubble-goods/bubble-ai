/**
 * Classification routes for product taxonomy classification.
 */

import { type ClassificationInput, classify } from '@bubble-ai/classifier'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Env } from '../worker.js'

// === Schemas ===

const ProductInputSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .openapi({ example: 'Organic Cold Pressed Orange Juice' }),
    description: z
      .string()
      .optional()
      .openapi({
        example: 'Fresh squeezed organic orange juice, no added sugar.',
      }),
    tags: z
      .array(z.string())
      .optional()
      .openapi({ example: ['organic', 'juice', 'citrus'] }),
    productType: z.string().optional().openapi({ example: 'Juice' }),
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
  .openapi('ProductInput')

const ClassifierConfigSchema = z
  .object({
    confidenceThreshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .openapi({ example: 0.85 }),
    maxCandidates: z.number().int().min(1).max(50).optional(),
    extractAttributes: z.boolean().optional().openapi({ example: true }),
    model: z.enum(['claude-sonnet', 'claude-opus', 'gpt-4o']).optional(),
  })
  .openapi('ClassifierConfig')

const ClassifyRequestSchema = z
  .object({
    product: ProductInputSchema,
    config: ClassifierConfigSchema.optional(),
  })
  .openapi('ClassifyRequest')

const BatchClassifyRequestSchema = z
  .object({
    products: z.array(ProductInputSchema).min(1).max(10),
    config: ClassifierConfigSchema.optional(),
  })
  .openapi('BatchClassifyRequest')

const MetaSchema = z.object({
  durationMs: z.number().int(),
  timestamp: z.string().datetime(),
})

const ClassifyResponseSchema = z
  .object({
    success: z.boolean(),
    result: z.object({
      category: z.object({
        code: z.string(),
        name: z.string(),
        fullPath: z.string(),
        confidence: z.number(),
      }),
      attributes: z
        .array(
          z.object({
            handle: z.string(),
            value: z.string(),
            confidence: z.number(),
          }),
        )
        .optional(),
      signals: z.record(z.unknown()).optional(),
      needsReview: z.boolean(),
    }),
    meta: MetaSchema,
  })
  .openapi('ClassifyResponse')

const BatchClassifyResponseSchema = z
  .object({
    success: z.boolean(),
    results: z.array(
      z.object({
        success: z.boolean(),
        result: z.record(z.unknown()).optional(),
        error: z.string().optional(),
      }),
    ),
    meta: z.object({
      count: z.number().int(),
      succeeded: z.number().int(),
      failed: z.number().int(),
      durationMs: z.number().int(),
      timestamp: z.string().datetime(),
    }),
  })
  .openapi('BatchClassifyResponse')

const ValidationErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Validation error' }),
    details: z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ),
  })
  .openapi('ValidationError')

const ErrorSchema = z
  .object({
    error: z.string(),
    message: z.string(),
    meta: MetaSchema.optional(),
  })
  .openapi('Error')

// === Routes ===

const classifyRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Classification'],
  summary: 'Classify a product',
  description:
    'Classifies a single product into the Shopify taxonomy using embeddings and LLM.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ClassifyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Classification successful',
      content: {
        'application/json': {
          schema: ClassifyResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    500: {
      description: 'Classification failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

const batchClassifyRoute = createRoute({
  method: 'post',
  path: '/batch',
  tags: ['Classification'],
  summary: 'Classify multiple products',
  description: 'Classifies 1-10 products in a single request.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BatchClassifyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Batch classification completed',
      content: {
        'application/json': {
          schema: BatchClassifyResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ValidationErrorSchema,
        },
      },
    },
    500: {
      description: 'Batch classification failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

// === App ===

const app = new OpenAPIHono<{ Bindings: Env }>()

app.openapi(classifyRoute, async (c) => {
  const startTime = Date.now()

  try {
    const { product, config } = c.req.valid('json')

    // Set API keys for SDK clients
    if (typeof process !== 'undefined' && process.env) {
      process.env.ANTHROPIC_API_KEY = c.env.ANTHROPIC_API_KEY
      process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY
    }

    const result = await classify(product as ClassificationInput, config)
    const duration = Date.now() - startTime

    return c.json(
      {
        success: true,
        result: result as any,
        meta: {
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      200,
    )
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

app.openapi(batchClassifyRoute, async (c) => {
  const startTime = Date.now()

  try {
    const { products, config } = c.req.valid('json')

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

    return c.json(
      {
        success: true,
        results,
        meta: {
          count: products.length,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        },
      },
      200,
    )
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
