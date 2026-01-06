/**
 * Cloudflare Worker entrypoint for the taxonomy classifier.
 *
 * @see https://linear.app/bubble-goods/issue/BG-825
 */

import {
  initSupabase,
  initTaxonomyFromData,
  type TaxonomyData,
} from '@bubble-ai/taxonomy'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'
// Import data files - will be bundled by Wrangler
// @ts-expect-error - Text imports configured in wrangler.toml rules
import categoriesText from '../../taxonomy/data/categories.txt'
// @ts-expect-error - JSON imports work in Wrangler but need explicit attribute for Node
import taxonomyJson from '../../taxonomy/data/taxonomy.json'
import { classify } from './classify.js'
import type { ClassificationInput } from './types.js'

// Flag to track if taxonomy is initialized
let taxonomyInitialized = false

/**
 * Environment bindings for the Worker.
 */
interface Env {
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ENVIRONMENT: string
}

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

// Create Hono app with typed env
const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'bubble-classifier',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
})

// Main classification endpoint
app.post('/classify', async (c) => {
  const startTime = Date.now()

  try {
    // Parse and validate request body
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

    // Initialize taxonomy from bundled data (only once)
    if (!taxonomyInitialized) {
      initTaxonomyFromData(
        categoriesText as string,
        taxonomyJson as unknown as TaxonomyData,
      )
      taxonomyInitialized = true
    }

    // Initialize Supabase client for this request
    initSupabase({
      url: c.env.SUPABASE_URL,
      anonKey: c.env.SUPABASE_ANON_KEY,
    })

    // Set API keys for SDK clients (they read from process.env in nodejs_compat mode)
    // Workers with nodejs_compat have process.env, but we need to populate it
    if (typeof process !== 'undefined' && process.env) {
      process.env.ANTHROPIC_API_KEY = c.env.ANTHROPIC_API_KEY
      process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY
    }

    // Run classification
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

// Batch classification endpoint (for migration)
app.post('/classify/batch', async (c) => {
  const startTime = Date.now()

  try {
    const body = await c.req.json()

    // Validate batch request
    const BatchRequestSchema = z.object({
      products: z.array(ClassificationInputSchema).min(1).max(10),
      config: ConfigSchema,
    })

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

    // Initialize taxonomy from bundled data (only once)
    if (!taxonomyInitialized) {
      initTaxonomyFromData(
        categoriesText as string,
        taxonomyJson as unknown as TaxonomyData,
      )
      taxonomyInitialized = true
    }

    // Initialize clients
    initSupabase({
      url: c.env.SUPABASE_URL,
      anonKey: c.env.SUPABASE_ANON_KEY,
    })

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

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      path: c.req.path,
    },
    404,
  )
})

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
  })

  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500,
  )
})

export default app
