/**
 * Authentication and authorization middleware for the Bubble AI API.
 *
 * This middleware extracts identity from Cloudflare Access headers,
 * looks up the user's role, and provides route guards for authorization.
 */

import type { MiddlewareHandler } from 'hono'
import { DEFAULT_ROLE, type Role, SERVICE_ROLES, USER_ROLES } from './roles.js'

/**
 * Authentication context attached to each request.
 */
export interface AuthContext {
  /** User email or service token client ID */
  identity: string
  /** User's role for authorization checks */
  role: Role
  /** True if this is a service token (M2M) request */
  isService: boolean
}

/**
 * Hono Variables type for auth context.
 * Use this when creating an OpenAPIHono app that uses auth middleware.
 *
 * @example
 * ```typescript
 * const app = new OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }>()
 * ```
 */
export interface AuthVariables {
  auth: AuthContext
}

/**
 * Environment bindings that include optional mock email for development.
 */
interface AuthEnv {
  ENVIRONMENT?: string
  CF_ACCESS_MOCK_EMAIL?: string
}

/**
 * Decode email from Cloudflare Access JWT.
 *
 * The JWT is base64url encoded with 3 parts: header.payload.signature
 * We only need the payload which contains { email: string, ... }
 *
 * @param jwt - The CF-Access-JWT-Assertion header value
 * @returns The email from the JWT payload, or null if invalid
 */
export function decodeEmailFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null

    // Decode base64url payload
    const payload = parts[1]
    // Replace base64url chars with base64 chars
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Pad if necessary
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(padded)
    const data = JSON.parse(decoded)

    return typeof data.email === 'string' ? data.email : null
  } catch {
    return null
  }
}

/**
 * Main auth middleware - extracts identity and looks up role.
 *
 * Must run after Cloudflare Access has validated the request.
 * In production, CF Access blocks unauthenticated requests before
 * they reach this middleware.
 *
 * @returns Hono middleware function
 */
export function authMiddleware(): MiddlewareHandler<{
  Bindings: AuthEnv
  Variables: AuthVariables
}> {
  return async (c, next) => {
    const serviceClientId = c.req.header('CF-Access-Client-Id')
    const jwtAssertion = c.req.header('CF-Access-JWT-Assertion')

    let auth: AuthContext

    if (serviceClientId) {
      // Service token - look up role by client ID
      const role = SERVICE_ROLES[serviceClientId] ?? 'basic'
      auth = { identity: serviceClientId, role, isService: true }
    } else if (jwtAssertion) {
      // Human user - decode JWT to get email
      const email = decodeEmailFromJwt(jwtAssertion)
      if (!email) {
        return c.json({ error: 'Invalid JWT assertion' }, 401)
      }
      const role = USER_ROLES[email] ?? DEFAULT_ROLE
      auth = { identity: email, role, isService: false }
    } else {
      // No auth headers - in production CF Access blocks this
      // In development, allow with a dev role or mock email
      const isDev = c.env.ENVIRONMENT === 'development'
      const mockEmail = c.env.CF_ACCESS_MOCK_EMAIL

      if (isDev) {
        if (mockEmail) {
          // Use mock email for testing specific roles
          const role = USER_ROLES[mockEmail] ?? DEFAULT_ROLE
          auth = { identity: mockEmail, role, isService: false }
        } else {
          // Auto-privileged in dev mode for convenience
          auth = { identity: 'dev@local', role: 'privileged', isService: false }
        }
      } else {
        return c.json({ error: 'Unauthorized - missing auth headers' }, 401)
      }
    }

    // Attach to context for use in routes
    c.set('auth', auth)
    await next()
  }
}

/**
 * Route guard - checks if current user has one of the allowed roles.
 *
 * Usage: app.use('/classify/*', requireRole('admin', 'developer', 'service'))
 *
 * @param allowed - Roles that can access this route
 * @returns Hono middleware function
 */
export function requireRole(
  ...allowed: Role[]
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const auth = c.get('auth')

    if (!auth) {
      return c.json({ error: 'Auth context missing' }, 500)
    }

    if (!allowed.includes(auth.role)) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Role '${auth.role}' cannot access this resource`,
          required: allowed,
        },
        403,
      )
    }

    await next()
  }
}
