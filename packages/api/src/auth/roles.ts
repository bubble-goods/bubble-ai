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
 * - admin: Full access to all endpoints
 * - developer: Build/test access (read + classify)
 * - readonly: View-only access (taxonomy, docs)
 * - service: Machine-to-machine access (classify endpoints only)
 */
export type Role = 'admin' | 'developer' | 'readonly' | 'service'

/**
 * Human users: email → role mapping.
 *
 * Users not in this list receive the DEFAULT_ROLE.
 */
export const USER_ROLES: Record<string, Role> = {
  'wilfred@getintothebubble.com': 'admin',
  // Add more users as needed:
  // 'developer@getintothebubble.com': 'developer',
}

/**
 * Service tokens: CF-Access-Client-Id → role mapping.
 *
 * Service tokens are created in Cloudflare Access and used for
 * machine-to-machine authentication.
 */
export const SERVICE_ROLES: Record<string, Role> = {
  // Add service tokens as they are created:
  // 'abc123-client-id': 'service',
}

/**
 * Default role for authenticated users not in USER_ROLES.
 *
 * New users with @getintothebubble.com emails can access the API
 * via Google SSO, but only have readonly access until explicitly
 * granted a higher role.
 */
export const DEFAULT_ROLE: Role = 'readonly'

/**
 * Role hierarchy for permission checks.
 *
 * Higher numbers indicate more permissions.
 * Note: service role is special - it can classify but not browse.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  developer: 50,
  service: 25, // Can classify but not browse
  readonly: 10,
}
