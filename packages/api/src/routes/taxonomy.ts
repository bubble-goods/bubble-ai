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
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { routeSecurity } from '../auth/index.js'
import type { Env } from '../worker.js'

// Security config for taxonomy endpoints (basic and privileged)
const taxonomySecurity = routeSecurity('basic', 'privileged')

// === Schemas ===

const CategoryRefSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const AttributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  description: z.string(),
  extended: z.boolean(),
  values: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        handle: z.string(),
      }),
    )
    .optional(),
})

const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi('TaxonomyError')

// === Routes ===

const getTaxonomyRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Taxonomy'],
  summary: 'Get taxonomy metadata',
  description: `Returns taxonomy version and total category count. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  responses: {
    200: {
      description: 'Taxonomy metadata',
      content: {
        'application/json': {
          schema: z.object({
            version: z.string().openapi({ example: '2024-10' }),
            totalCategories: z.number().int().openapi({ example: 11764 }),
          }),
        },
      },
    },
  },
})

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['Taxonomy'],
  summary: 'List or search categories',
  description: `List categories with optional search, level filtering, or leaf-only filtering. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  request: {
    query: z.object({
      q: z
        .string()
        .optional()
        .openapi({ description: 'Search query', example: 'juice' }),
      level: z.coerce
        .number()
        .int()
        .min(0)
        .max(7)
        .optional()
        .openapi({ description: 'Filter by hierarchy level (0-7)' }),
      leaves: z
        .enum(['true', 'false'])
        .optional()
        .openapi({ description: 'If true, only return leaf categories' }),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(500)
        .default(50)
        .openapi({ description: 'Max results (default 50, max 500)' }),
    }),
  },
  responses: {
    200: {
      description: 'List of categories',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number().int(),
            level: z.number().int().optional(),
            categories: z.array(
              z.object({
                code: z.string().optional(),
                name: z.string().optional(),
                fullName: z.string().optional(),
                path: z.string().optional(),
                gid: z.string().optional(),
                level: z.number().int().optional(),
              }),
            ),
          }),
        },
      },
    },
    400: {
      description: 'Invalid parameters',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

const getCategoryRoute = createRoute({
  method: 'get',
  path: '/categories/{code}',
  tags: ['Taxonomy'],
  summary: 'Get category details',
  description: `Get full details for a category by its code. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  request: {
    params: z.object({
      code: z
        .string()
        .openapi({ description: 'Category code', example: 'fb-1-7-1' }),
    }),
    query: z.object({
      includeAttributes: z
        .enum(['true', 'false'])
        .optional()
        .openapi({ description: 'Include full attribute details' }),
    }),
  },
  responses: {
    200: {
      description: 'Category details',
      content: {
        'application/json': {
          schema: z.object({
            code: z.string(),
            id: z.string(),
            name: z.string(),
            fullName: z.string(),
            level: z.number().int(),
            parentId: z.string().nullable(),
            ancestors: z.array(CategoryRefSchema),
            children: z.array(CategoryRefSchema),
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

const getCategoryChildrenRoute = createRoute({
  method: 'get',
  path: '/categories/{code}/children',
  tags: ['Taxonomy'],
  summary: 'Get child categories',
  description: `Get all direct children of a category. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  request: {
    params: z.object({
      code: z
        .string()
        .openapi({ description: 'Parent category code', example: 'fb-1-7' }),
    }),
  },
  responses: {
    200: {
      description: 'Child categories',
      content: {
        'application/json': {
          schema: z.object({
            parentCode: z.string(),
            count: z.number().int(),
            children: z.array(
              z.object({
                code: z.string().optional(),
                id: z.string(),
                name: z.string(),
                level: z.number().int().optional(),
                hasChildren: z.boolean(),
              }),
            ),
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

const getCategoryPathRoute = createRoute({
  method: 'get',
  path: '/categories/{code}/path',
  tags: ['Taxonomy'],
  summary: 'Get category path',
  description: `Get the full path string for a category. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  request: {
    params: z.object({
      code: z
        .string()
        .openapi({ description: 'Category code', example: 'fb-1-7-1' }),
    }),
  },
  responses: {
    200: {
      description: 'Category path',
      content: {
        'application/json': {
          schema: z.object({
            code: z.string(),
            path: z.string().openapi({
              example:
                'Food, Beverages & Tobacco > Beverages > Juice > Fruit Juice',
            }),
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

const validateCodesRoute = createRoute({
  method: 'post',
  path: '/validate',
  tags: ['Taxonomy'],
  summary: 'Validate category codes',
  description: `Validate one or more category codes. ${taxonomySecurity.description}`,
  security: taxonomySecurity.security,
  ...taxonomySecurity.extension,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            codes: z
              .array(z.string())
              .min(1)
              .max(100)
              .openapi({ example: ['fb-1-7-1', 'invalid-code'] }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Validation results',
      content: {
        'application/json': {
          schema: z.object({
            count: z.number().int(),
            valid: z.number().int(),
            invalid: z.number().int(),
            results: z.array(
              z.object({
                code: z.string(),
                valid: z.boolean(),
              }),
            ),
          }),
        },
      },
    },
    400: {
      description: 'Invalid request',
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

app.openapi(getTaxonomyRoute, (c) => {
  const version = getTaxonomyVersion()
  const categories = getCategoryList()

  return c.json(
    {
      version,
      totalCategories: categories.length,
    },
    200,
  )
})

app.openapi(listCategoriesRoute, (c) => {
  const { q: query, level, leaves, limit } = c.req.valid('query')

  // Search by query
  if (query) {
    const results = searchCategories(query, limit)
    return c.json(
      {
        count: results.length,
        categories: results,
      },
      200,
    )
  }

  // Filter by level
  if (level !== undefined) {
    const categories = getCategoriesByLevel(level).slice(0, limit)
    return c.json(
      {
        level,
        count: categories.length,
        categories: categories.map((cat) => ({
          code: cat.id.split('/').pop(),
          name: cat.name,
          fullName: cat.full_name,
          level: cat.level,
        })),
      },
      200,
    )
  }

  // Return leaf categories
  if (leaves === 'true') {
    const leafCats = getLeafCategories().slice(0, limit)
    return c.json(
      {
        count: leafCats.length,
        categories: leafCats.map((cat) => ({
          code: cat.id.split('/').pop(),
          name: cat.name,
          fullName: cat.full_name,
          level: cat.level,
        })),
      },
      200,
    )
  }

  // Default: return category list
  const categories = getCategoryList().slice(0, limit)
  return c.json(
    {
      count: categories.length,
      categories: categories.map((path) => ({ path })),
    },
    200,
  )
})

app.openapi(getCategoryRoute, (c) => {
  const { code } = c.req.valid('param')
  const { includeAttributes } = c.req.valid('query')

  if (!validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(code, includeAttributes === 'true')

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json(
    {
      code,
      id: category.id,
      name: category.name,
      fullName: category.full_name,
      level: category.level,
      parentId: category.parent_id,
      ancestors: category.ancestors,
      children: category.children,
      attributes: category.attributes,
    },
    200,
  )
})

app.openapi(getCategoryChildrenRoute, (c) => {
  const { code } = c.req.valid('param')

  if (!validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const category = getCategoryByCode(code)

  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

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

  return c.json(
    {
      parentCode: code,
      count: children.length,
      children,
    },
    200,
  )
})

app.openapi(getCategoryPathRoute, (c) => {
  const { code } = c.req.valid('param')

  if (!validateCategoryCode(code)) {
    return c.json({ error: 'Invalid category code' }, 404)
  }

  const path = getCategoryPathFromCode(code)

  if (!path) {
    return c.json({ error: 'Category not found' }, 404)
  }

  return c.json({ code, path }, 200)
})

app.openapi(validateCodesRoute, (c) => {
  const { codes } = c.req.valid('json')

  const results = codes.map((code) => ({
    code,
    valid: validateCategoryCode(code),
  }))

  return c.json(
    {
      count: results.length,
      valid: results.filter((r) => r.valid).length,
      invalid: results.filter((r) => !r.valid).length,
      results,
    },
    200,
  )
})

export default app
