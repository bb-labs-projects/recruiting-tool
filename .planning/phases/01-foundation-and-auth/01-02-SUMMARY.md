---
phase: 01-foundation-and-auth
plan: 02
subsystem: auth
tags: [auth, session, jwt, jose, magic-link, rate-limit, proxy, dal, defense-in-depth]
depends_on:
  - "01-01: schema.ts (users, magicLinkTokens, sessions), db client"
provides:
  - "Session encrypt/decrypt with jose HS256 and HTTP-only cookie management"
  - "Magic link token generation (crypto.randomBytes) and SHA-256 hashing"
  - "Database-backed rate limiting for magic link requests"
  - "Centralized auth constants (expiry, rate limits, cookie config)"
  - "Data Access Layer with cache-wrapped verifySession and getUser"
  - "Proxy-based route protection with role-based redirects (Next.js 16 convention)"
affects:
  - "01-03: Auth API routes will call session, magic-link, rate-limit, and DAL modules"
  - "01-04: Auth pages will be protected by proxy and use DAL for server-side verification"
  - "All future server components/actions use DAL for authentication"
tech_stack:
  added: []
  patterns:
    - "Defense-in-depth: proxy (optimistic cookie) -> DAL (database verification) -> component-level"
    - "jose SignJWT/jwtVerify with HS256 for session tokens"
    - "cache() from React for request-scoped deduplication of DB calls"
    - "server-only import to prevent client bundle inclusion"
    - "Next.js 16 proxy.ts convention (replaces deprecated middleware.ts)"
    - "Database-backed rate limiting (not in-memory) for serverless compatibility"
key_files:
  created:
    - "src/lib/auth/constants.ts"
    - "src/lib/auth/session.ts"
    - "src/lib/auth/magic-link.ts"
    - "src/lib/auth/rate-limit.ts"
    - "src/lib/dal.ts"
    - "src/proxy.ts"
  modified: []
decisions:
  - id: "01-02-D1"
    decision: "Used Next.js 16 proxy.ts (not middleware.ts)"
    reason: "Next.js 16.1.6 has PROXY_FILENAME constant and middleware.ts is deprecated with warning. proxy.ts runs on Node.js runtime (not Edge)."
  - id: "01-02-D2"
    decision: "Proxy redirects role-mismatched users to their own dashboard (not /login)"
    reason: "Better UX -- an authenticated employer hitting /admin gets redirected to /employer, not kicked to login"
metrics:
  duration: "~3 minutes"
  completed: "2026-02-19"
---

# Phase 1 Plan 2: Auth Infrastructure Layer Summary

Jose HS256 session management with HTTP-only cookies, crypto.randomBytes(32) magic link tokens with SHA-256 hashing, database-backed rate limiting, cache-wrapped DAL for server-side session verification, and Next.js 16 proxy.ts for optimistic route protection with role-based redirects.

## What Was Done

### Task 1: Create auth library modules (session, magic-link, rate-limit, constants)
- Created `src/lib/auth/constants.ts`: centralized AUTH_CONSTANTS object with magic link expiry (10min), rate limit (5/hour), session expiry (7 days), cookie name, token byte length
- Created `src/lib/auth/session.ts`: encrypt/decrypt using jose SignJWT/jwtVerify with HS256, createSession sets HTTP-only secure cookie, deleteSession removes it
- Created `src/lib/auth/magic-link.ts`: generateToken produces 64-char hex token via crypto.randomBytes(32) and its SHA-256 hash; hashToken for verification
- Created `src/lib/auth/rate-limit.ts`: checkRateLimit queries magicLinkTokens table counting tokens per userId within last hour, returns allowed/remaining
- All three non-constants files have `import 'server-only'` to prevent client bundle inclusion
- **Commit:** `9464543`

### Task 2: Create Data Access Layer and proxy route protection
- Created `src/lib/dal.ts`: verifySession reads cookie, decrypts, queries sessions table for valid non-expired session; getUser calls verifySession then queries users table. Both wrapped in React cache() for request deduplication
- Created `src/proxy.ts`: Next.js 16 proxy convention with named `proxy` export. Reads and decrypts cookie only (no DB calls). Routes unauthenticated users to /login, redirects authenticated users on public routes to role dashboard, blocks non-admin from /admin, enforces role-based route access
- Proxy exports config with matcher excluding api, _next/static, _next/image, favicon.ico
- **Commit:** `71b4a08`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` zero type errors | PASS |
| proxy.ts has NO database imports | PASS |
| dal.ts has `import 'server-only'` | PASS |
| session.ts, magic-link.ts, rate-limit.ts have `import 'server-only'` | PASS |
| All auth constants centralized in constants.ts | PASS |
| Rate limiting uses database query (not in-memory) | PASS |
| proxy.ts exports named `proxy` function | PASS |
| proxy.ts exports config with matcher | PASS |
| dal.ts exports verifySession and getUser | PASS |
| Both DAL functions wrapped in cache() | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Next.js 16 proxy.ts confirmed** -- Verified via Next.js 16.1.6 source code that PROXY_FILENAME='proxy' is supported, middleware.ts is deprecated, and proxy runs on Node.js runtime. The named `proxy` export is validated at build time.
2. **Role-mismatched redirects go to user's dashboard** -- An authenticated employer hitting /admin gets redirected to /employer (not /login), which is better UX than forcing re-authentication.

## Next Phase Readiness

### What's ready for Plan 01-03 (Auth API Routes):
- Session encrypt/decrypt/create/delete available for login/logout endpoints
- Magic link token generation and hashing ready for request/verify endpoints
- Rate limiting ready to gate magic link requests
- DAL ready for protected API routes and server actions
- Proxy handles first-line route protection

### Still required from user (same as Plan 01-01 output):
- Neon PostgreSQL configured with DATABASE_URL
- Schema applied via `npx drizzle-kit push`
- SESSION_SECRET generated and set
- Resend API key and email configured
