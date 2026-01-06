#!/usr/bin/env npx tsx
/**
 * Check embeddings table by category prefix
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '../classifier/.dev.vars' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { db: { schema: 'taxonomy' } }
)

async function main() {
  // Count by prefix
  const prefixes = ['fb-', 'hg-', 'el-', 'sg-', 'aa-', 've-', 'ba-', 'he-', 'me-']

  console.log('Embeddings by category prefix:\n')

  for (const prefix of prefixes) {
    const { count, error } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .like('category_code', `${prefix}%`)

    if (count && count > 0) {
      console.log(`  ${prefix}* : ${count} categories`)
    }
  }

  // Get sample fb- categories
  console.log('\nSample fb- (food) categories:')
  const { data } = await supabase
    .from('embeddings')
    .select('category_code, category_name')
    .like('category_code', 'fb-%')
    .limit(10)

  if (data && data.length > 0) {
    data.forEach(r => console.log(`  ${r.category_code}: ${r.category_name}`))
  } else {
    console.log('  None found!')
  }
}

main().catch(console.error)
