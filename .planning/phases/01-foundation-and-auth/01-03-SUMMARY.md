---
phase: 01-foundation-and-auth
plan: 03
subsystem: auth
tags: [auth, api-routes, server-action, magic-link, email, resend, security-logging, zod, rate-limiting]
depends_on:
  - "01-02: session.ts (encrypt, decrypt, createSession, deleteSession), magic-link.ts (generateToken, hashToken), rate-limit.ts (checkRateLimit), constants.ts (AUTH_CONSTANTS), dal.ts (verifySession, getUser), schema.ts (users, magicLinkTokens, sessions), db client"
provides:
  - "POST /api/auth/magic-link/request -- validates email, delegates to shared helper, returns 429 on rate limit"
  - "POST /api/auth/magic-link/verify -- validates token hash, creates session, sets cookie, returns redirect"
  - "POST /api/auth/logout -- destroys DB session and clears cookie"
  - "GET /api/auth/me -- returns current user JSON or 401 (no redirect)"
  - "requestMagicLink server action -- useActionState-compatible form handler"
  - "sendMagicLinkEmail -- branded HTML email via Resend"
  - "logSecurityEvent + buildSecurityContext -- structured JSON security audit logging"
  - "handleMagicLinkRequest -- shared helper for magic link flow (DRY between API route and server action)"
affects:
  - "01-04/01-05: Login page uses requestMagicLink server action, verify page calls verify API"
  - "All future protected pages rely on session created by verify endpoint"
  - "Security logs enable Vercel Log filtering via _type: security_event"
tech_stack:
  added:
    - "resend (transactional email delivery)"
  patterns:
    - "Shared helper pattern: handleMagicLinkRequest used by both API route and server action"
    - "Anti-enumeration: magic link request always returns success (except rate limit)"
    - "Auto-create candidate on first magic link request"
    - "POST-only verify endpoint to prevent email client prefetch token consumption"
    - "Structured JSON security logging with _type field for log aggregation"
    - "Token marked as used before session creation to prevent race conditions"
    - "Zod v4 input validation on all API routes"
key_files:
  created:
    - "src/lib/auth/security-log.ts"
    - "src/lib/auth/request-magic-link.ts"
    - "src/lib/email/magic-link-email.tsx"
    - "src/app/api/auth/magic-link/request/route.ts"
    - "src/app/api/auth/magic-link/verify/route.ts"
    - "src/app/api/auth/logout/route.ts"
    - "src/app/api/auth/me/route.ts"
    - "src/actions/auth.ts"
  modified: []
decisions:
  - id: "01-03-D1"
    decision: "Inline HTML for email template instead of React email components"
    reason: "Simpler and more reliable across email clients. @react-email/components available in package.json but unnecessary complexity for a single template."
  - id: "01-03-D2"
    decision: "Server action uses 'server-action' as IP/userAgent placeholder"
    reason: "Server actions in Next.js don't expose request headers directly. The security event is still logged for audit purposes; just without client IP. Acceptable since server actions are same-origin only."
metrics:
  duration: "~5 minutes"
  completed: "2026-02-19"
---

# Phase 1 Plan 3: Auth API Routes and Server Action Summary

Four API route handlers (request, verify, logout, me), a useActionState-compatible server action, branded magic link email via Resend, structured JSON security logging, and a shared handleMagicLinkRequest helper that keeps business logic DRY between the API route and server action.

## What Was Done

### Task 1: Create security logger, shared helper, and email template
- Created `src/lib/auth/security-log.ts`: SecurityEvent type matching spec Section 7, logSecurityEvent outputs JSON with `_type: 'security_event'` for log aggregation, buildSecurityContext extracts IP (x-forwarded-for/x-real-ip) and user-agent from request headers
- Created `src/lib/auth/request-magic-link.ts`: handleMagicLinkRequest encapsulates full flow -- normalize email, find/create user (auto-create as candidate), check rate limit, generate token, store hash, send email, log event. Silently returns success for inactive users (no enumeration). Has `import 'server-only'`
- Created `src/lib/email/magic-link-email.tsx`: sendMagicLinkEmail sends branded HTML email via Resend with sign-in button linking to `${APP_URL}/auth/verify?token=${token}`, 10-minute expiry notice, security notes
- **Note:** Task 1 files were committed by a parallel plan execution (01-04, commit `b65fd92`) that included these files. No separate commit was created since the files were already identical.

### Task 2: Create auth API routes and server action
- Created `src/app/api/auth/magic-link/request/route.ts`: POST handler with Zod email validation, buildSecurityContext, delegates to handleMagicLinkRequest, returns 429 for rate limits, always returns success message otherwise (anti-enumeration)
- Created `src/app/api/auth/magic-link/verify/route.ts`: POST handler with Zod token validation, hashes token, finds unused token in DB, checks expiration, marks used BEFORE creating session (race condition prevention), updates user emailVerified and lastLoginAt, creates session record, calls createSession for cookie, logs magic_link_verified and session_created events, returns role-based redirect
- Created `src/app/api/auth/logout/route.ts`: POST handler reads/decrypts session cookie, deletes session from DB, clears cookie via deleteSession, logs logout event. Always returns success (even on error, still clears cookie)
- Created `src/app/api/auth/me/route.ts`: GET handler reads/decrypts session cookie, verifies session in DB, fetches user data, returns JSON user or 401 (no redirect -- unlike DAL which redirects)
- Created `src/actions/auth.ts`: 'use server' directive, requestMagicLink(prevState, formData) signature for useActionState compatibility, Zod email validation, delegates to handleMagicLinkRequest with 'server-action' IP/UA placeholder
- **Commit:** `8839454`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` zero type errors | PASS |
| Four API routes at correct paths under src/app/api/auth/ | PASS |
| Server action has 'use server' and useActionState-compatible signature | PASS |
| Email template constructs correct magic link URL (APP_URL + /auth/verify?token=...) | PASS |
| Request flow: validate -> handleMagicLinkRequest -> find/create user -> rate limit -> token -> hash -> email -> log -> success | PASS |
| Verify flow: hash token -> find in DB -> check expiry -> mark used -> create session -> set cookie -> log -> redirect | PASS |
| No raw tokens stored in database (only SHA-256 hashes) | PASS |
| Security events logged for all 6 event types in spec | PASS |
| Server action and API route share logic via handleMagicLinkRequest | PASS |
| Request route uses buildSecurityContext for IP/UA | PASS |
| Verify route marks token used BEFORE session creation | PASS |
| Me route returns JSON 401 (no redirect) | PASS |

## Deviations from Plan

### Parallel Execution Overlap
**Task 1 files committed by parallel plan (01-04)**
- **Found during:** Task 1 staging
- **Issue:** Plan 01-04 (running in parallel) committed the Task 1 files (security-log.ts, request-magic-link.ts, magic-link-email.tsx) in commit `b65fd92` alongside its own layout files
- **Impact:** No separate Task 1 commit was created since the files were already identical in HEAD
- **Resolution:** Verified committed versions match plan specification exactly. Proceeded with Task 2 as the building blocks were already in place.

## Decisions Made

1. **Inline HTML for email template** -- Used inline HTML rather than React email components (@react-email/components is in package.json). Inline HTML is simpler, has better email client compatibility, and avoids unnecessary abstraction for a single template.

2. **Server action uses placeholder IP/userAgent** -- Server actions in Next.js do not have access to request headers. Used 'server-action' as the IP and user agent values in security logs. The event is still recorded for audit purposes; if client IP is needed later, headers() from next/headers can be explored.

## Next Phase Readiness

### What's ready for Plan 01-04/01-05 (UI pages):
- requestMagicLink server action ready for login form with useActionState
- Verify API endpoint ready for /auth/verify page to call via POST
- Logout API endpoint ready for sign-out button
- /api/auth/me ready for client-side auth checks
- All security events are logged for monitoring

### Still required from user:
- Neon PostgreSQL configured with DATABASE_URL
- Schema applied via `npx drizzle-kit push`
- SESSION_SECRET generated and set
- Resend API key (RESEND_API_KEY) and sender email (EMAIL_FROM) configured
