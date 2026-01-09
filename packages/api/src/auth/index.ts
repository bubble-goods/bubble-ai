/**
 * Authentication and authorization module for the Bubble AI API.
 *
 * @example
 * ```typescript
 * import { authMiddleware, requireRole, type AuthContext, type Role } from './auth'
 *
 * // Apply auth middleware globally
 * app.use('*', authMiddleware())
 *
 * // Protect specific routes
 * app.use('/classify/*', requireRole('admin', 'developer', 'service'))
 *
 * // Access auth context in handlers
 * app.get('/whoami', (c) => {
 *   const auth = c.get('auth') as AuthContext
 *   return c.json({ identity: auth.identity, role: auth.role })
 * })
 * ```
 */

export type { AuthContext, AuthVariables } from './middleware.js'
export {
  authMiddleware,
  decodeEmailFromJwt,
  requireRole,
} from './middleware.js'
export type { Role } from './roles.js'
export {
  DEFAULT_ROLE,
  ROLE_HIERARCHY,
  SERVICE_ROLES,
  USER_ROLES,
} from './roles.js'

/**
 * OpenAPI security configuration for a route.
 *
 * Use this to define required roles in one place and generate
 * both the security field and description suffix.
 *
 * The `x-required-roles` extension is included for future tooling support.
 * Scalar doesn't currently display per-endpoint auth requirements, but
 * when they do, the data will already be in the OpenAPI spec:
 * - https://github.com/scalar/scalar/issues/5062 (show auth on endpoints)
 * - https://github.com/scalar/scalar/discussions/3825 (custom extensions)
 *
 * @example
 * ```typescript
 * const security = routeSecurity('admin', 'developer')
 *
 * const myRoute = createRoute({
 *   method: 'get',
 *   path: '/protected',
 *   description: `Does something cool. ${security.description}`,
 *   security: security.security,
 *   ...security.extension,
 *   // ...
 * })
 * ```
 */
export function routeSecurity<R extends string>(...roles: R[]) {
  return {
    /** OpenAPI security requirement */
    security: [{ cloudflareAccess: roles }],
    /** Human-readable description suffix */
    description: `\n\n**Roles:** ${roles.join(', ')}`,
    /** x-required-roles extension for future tooling */
    extension: { 'x-required-roles': roles } as Record<string, R[]>,
  }
}
