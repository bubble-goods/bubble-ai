/**
 * Role definitions and user/service mappings for authorization.
 *
 * This module defines the authorization layer for the Bubble AI API.
 * Cloudflare Access handles authentication (who you are), while this
 * module handles authorization (what you can do).
 */

/**
 * Available roles in the system.
 *
 * - basic: Read-only access (GET endpoints: taxonomy, fields, docs, health)
 * - privileged: Full access to all endpoints (GET + POST /classify)
 */
export type Role = 'basic' | 'privileged'

/**
 * Human users: email → role mapping.
 *
 * Users not in this list receive the DEFAULT_ROLE.
 */
export const USER_ROLES: Record<string, Role> = {
  'wilfred@getintothebubble.com': 'privileged',
  'alan@getintothebubble.com': 'privileged',
  'greg@getintothebubble.com': 'privileged',
}

/**
 * Service tokens: CF-Access-Client-Id → role mapping.
 *
 * Service tokens are created in Cloudflare Access and used for
 * machine-to-machine authentication. By default, service tokens
 * get 'basic' access. Add specific client IDs here for 'privileged'.
 */
export const SERVICE_ROLES: Record<string, Role> = {
  // Add service tokens that need privileged access:
  // 'abc123-client-id': 'privileged',
}

/**
 * Default role for authenticated users/services not explicitly mapped.
 *
 * New users with @getintothebubble.com emails can access the API
 * via Google SSO, but only have basic (read-only) access until
 * explicitly granted privileged access.
 */
export const DEFAULT_ROLE: Role = 'basic'

/**
 * Role hierarchy for permission checks.
 *
 * Higher numbers indicate more permissions.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  privileged: 100,
  basic: 10,
}
