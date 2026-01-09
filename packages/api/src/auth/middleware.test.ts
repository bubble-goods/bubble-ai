import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import type { AuthContext, AuthVariables } from './middleware.js'
import {
  authMiddleware,
  decodeEmailFromJwt,
  requireRole,
} from './middleware.js'

interface TestEnv {
  ENVIRONMENT: string
  CF_ACCESS_MOCK_EMAIL?: string
}

type TestApp = OpenAPIHono<{ Bindings: TestEnv; Variables: AuthVariables }>

/**
 * Create a base64url-encoded JWT payload for testing.
 */
function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const signature = 'mock-signature'

  return `${header}.${body}.${signature}`
}

describe('decodeEmailFromJwt', () => {
  it('decodes valid base64url JWT payload', () => {
    const jwt = createMockJwt({ email: 'test@example.com', sub: '123' })
    expect(decodeEmailFromJwt(jwt)).toBe('test@example.com')
  })

  it('returns null for malformed JWT (wrong number of parts)', () => {
    expect(decodeEmailFromJwt('only-one-part')).toBeNull()
    expect(decodeEmailFromJwt('two.parts')).toBeNull()
    expect(decodeEmailFromJwt('one.two.three.four')).toBeNull()
  })

  it('returns null for invalid base64', () => {
    expect(decodeEmailFromJwt('a.!!!invalid!!!.c')).toBeNull()
  })

  it('returns null for missing email claim', () => {
    const jwt = createMockJwt({ sub: '123', name: 'Test User' })
    expect(decodeEmailFromJwt(jwt)).toBeNull()
  })

  it('returns null for non-string email claim', () => {
    const jwt = createMockJwt({ email: 123 })
    expect(decodeEmailFromJwt(jwt)).toBeNull()
  })

  it('handles padding correctly for various payload lengths', () => {
    // Short email (needs padding)
    const jwt1 = createMockJwt({ email: 'a@b.co' })
    expect(decodeEmailFromJwt(jwt1)).toBe('a@b.co')

    // Longer email
    const jwt2 = createMockJwt({ email: 'very.long.email.address@example.com' })
    expect(decodeEmailFromJwt(jwt2)).toBe('very.long.email.address@example.com')
  })
})

describe('authMiddleware', () => {
  function createTestApp(
    env: TestEnv = { ENVIRONMENT: 'development' },
  ): TestApp {
    const app: TestApp = new OpenAPIHono<{
      Bindings: TestEnv
      Variables: AuthVariables
    }>()

    app.use('*', async (c, next) => {
      // Inject env
      c.env = env
      await next()
    })

    app.use('*', authMiddleware())

    app.get('/test', (c) => {
      const auth = c.get('auth')
      return c.json(auth)
    })

    return app
  }

  it('extracts email from valid JWT assertion', async () => {
    const app = createTestApp()
    const jwt = createMockJwt({ email: 'user@example.com' })

    const res = await app.request('/test', {
      headers: { 'CF-Access-JWT-Assertion': jwt },
    })

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.identity).toBe('user@example.com')
    expect(auth.isService).toBe(false)
  })

  it('returns 401 for invalid JWT', async () => {
    const app = createTestApp({ ENVIRONMENT: 'production' })

    const res = await app.request('/test', {
      headers: { 'CF-Access-JWT-Assertion': 'invalid.jwt.here' },
    })

    expect(res.status).toBe(401)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('Invalid JWT assertion')
  })

  it('looks up role from USER_ROLES for known email', async () => {
    const app = createTestApp()
    // wilfred@getintothebubble.com is defined as admin in roles.ts
    const jwt = createMockJwt({ email: 'wilfred@getintothebubble.com' })

    const res = await app.request('/test', {
      headers: { 'CF-Access-JWT-Assertion': jwt },
    })

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.role).toBe('admin')
  })

  it('falls back to DEFAULT_ROLE for unknown email', async () => {
    const app = createTestApp()
    const jwt = createMockJwt({ email: 'unknown@example.com' })

    const res = await app.request('/test', {
      headers: { 'CF-Access-JWT-Assertion': jwt },
    })

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.role).toBe('readonly') // DEFAULT_ROLE
  })

  it('handles service token via CF-Access-Client-Id', async () => {
    const app = createTestApp()

    const res = await app.request('/test', {
      headers: { 'CF-Access-Client-Id': 'test-service-client-id' },
    })

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.identity).toBe('test-service-client-id')
    expect(auth.role).toBe('service')
    expect(auth.isService).toBe(true)
  })

  it('allows admin in development mode without headers', async () => {
    const app = createTestApp({ ENVIRONMENT: 'development' })

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.identity).toBe('dev@local')
    expect(auth.role).toBe('admin')
  })

  it('uses mock email in development mode when CF_ACCESS_MOCK_EMAIL is set', async () => {
    const app = createTestApp({
      ENVIRONMENT: 'development',
      CF_ACCESS_MOCK_EMAIL: 'mock@example.com',
    })

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.identity).toBe('mock@example.com')
    expect(auth.role).toBe('readonly') // Not in USER_ROLES
  })

  it('returns 401 in production mode without auth headers', async () => {
    const app = createTestApp({ ENVIRONMENT: 'production' })

    const res = await app.request('/test')

    expect(res.status).toBe(401)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('Unauthorized - missing auth headers')
  })

  it('prefers service token over JWT when both present', async () => {
    const app = createTestApp()
    const jwt = createMockJwt({ email: 'user@example.com' })

    const res = await app.request('/test', {
      headers: {
        'CF-Access-Client-Id': 'service-id',
        'CF-Access-JWT-Assertion': jwt,
      },
    })

    expect(res.status).toBe(200)
    const auth = (await res.json()) as AuthContext
    expect(auth.identity).toBe('service-id')
    expect(auth.isService).toBe(true)
  })
})

describe('requireRole', () => {
  function createTestApp(authContext: AuthContext | null) {
    const app = new OpenAPIHono<{ Variables: AuthVariables }>()

    // Mock auth context
    app.use('*', async (c, next) => {
      if (authContext) {
        c.set('auth', authContext)
      }
      await next()
    })

    app.use('/protected/*', requireRole('admin', 'developer'))

    app.get('/protected/resource', (c) => {
      return c.json({ success: true })
    })

    return app
  }

  it('allows matching role', async () => {
    const app = createTestApp({
      identity: 'admin@example.com',
      role: 'admin',
      isService: false,
    })

    const res = await app.request('/protected/resource')

    expect(res.status).toBe(200)
    const data = (await res.json()) as { success: boolean }
    expect(data.success).toBe(true)
  })

  it('allows any of the specified roles', async () => {
    const app = createTestApp({
      identity: 'dev@example.com',
      role: 'developer',
      isService: false,
    })

    const res = await app.request('/protected/resource')

    expect(res.status).toBe(200)
  })

  it('returns 403 for non-matching role', async () => {
    const app = createTestApp({
      identity: 'reader@example.com',
      role: 'readonly',
      isService: false,
    })

    const res = await app.request('/protected/resource')

    expect(res.status).toBe(403)
    const data = (await res.json()) as {
      error: string
      message: string
      required: string[]
    }
    expect(data.error).toBe('Forbidden')
    expect(data.message).toContain(
      "Role 'readonly' cannot access this resource",
    )
    expect(data.required).toEqual(['admin', 'developer'])
  })

  it('returns 500 when auth context is missing', async () => {
    const app = createTestApp(null)

    const res = await app.request('/protected/resource')

    expect(res.status).toBe(500)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('Auth context missing')
  })
})
