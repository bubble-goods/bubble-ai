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
