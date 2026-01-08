/**
 * Node.js server entry point for local development.
 *
 * This runs the Hono app directly on Node.js instead of Cloudflare Workers.
 * Useful for faster iteration and debugging without wrangler.
 *
 * Usage: npm run dev
 */

import { serve } from '@hono/node-server'
import 'dotenv/config'

// Load taxonomy data
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  initSupabase,
  initTaxonomyFromData,
  type TaxonomyData,
} from '@bubble-ai/taxonomy'

const __dirname = dirname(fileURLToPath(import.meta.url))
const taxonomyPath = resolve(__dirname, '../../taxonomy/data')

const categoriesText = readFileSync(
  resolve(taxonomyPath, 'categories.txt'),
  'utf-8',
)
const taxonomyJson = JSON.parse(
  readFileSync(resolve(taxonomyPath, 'taxonomy.json'), 'utf-8'),
) as TaxonomyData

// Initialize taxonomy
initTaxonomyFromData(categoriesText, taxonomyJson)

// Initialize Supabase
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  initSupabase({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  })
}

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
// Import routes
import classifyRoutes from './routes/classify.js'
import fieldsRoutes from './routes/fields.js'
import taxonomyRoutes from './routes/taxonomy.js'

// Create app
const app = new OpenAPIHono()

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

// Health check route
const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check',
  description: 'Returns the health status of the API.',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            service: z.string().openapi({ example: 'bubble-api' }),
            environment: z.string().openapi({ example: 'development' }),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
  },
})

app.openapi(healthRoute, (c) => {
  return c.json(
    {
      status: 'ok',
      service: 'bubble-api',
      environment: process.env.ENVIRONMENT || 'development',
      timestamp: new Date().toISOString(),
    },
    200,
  )
})

// Mount routes
app.route('/classify', classifyRoutes)
app.route('/taxonomy', taxonomyRoutes)
app.route('/fields', fieldsRoutes)

// OpenAPI spec endpoint
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Bubble AI API',
    version: '1.0.0',
    description:
      'REST API for Bubble AI services including product classification, taxonomy browsing, and category attributes.',
  },
  servers: [{ url: 'http://localhost:8787', description: 'Local development' }],
})

// Scalar API documentation UI
app.get(
  '/docs',
  apiReference({
    spec: {
      url: '/openapi.json',
    },
    theme: 'kepler',
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'js',
      clientKey: 'fetch',
    },
  }),
)

// Redirect root to docs
app.get('/', (c) => c.redirect('/docs'))

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404)
})

// Start server
const port = Number(process.env.PORT) || 8787

console.log(`Starting server on http://localhost:${port}`)
console.log(`API docs available at http://localhost:${port}/docs`)

serve({
  fetch: app.fetch,
  port,
})
