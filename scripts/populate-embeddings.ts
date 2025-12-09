#!/usr/bin/env npx tsx
/**
 * Populate Supabase with Shopify taxonomy embeddings.
 *
 * This script:
 * 1. Loads all ~11,764 Shopify product taxonomy categories
 * 2. Generates embeddings using OpenAI's text-embedding-3-small model
 * 3. Upserts the embeddings into Supabase
 *
 * Prerequisites:
 * 1. Run supabase/migrations/001_taxonomy_embeddings.sql in Supabase SQL Editor
 * 2. Set environment variables:
 *    - OPENAI_API_KEY
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_KEY (service role key for write access)
 *
 * Usage:
 *    npm run populate-embeddings
 *    npm run populate-embeddings -- --batch-size 50
 *    npm run populate-embeddings -- --dry-run
 *    npm run populate-embeddings -- --limit 100
 *
 * Related: BG-708, BG-733
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { loadTaxonomyFull } from '../src/taxonomy/loader.js'

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const DEFAULT_BATCH_SIZE = 100
const TABLE_NAME = 'embeddings'
const SCHEMA_NAME = 'taxonomy'

interface CategoryRecord {
  category_code: string
  category_name: string
  full_path: string
  level: number
  embedding?: number[]
}

function getEnvVar(name: string): string {
  // Try _DEV suffix first for local development
  const value = process.env[`${name}_DEV`] ?? process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}_DEV or ${name}`)
  }
  return value
}

function initOpenAI(): OpenAI {
  return new OpenAI({ apiKey: getEnvVar('OPENAI_API_KEY') })
}

function initSupabase(): SupabaseClient {
  const url = getEnvVar('SUPABASE_URL')
  const key = getEnvVar('SUPABASE_SERVICE_KEY')
  return createClient(url, key, {
    db: { schema: SCHEMA_NAME },
  })
}

function loadAllCategories(): CategoryRecord[] {
  console.log('Loading taxonomy data...')
  const taxonomy = loadTaxonomyFull()

  const categories: CategoryRecord[] = []
  for (const [code, data] of taxonomy) {
    categories.push({
      category_code: code,
      category_name: data.name,
      full_path: data.full_name,
      level: data.level,
    })
  }

  console.log(`Loaded ${categories.length} categories`)
  return categories
}

async function generateEmbeddingsBatch(
  client: OpenAI,
  texts: string[],
): Promise<number[][]> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  })

  // Sort by index to ensure correct order
  const sortedData = response.data.sort((a, b) => a.index - b.index)
  return sortedData.map((item) => item.embedding)
}

async function upsertEmbeddings(
  supabase: SupabaseClient,
  records: CategoryRecord[],
): Promise<number> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(records, { onConflict: 'category_code' })
    .select()

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`)
  }

  return data?.length ?? 0
}

function parseArgs(): {
  batchSize: number
  dryRun: boolean
  limit: number | null
} {
  const args = process.argv.slice(2)
  let batchSize = DEFAULT_BATCH_SIZE
  let dryRun = false
  let limit: number | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = Number.parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--dry-run') {
      dryRun = true
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10)
      i++
    }
  }

  return { batchSize, dryRun, limit }
}

async function main(): Promise<void> {
  const { batchSize, dryRun, limit } = parseArgs()

  console.log('='.repeat(60))
  console.log('Shopify Taxonomy Embeddings Population Script')
  console.log('='.repeat(60))
  console.log(`Embedding model: ${EMBEDDING_MODEL}`)
  console.log(`Target table: ${SCHEMA_NAME}.${TABLE_NAME}`)
  console.log(`Batch size: ${batchSize}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  // Initialize clients
  console.log('Initializing clients...')
  const openaiClient = initOpenAI()
  console.log('  OpenAI client initialized')

  let supabaseClient: SupabaseClient | null = null
  if (!dryRun) {
    supabaseClient = initSupabase()
    console.log('  Supabase client initialized')
  } else {
    console.log('  Supabase client skipped (dry run)')
  }

  // Load categories
  let categories = loadAllCategories()

  if (limit) {
    categories = categories.slice(0, limit)
    console.log(`Limited to ${categories.length} categories for testing`)
  }

  // Process in batches
  const totalCategories = categories.length
  const totalBatches = Math.ceil(totalCategories / batchSize)
  let processedCount = 0
  let upsertedCount = 0
  const startTime = Date.now()

  console.log()
  console.log(
    `Processing ${totalCategories} categories in ${totalBatches} batches...`,
  )
  console.log()

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batchStart = batchNum * batchSize
    const batchEnd = Math.min(batchStart + batchSize, totalCategories)
    const batch = categories.slice(batchStart, batchEnd)

    const batchStartTime = Date.now()

    // Generate embeddings for the batch
    const texts = batch.map((c) => c.full_path)
    const embeddings = await generateEmbeddingsBatch(openaiClient, texts)

    // Add embeddings to records
    const records = batch.map((c, i) => ({
      ...c,
      embedding: embeddings[i],
    }))

    // Upsert to Supabase
    if (supabaseClient) {
      const count = await upsertEmbeddings(supabaseClient, records)
      upsertedCount += count
    }

    processedCount += batch.length

    const batchTime = Date.now() - batchStartTime
    const progress = ((processedCount / totalCategories) * 100).toFixed(1)
    console.log(
      `Batch ${batchNum + 1}/${totalBatches}: ` +
        `${batch.length} categories, ` +
        `${batchTime}ms, ` +
        `${progress}% complete`,
    )
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log()
  console.log('='.repeat(60))
  console.log('Complete!')
  console.log('='.repeat(60))
  console.log(`Categories processed: ${processedCount}`)
  if (!dryRun) {
    console.log(`Records upserted: ${upsertedCount}`)
  }
  console.log(`Total time: ${totalTime}s`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
