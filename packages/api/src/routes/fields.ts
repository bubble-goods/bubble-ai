/**
 * Fields/attributes routes for getting category attributes.
 */

import {
  getAttributeByHandle,
  getCategoryByCode,
  validateCategoryCode,
} from '@bubble-ai/taxonomy'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { routeSecurity } from '../auth/index.js'
import type { Env } from '../worker.js'

// Security config for fields endpoints (basic and privileged)
const fieldsSecurity = routeSecurity('basic', 'privileged')

// === Schemas ===

const AttributeValueSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
})

const AttributeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    description: z.string(),
    extended: z.boolean(),
    values: z.array(AttributeValueSchema).optional(),
  })
  .openapi('Attribute')

const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi('FieldsError')

// === Routes ===

const getCategoryAttributesRoute = createRoute({
  method: 'get',
  path: '/{categoryCode}',
  tags: ['Fields'],
  summary: 'Get category attributes',
  description: `Get all attributes applicable to a category. Note: attributes are category-specific and not inherited from parent categories. ${fieldsSecurity.description}`,
  security: fieldsSecurity.security,
  ...fieldsSecurity.extension,
  request: {
    params: z.object({
      categoryCode: z
        .string()
        .openapi({ description: 'Category code', example: 'fb-1-7-1' }),
    }),
  },
  responses: {
    200: {
      description: 'Category attributes',
      content: {
        'application/json': {
          schema: z.object({
            categoryCode: z.string(),
            categoryName: z.string(),
            categoryFullName: z.string(),
            count: z.number().int(),
            attributes: z.array(AttributeSchema),
          }),
        },
      },
    },
    404: {
      description: 'Category not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

const getAttributeRoute = createRoute({
  method: 'get',
  path: '/attribute/{handle}',
  tags: ['Fields'],
  summary: 'Get attribute details',
  description: `Get details for a specific attribute by handle. ${fieldsSecurity.description}`,
  security: fieldsSecurity.security,
  ...fieldsSecurity.extension,
  request: {
    params: z.object({
      handle: z
        .string()
        .openapi({ description: 'Attribute handle', example: 'flavor' }),
    }),
  },
  responses: {
    200: {
      description: 'Attribute details',
      content: {
        'application/json': {
          schema: AttributeSchema,
        },
      },
    },
    404: {
      description: 'Attribute not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

// === App ===

const app = new OpenAPIHono<{ Bindings: Env }>()

app.openapi(getCategoryAttributesRoute, (c) => {
  const { categoryCode } = c.req.valid('param')

  if (!validateCategoryCode(categoryCode)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(categoryCode, true)

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json(
    {
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
    },
    200,
  )
})

app.openapi(getAttributeRoute, (c) => {
  const { handle } = c.req.valid('param')

  const attribute = getAttributeByHandle(handle)

  if (!attribute) {
    return c.json({ error: 'Attribute not found' }, 404)
  }

  return c.json(
    {
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
    },
    200,
  )
})

export default app
