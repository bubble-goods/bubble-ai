#!/usr/bin/env npx tsx
/**
 * Test embedding search specifically for food categories
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

config({ path: '../classifier/.dev.vars' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { db: { schema: 'taxonomy' } }
)

const openai = new OpenAI()

async function main() {
  const searchText = 'Norwegian crispbread flatbread crackers for cheese'

  console.log(`Searching for: "${searchText}"\n`)

  // Generate embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: searchText,
    dimensions: 1536,
  })
  const embedding = response.data[0].embedding

  // Try different thresholds
  for (const threshold of [0.5, 0.4, 0.3, 0.2]) {
    console.log(`\n--- Threshold: ${threshold} ---`)

    const { data, error } = await supabase.rpc('match_categories', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: 20,
      filter_level: null,
    })

    if (error) {
      console.log(`Error: ${error.message}`)
      continue
    }

    // Filter to food only
    const foodResults = (data || []).filter((r: any) => r.category_code.startsWith('fb-'))
    const otherResults = (data || []).filter((r: any) => !r.category_code.startsWith('fb-'))

    console.log(`Total results: ${data?.length || 0}`)
    console.log(`Food (fb-) results: ${foodResults.length}`)

    if (foodResults.length > 0) {
      console.log('\nTop food matches:')
      foodResults.slice(0, 5).forEach((r: any) => {
        console.log(`  ${r.similarity.toFixed(3)} | ${r.category_code} | ${r.full_path}`)
      })
    }

    if (otherResults.length > 0) {
      console.log('\nTop non-food matches:')
      otherResults.slice(0, 3).forEach((r: any) => {
        console.log(`  ${r.similarity.toFixed(3)} | ${r.category_code} | ${r.full_path}`)
      })
    }
  }
}

main().catch(console.error)
