/**
 * Taxonomy routes for browsing and searching categories.
 */

import {
  getCategoriesByLevel,
  getCategoryByCode,
  getCategoryList,
  getCategoryPathFromCode,
  getLeafCategories,
  getTaxonomyVersion,
  searchCategories,
  validateCategoryCode,
} from '@bubble-ai/taxonomy'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../worker.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * GET /taxonomy - Get taxonomy metadata
 */
app.get('/', (c) => {
  const version = getTaxonomyVersion()
  const categories = getCategoryList()

  return c.json({
    version,
    totalCategories: categories.length,
  })
})

/**
 * GET /taxonomy/categories - List or search categories
 *
 * Query params:
 * - q: Search query (optional)
 * - level: Filter by level (optional)
 * - limit: Max results (default 50, max 500)
 * - leaves: If true, only return leaf categories (optional)
 */
app.get('/categories', (c) => {
  const query = c.req.query('q')
  const levelParam = c.req.query('level')
  const limitParam = c.req.query('limit')
  const leavesParam = c.req.query('leaves')

  const limit = Math.min(Number(limitParam) || 50, 500)

  // Search by query
  if (query) {
    const results = searchCategories(query, limit)
    return c.json({
      count: results.length,
      categories: results,
    })
  }

  // Filter by level
  if (levelParam !== undefined) {
    const level = Number(levelParam)
    if (Number.isNaN(level) || level < 0 || level > 7) {
      return c.json({ error: 'Level must be between 0 and 7' }, 400)
    }

    const categories = getCategoriesByLevel(level).slice(0, limit)
    return c.json({
      level,
      count: categories.length,
      categories: categories.map((cat) => ({
        code: cat.id.split('/').pop(),
        name: cat.name,
        fullName: cat.full_name,
        level: cat.level,
      })),
    })
  }

  // Return leaf categories
  if (leavesParam === 'true') {
    const leaves = getLeafCategories().slice(0, limit)
    return c.json({
      count: leaves.length,
      categories: leaves.map((cat) => ({
        code: cat.id.split('/').pop(),
        name: cat.name,
        fullName: cat.full_name,
        level: cat.level,
      })),
    })
  }

  // Default: return category list
  const categories = getCategoryList().slice(0, limit)
  return c.json({
    count: categories.length,
    categories: categories.map((path) => ({ path })),
  })
})

/**
 * GET /taxonomy/categories/:code - Get category details by code
 *
 * Query params:
 * - includeAttributes: Include full attribute details (default false)
 */
app.get('/categories/:code', (c) => {
  const code = c.req.param('code')
  const includeAttributes = c.req.query('includeAttributes') === 'true'

  // Validate code format
  if (!code || !validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(code, includeAttributes)

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json({
    code,
    id: category.id,
    name: category.name,
    fullName: category.full_name,
    level: category.level,
    parentId: category.parent_id,
    ancestors: category.ancestors,
    children: category.children,
    attributes: category.attributes,
  })
})

/**
 * GET /taxonomy/categories/:code/children - Get child categories
 */
app.get('/categories/:code/children', (c) => {
  const code = c.req.param('code')

  if (!code || !validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(code)

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  // Get full details for each child
  const children = category.children.map((child) => {
    const childCode = child.id.split('/').pop()
    const childCategory = childCode ? getCategoryByCode(childCode) : null
    return {
      code: childCode,
      id: child.id,
      name: child.name,
      level: childCategory?.level,
      hasChildren: (childCategory?.children.length ?? 0) > 0,
    }
  })

  return c.json({
    parentCode: code,
    count: children.length,
    children,
  })
})

/**
 * GET /taxonomy/categories/:code/path - Get category path
 */
app.get('/categories/:code/path', (c) => {
  const code = c.req.param('code')

  if (!code || !validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const path = getCategoryPathFromCode(code)

  if (!path) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json({
    code,
    path,
  })
})

/**
 * POST /taxonomy/validate - Validate category codes
 */
app.post('/validate', async (c) => {
  const body = await c.req.json()

  const schema = z.object({
    codes: z.array(z.string()).min(1).max(100),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      {
        error: 'Validation error',
        details: parsed.error.issues,
      },
      400,
    )
  }

  const results = parsed.data.codes.map((code) => ({
    code,
    valid: validateCategoryCode(code),
  }))

  return c.json({
    count: results.length,
    valid: results.filter((r) => r.valid).length,
    invalid: results.filter((r) => !r.valid).length,
    results,
  })
})

export default app
