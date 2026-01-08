/**
 * Fields/attributes routes for getting category attributes.
 */

import {
  getAttributeByHandle,
  getCategoryByCode,
  validateCategoryCode,
} from '@bubble-ai/taxonomy'
import { Hono } from 'hono'
import type { Env } from '../worker.js'

const app = new Hono<{ Bindings: Env }>()

/**
 * GET /fields/:categoryCode - Get attributes for a category
 *
 * Returns all attributes applicable to the given category,
 * including inherited attributes from parent categories.
 */
app.get('/:categoryCode', (c) => {
  const categoryCode = c.req.param('categoryCode')

  if (!categoryCode || !validateCategoryCode(categoryCode)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(categoryCode, true)

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json({
    categoryCode,
    categoryName: category.name,
    categoryFullName: category.full_name,
    count: category.attributes.length,
    attributes: category.attributes.map((attr) => ({
      id: attr.id,
      name: attr.name,
      handle: attr.handle,
      description: attr.description,
      extended: attr.extended,
      values: attr.values?.map((v) => ({
        id: v.id,
        name: v.name,
        handle: v.handle,
      })),
    })),
  })
})

/**
 * GET /fields/attribute/:handle - Get attribute details by handle
 */
app.get('/attribute/:handle', (c) => {
  const handle = c.req.param('handle')

  if (!handle) {
    return c.json({ error: 'Attribute handle is required' }, 400)
  }

  const attribute = getAttributeByHandle(handle)

  if (!attribute) {
    return c.json({ error: 'Attribute not found' }, 404)
  }

  return c.json({
    id: attribute.id,
    name: attribute.name,
    handle: attribute.handle,
    description: attribute.description,
    extended: attribute.extended,
    values: attribute.values?.map((v) => ({
      id: v.id,
      name: v.name,
      handle: v.handle,
    })),
  })
})

export default app
