/**
 * Cloudflare Worker entrypoint for the Bubble AI API.
 *
 * Provides REST endpoints for:
 * - Product classification (/classify)
 * - Taxonomy browsing (/taxonomy)
 * - Category attributes (/fields)
 *
 * @see https://linear.app/bubble-goods/issue/BG-873
 */

import {
  initSupabase,
  initTaxonomyFromData,
  type TaxonomyData,
} from '@bubble-ai/taxonomy'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// Import data files - will be bundled by Wrangler
// @ts-expect-error - Text imports configured in wrangler.toml rules
import categoriesText from '../../taxonomy/data/categories.txt'
// @ts-expect-error - JSON imports work in Wrangler but need explicit attribute for Node
import taxonomyJson from '../../taxonomy/data/taxonomy.json'

// Import route handlers
import classifyRoutes from './routes/classify.js'
import fieldsRoutes from './routes/fields.js'
import taxonomyRoutes from './routes/taxonomy.js'

// Flag to track if taxonomy is initialized
let taxonomyInitialized = false

/**
 * Environment bindings for the Worker.
 */
export interface Env {
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ENVIRONMENT: string
}

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

// Initialize taxonomy and Supabase on every request (middleware)
app.use('*', async (c, next) => {
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

  await next()
})

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'bubble-api',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
})

// Mount routes
app.route('/classify', classifyRoutes)
app.route('/taxonomy', taxonomyRoutes)
app.route('/fields', fieldsRoutes)

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
