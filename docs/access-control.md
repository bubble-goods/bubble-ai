# Access Control

The Bubble AI API uses a two-layer security model:

1. **Authentication** (Cloudflare Access): Verifies identity - "Who are you?"
2. **Authorization** (Local role lookup): Verifies permissions - "What can you do?"

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Access                            │
│   - Google SSO for @getintothebubble.com users                      │
│   - Service tokens for machine-to-machine auth                      │
│   - Blocks unauthenticated requests before reaching the API         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Auth Middleware                                │
│   - Extracts identity from CF Access headers                        │
│   - Looks up role from local config (roles.ts)                      │
│   - Attaches auth context to request                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Role Guards                                    │
│   - requireRole() middleware on protected routes                    │
│   - Returns 403 if role doesn't match                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Route Handlers                                 │
│   - Access auth context via c.get('auth')                           │
│   - Execute business logic                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Roles

| Role | Description | Typical Use Case |
|------|-------------|------------------|
| `basic` | Read-only access (GET endpoints) | Default for all authenticated users/services |
| `privileged` | Full access to all endpoints | Team members, trusted integrations |

## Route Access Matrix

| Endpoint | basic | privileged |
|----------|:-----:|:----------:|
| `GET /docs` | ✓ | ✓ |
| `GET /health` | ✓ | ✓ |
| `GET /taxonomy/*` | ✓ | ✓ |
| `GET /fields/*` | ✓ | ✓ |
| `POST /classify` | ✗ | ✓ |
| `POST /classify/batch` | ✗ | ✓ |

## Design Decisions

### Why Local Scope Lookup (Not JWT-Embedded)

| Aspect | JWT-Embedded | Local Lookup ✓ |
|--------|--------------|----------------|
| With CF Access | Complex - needs custom claims | Natural fit |
| Scope updates | Requires re-login | Immediate (redeploy) |
| Revocation | Hard | Easy - remove from config |

### Why Config File (Not Database)

- Role-based = few mappings (not user-level)
- Version controlled = git audit trail
- No latency = no DB lookup per request

## Managing Access

### Adding a Privileged User

Edit `packages/api/src/auth/roles.ts`:

```typescript
export const USER_ROLES: Record<string, Role> = {
  'wilfred@getintothebubble.com': 'privileged',
  'newuser@getintothebubble.com': 'privileged',  // Add here
}
```

Users not in this list get `basic` access by default.

### Adding a Service Token

1. Create a service token in Cloudflare Access dashboard
2. By default, service tokens get `basic` access. For `privileged` access, add the Client ID to `roles.ts`:

```typescript
export const SERVICE_ROLES: Record<string, Role> = {
  'abc123-client-id': 'privileged',  // Add here for full access
}
```

3. Use the token in requests:

```bash
curl -X POST https://bubble-api.bubble-goods.workers.dev/classify \
  -H "CF-Access-Client-Id: abc123-client-id" \
  -H "CF-Access-Client-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"product": {"title": "Test Product"}}'
```

### Changing the Default Role

Edit `DEFAULT_ROLE` in `roles.ts`. Currently set to `basic` so new authenticated users/services have read-only access until explicitly granted `privileged` access.

## Local Development

In development mode (`ENVIRONMENT=development`), the auth middleware behaves differently:

### Auto-Privileged Mode (Default)

When no CF Access headers are present, developers automatically get privileged access:

```typescript
auth = { identity: 'dev@local', role: 'privileged', isService: false }
```

### Mock Email Mode

To test as a specific user, set `CF_ACCESS_MOCK_EMAIL` in `.dev.vars`:

```
CF_ACCESS_MOCK_EMAIL=someone@getintothebubble.com
```

This simulates being logged in as that user, inheriting their role from `USER_ROLES` (or `basic` if not listed).

## OpenAPI Security

The API's OpenAPI spec includes the security scheme, visible in the Scalar documentation UI:

- Each endpoint shows required roles
- The security scheme describes available roles
- "Try it" requests work with valid CF Access credentials

## Error Responses

### 401 Unauthorized

Returned when:
- JWT assertion is invalid/malformed
- No auth headers in production mode

```json
{
  "error": "Unauthorized - missing auth headers"
}
```

### 403 Forbidden

Returned when authenticated but lacking required role:

```json
{
  "error": "Forbidden",
  "message": "Role 'basic' cannot access this resource",
  "required": ["privileged"]
}
```

## Related Files

| File | Purpose |
|------|---------|
| `packages/api/src/auth/roles.ts` | Role definitions and user mappings |
| `packages/api/src/auth/middleware.ts` | Auth middleware and role guards |
| `packages/api/src/auth/index.ts` | Public API exports |
| `packages/api/src/worker.ts` | Middleware registration |

## Related Issues

- [BG-874](https://linear.app/bubble-goods/issue/BG-874) - Cloudflare Access authentication
- [BG-879](https://linear.app/bubble-goods/issue/BG-879) - Role-based authorization (this feature)
