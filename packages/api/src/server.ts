/**
 * Node.js server entry point for local development.
 *
 * This runs the Hono app directly on Node.js instead of Cloudflare Workers.
 * Useful for faster iteration and debugging without wrangler.
 *
 * Usage: npm run dev:node
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

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
// Import routes
import classifyRoutes from './routes/classify.js'
import fieldsRoutes from './routes/fields.js'
import taxonomyRoutes from './routes/taxonomy.js'

// Create app
const app = new Hono()

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
    service: 'bubble-api',
    environment: process.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  })
})

// Mount routes
app.route('/classify', classifyRoutes)
app.route('/taxonomy', taxonomyRoutes)
app.route('/fields', fieldsRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404)
})

// Start server
const port = Number(process.env.PORT) || 8787

console.log(`Starting server on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
