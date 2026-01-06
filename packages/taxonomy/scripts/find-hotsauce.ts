#!/usr/bin/env npx tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '../classifier/.dev.vars' })

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
  { db: { schema: 'taxonomy' } }
)

async function main() {
  const { data } = await supabase
    .from('embeddings')
    .select('category_code, category_name, full_path')
    .or('category_name.ilike.%hot sauce%,category_name.ilike.%gravy%')
    .order('category_code')

  console.log('Hot Sauce and Gravy categories:')
  data?.forEach(r => console.log(`  ${r.category_code}: ${r.category_name}`))
}

main()
