#!/usr/bin/env npx tsx
/**
 * Calibration script for the taxonomy classifier.
 *
 * Runs the classifier against sample products and outputs results for review.
 *
 * Usage:
 *   npx tsx scripts/calibrate.ts                    # Run with sample data
 *   npx tsx scripts/calibrate.ts --input data.json  # Run with custom input
 *   npx tsx scripts/calibrate.ts --offline          # Skip LLM (embedding only)
 *
 * Output:
 *   - Console: Summary stats
 *   - File: calibration-results-{timestamp}.json
 */

import { config } from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  initTaxonomyFromData,
  initSupabase,
  type TaxonomyData,
} from '@bubble-ai/taxonomy'
import { classify, classifyOffline } from '../src/classify.js'
import type { ClassificationInput, ClassificationOutput, ProductTypeMapping } from '../src/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: join(__dirname, '../.dev.vars') })

// Path to taxonomy data
const TAXONOMY_DATA_DIR = join(__dirname, '../../taxonomy/data')

// Initialize API clients globally
function initializeClients() {
  // Set API keys for SDKs that read from env
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY
}

/**
 * Sample products for calibration testing.
 * These represent common product types in the Bubble catalog.
 */
const SAMPLE_PRODUCTS: ClassificationInput[] = [
  {
    title: "Organic Norwegian Crispbread with Seeds",
    description: "Traditional Scandinavian flatbread made with whole grains and seeds. Perfect for cheese and spreads.",
    productType: "Crackers",
    tags: ["organic", "norwegian", "crispbread", "seeds", "whole-grain"],
  },
  {
    title: "Dark Chocolate Sea Salt Bar 72%",
    description: "Rich dark chocolate with a hint of sea salt. Single origin cacao from Ecuador.",
    productType: "Chocolate",
    tags: ["dark-chocolate", "sea-salt", "single-origin", "ecuador", "72-percent"],
  },
  {
    title: "Artisan Hot Honey",
    description: "Raw honey infused with chili peppers. Great on pizza, fried chicken, and cheese boards.",
    productType: "Honey",
    tags: ["honey", "hot-honey", "spicy", "raw", "artisan"],
  },
  {
    title: "Cold Brew Coffee Concentrate",
    description: "Smooth, low-acid cold brew made from specialty beans. Just add water or milk.",
    productType: "Coffee",
    tags: ["cold-brew", "coffee", "concentrate", "low-acid", "specialty"],
  },
  {
    title: "Variety Pack - Craft Granola Sampler",
    description: "Try all 4 of our bestselling granola flavors! Includes Maple Pecan, Chocolate Cherry, Vanilla Almond, and Honey Oat.",
    productType: "Granola",
    tags: ["variety-pack", "granola", "sampler", "gift"],
    variants: [
      { title: "Maple Pecan", options: { flavor: "Maple Pecan" } },
      { title: "Chocolate Cherry", options: { flavor: "Chocolate Cherry" } },
      { title: "Vanilla Almond", options: { flavor: "Vanilla Almond" } },
      { title: "Honey Oat", options: { flavor: "Honey Oat" } },
    ],
  },
  {
    title: "Organic Matcha Green Tea Powder",
    description: "Ceremonial grade matcha from Uji, Japan. Stone-ground for smooth, vibrant flavor.",
    productType: "Tea",
    tags: ["matcha", "green-tea", "organic", "japanese", "ceremonial-grade"],
  },
  {
    title: "Spicy Mango Habanero Hot Sauce",
    description: "Sweet mango meets fiery habanero in this Caribbean-inspired hot sauce.",
    productType: "Hot Sauce",
    tags: ["hot-sauce", "mango", "habanero", "spicy", "caribbean"],
  },
  {
    title: "Truffle Infused Extra Virgin Olive Oil",
    description: "Premium Italian EVOO infused with black truffle. Perfect finishing oil for pasta and risotto.",
    productType: "Olive Oil",
    tags: ["truffle", "olive-oil", "italian", "evoo", "finishing-oil"],
  },
  {
    title: "Rosemary Marcona Almonds",
    description: "Spanish Marcona almonds roasted with rosemary and sea salt. A gourmet snacking experience.",
    productType: "Nuts",
    tags: ["almonds", "marcona", "rosemary", "spanish", "roasted"],
  },
  {
    title: "Gift Box - Cheese Lover's Pantry",
    description: "The perfect gift for cheese enthusiasts! Includes artisan crackers, fig spread, honey, and gourmet nuts.",
    productType: "Gift Box",
    tags: ["gift-box", "cheese", "gift", "curated", "pantry"],
  },
  {
    title: "Organic Dried Mango Slices",
    description: "Unsweetened dried mango from Thailand. No added sugar, just pure fruit.",
    productType: "Dried Fruit",
    tags: ["dried-fruit", "mango", "organic", "no-sugar-added", "thai"],
  },
  {
    title: "Artisan Pasta - Bronze Cut Rigatoni",
    description: "Traditional Italian pasta made with durum wheat semolina and bronze die cut for perfect sauce adhesion.",
    productType: "Pasta",
    tags: ["pasta", "rigatoni", "italian", "bronze-cut", "artisan"],
  },
  {
    title: "Small Batch Strawberry Jam",
    description: "Made with hand-picked Oregon strawberries and just a touch of sugar. Tastes like summer.",
    productType: "Jam",
    tags: ["jam", "strawberry", "small-batch", "oregon", "fruit-spread"],
  },
  {
    title: "Creamy Cashew Butter",
    description: "Single-ingredient cashew butter made from roasted cashews. No salt, no sugar, just cashews.",
    productType: "Nut Butter",
    tags: ["nut-butter", "cashew", "single-ingredient", "roasted", "no-salt"],
  },
  {
    title: "Smoked Paprika from Spain",
    description: "La Vera smoked paprika (Pimentón de la Vera). Sweet variety with deep, smoky flavor.",
    productType: "Spices",
    tags: ["paprika", "smoked", "spanish", "la-vera", "spices"],
  },
]

interface CalibrationResult {
  input: ClassificationInput
  output: ClassificationOutput | null
  error: string | null
  durationMs: number
}

interface CalibrationSummary {
  timestamp: string
  mode: 'full' | 'offline'
  totalProducts: number
  successful: number
  failed: number
  needsReview: number
  avgConfidence: number
  avgDurationMs: number
  bundlesDetected: number
  results: CalibrationResult[]
}

async function loadMappings(): Promise<ProductTypeMapping[]> {
  const mappingsPath = join(__dirname, '../data/producttype-mappings.json')
  const raw = readFileSync(mappingsPath, 'utf-8')
  const data = JSON.parse(raw)
  return data.mappings
}

async function runCalibration(
  products: ClassificationInput[],
  mappings: ProductTypeMapping[],
  offline: boolean,
): Promise<CalibrationSummary> {
  const results: CalibrationResult[] = []
  const classifyFn = offline ? classifyOffline : classify

  console.log(`\nRunning calibration on ${products.length} products (${offline ? 'offline' : 'full'} mode)...\n`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const start = Date.now()

    console.log(`[${i + 1}/${products.length}] ${product.title}`)

    try {
      const output = await classifyFn(product, mappings)
      const duration = Date.now() - start

      console.log(`  → ${output.category.path}`)
      console.log(`  → Confidence: ${(output.category.confidence * 100).toFixed(1)}%${output.needsReview ? ' (needs review)' : ''}`)
      if (output.signals.isBundle) {
        console.log(`  → Bundle detected`)
      }

      results.push({
        input: product,
        output,
        error: null,
        durationMs: duration,
      })
    } catch (err) {
      const duration = Date.now() - start
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ Error: ${errorMsg}`)

      results.push({
        input: product,
        output: null,
        error: errorMsg,
        durationMs: duration,
      })
    }

    console.log('')
  }

  // Calculate summary stats
  const successful = results.filter((r) => r.output !== null)
  const avgConfidence = successful.length > 0
    ? successful.reduce((sum, r) => sum + (r.output?.category.confidence ?? 0), 0) / successful.length
    : 0
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length

  return {
    timestamp: new Date().toISOString(),
    mode: offline ? 'offline' : 'full',
    totalProducts: products.length,
    successful: successful.length,
    failed: results.filter((r) => r.error !== null).length,
    needsReview: successful.filter((r) => r.output?.needsReview).length,
    avgConfidence,
    avgDurationMs: avgDuration,
    bundlesDetected: successful.filter((r) => r.output?.signals.isBundle).length,
    results,
  }
}

function printSummary(summary: CalibrationSummary) {
  console.log('\n' + '='.repeat(60))
  console.log('CALIBRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Mode:            ${summary.mode}`)
  console.log(`Total Products:  ${summary.totalProducts}`)
  console.log(`Successful:      ${summary.successful}`)
  console.log(`Failed:          ${summary.failed}`)
  console.log(`Needs Review:    ${summary.needsReview} (${((summary.needsReview / summary.successful) * 100).toFixed(1)}%)`)
  console.log(`Bundles:         ${summary.bundlesDetected}`)
  console.log(`Avg Confidence:  ${(summary.avgConfidence * 100).toFixed(1)}%`)
  console.log(`Avg Duration:    ${summary.avgDurationMs.toFixed(0)}ms`)
  console.log('='.repeat(60))
}

function saveResults(summary: CalibrationSummary) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `calibration-results-${timestamp}.json`
  const outputPath = join(__dirname, '..', filename)

  writeFileSync(outputPath, JSON.stringify(summary, null, 2))
  console.log(`\nResults saved to: ${filename}`)
}

async function main() {
  const args = process.argv.slice(2)
  const offline = args.includes('--offline')
  const inputFileIndex = args.indexOf('--input')
  const inputFile = inputFileIndex >= 0 ? args[inputFileIndex + 1] : null

  // Initialize
  initializeClients()

  // Load taxonomy data from files
  const categoriesText = readFileSync(join(TAXONOMY_DATA_DIR, 'categories.txt'), 'utf-8')
  const taxonomyJson: TaxonomyData = JSON.parse(
    readFileSync(join(TAXONOMY_DATA_DIR, 'taxonomy.json'), 'utf-8')
  )
  initTaxonomyFromData(categoriesText, taxonomyJson)
  console.log('Taxonomy initialized')

  initSupabase({
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  })
  console.log('Supabase initialized')

  // Load products
  let products: ClassificationInput[]
  if (inputFile && existsSync(inputFile)) {
    console.log(`Loading products from: ${inputFile}`)
    const raw = readFileSync(inputFile, 'utf-8')
    products = JSON.parse(raw)
  } else {
    console.log('Using sample products')
    products = SAMPLE_PRODUCTS
  }

  // Load mappings
  const mappings = await loadMappings()
  console.log(`Loaded ${mappings.length} ProductType mappings`)

  // Run calibration
  const summary = await runCalibration(products, mappings, offline)

  // Print and save results
  printSummary(summary)
  saveResults(summary)
}

main().catch((err) => {
  console.error('Calibration failed:', err)
  process.exit(1)
})
