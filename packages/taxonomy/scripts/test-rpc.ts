#!/usr/bin/env npx tsx
/**
 * Test script to debug the match_categories RPC function.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Load from classifier's .dev.vars
config({ path: '../classifier/.dev.vars' })

async function main() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_ANON_KEY!

  console.log('Supabase URL:', url)

  // Test 1: Using public schema to verify connection
  const publicClient = createClient(url, key)

  // Test 2: Using taxonomy schema
  const taxonomyClient = createClient(url, key, {
    db: { schema: 'taxonomy' }
  })

  // Check embeddings table
  console.log('\n--- Test 1: Count embeddings ---')
  const { count, error: countError } = await taxonomyClient
    .from('embeddings')
    .select('*', { count: 'exact', head: true })

  console.log('Count:', count, 'Error:', countError?.message ?? 'none')

  // Get a sample embedding from the table
  console.log('\n--- Test 2: Get sample embedding ---')
  const { data: sample, error: sampleError } = await taxonomyClient
    .from('embeddings')
    .select('category_code, category_name, embedding')
    .limit(1)
    .single()

  if (sampleError) {
    console.log('Sample error:', sampleError.message)
    return
  }

  console.log('Sample category:', sample.category_code, '-', sample.category_name)
  console.log('Embedding type:', typeof sample.embedding)
  console.log('Embedding length:', Array.isArray(sample.embedding) ? sample.embedding.length : 'not array')

  // Test RPC with the same embedding (should match itself with similarity ~1.0)
  console.log('\n--- Test 3: RPC with sample embedding ---')
  const { data: rpcData, error: rpcError } = await taxonomyClient.rpc('match_categories', {
    query_embedding: sample.embedding,
    match_threshold: 0.5,
    match_count: 5,
    filter_level: null,
  })

  console.log('RPC error:', rpcError?.message ?? 'none')
  console.log('RPC results:', rpcData?.length ?? 0)
  if (rpcData && rpcData.length > 0) {
    console.log('First result:', rpcData[0])
  }

  // Test 4: Generate a fresh embedding and search
  console.log('\n--- Test 4: Fresh embedding search ---')
  const openai = new OpenAI()
  const searchText = 'Norwegian crispbread flatbread crackers for cheese'

  const embResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: searchText,
    dimensions: 1536,
  })

  const freshEmbedding = embResponse.data[0].embedding
  console.log('Fresh embedding length:', freshEmbedding.length)

  const { data: freshRpc, error: freshError } = await taxonomyClient.rpc('match_categories', {
    query_embedding: freshEmbedding,
    match_threshold: 0.3, // Lower threshold for testing
    match_count: 10,
    filter_level: null,
  })

  console.log('Fresh RPC error:', freshError?.message ?? 'none')
  console.log('Fresh RPC results:', freshRpc?.length ?? 0)
  if (freshRpc && freshRpc.length > 0) {
    console.log('Top 3 results:')
    freshRpc.slice(0, 3).forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.category_code} - ${r.full_path} (${r.similarity.toFixed(3)})`)
    })
  }

  // Test 5: Try calling RPC with schema prefix explicitly
  console.log('\n--- Test 5: RPC via public client with schema prefix ---')
  const { data: prefixRpc, error: prefixError } = await publicClient.schema('taxonomy').rpc('match_categories', {
    query_embedding: freshEmbedding,
    match_threshold: 0.3,
    match_count: 5,
    filter_level: null,
  })

  console.log('Prefixed RPC error:', prefixError?.message ?? 'none')
  console.log('Prefixed RPC results:', prefixRpc?.length ?? 0)
}

main().catch(console.error)
