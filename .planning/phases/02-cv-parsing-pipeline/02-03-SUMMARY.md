---
phase: 02-cv-parsing-pipeline
plan: 03
subsystem: api-routes
tags: [api-routes, vercel-blob, admin-auth, batch-processing, next-server-after]
depends_on:
  - "02-01"
  - "02-02"
provides:
  - "Shared requireAdmin() helper for API route auth verification"
  - "Vercel Blob client upload handler with handleUpload()"
  - "Single CV parse trigger endpoint calling parseSingleCv()"
  - "Batch CV parse endpoint with background processing via after()"
  - "CV upload status polling endpoints (list all + single by ID)"
affects:
  - "02-04: Admin UI calls these API routes for upload, parse, batch, and status polling"
tech_stack:
  added: []
  patterns:
    - "requireAdmin() throws catchable errors (not redirect) for API route auth"
    - "handleUpload() for Vercel Blob client upload protocol"
    - "after() from next/server for fire-and-forget background processing"
    - "maxDuration export for Vercel Function timeout configuration"
key_files:
  created:
    - "src/lib/auth/require-admin.ts"
    - "src/app/api/admin/cv/upload/route.ts"
    - "src/app/api/admin/cv/status/route.ts"
    - "src/app/api/admin/cv/parse/[id]/route.ts"
    - "src/app/api/admin/cv/parse/route.ts"
    - "src/app/api/admin/cv/batch/route.ts"
  modified: []
decisions: []
metrics:
  duration: "~2 minutes"
  completed: "2026-02-20"
---

# Phase 2 Plan 3: Upload Handler and API Routes Summary

Shared admin auth helper for API routes plus five route handlers: Vercel Blob client upload with PUT fallback, single parse trigger, batch parse with after() background processing, and status polling endpoints.

## What Was Done

### Task 1: Create shared admin auth helper, upload route, and status endpoints
- Created `src/lib/auth/require-admin.ts` with `requireAdmin()` helper
  - Validates session cookie, checks DB session not expired, verifies user role is 'admin'
  - Throws catchable 'Unauthorized'/'Forbidden' errors (unlike DAL's redirect-based verifySession)
- Created `src/app/api/admin/cv/upload/route.ts` with POST and PUT handlers
  - POST uses `handleUpload()` from `@vercel/blob/client` for client upload protocol
  - `onBeforeGenerateToken` verifies admin auth, allows only PDFs up to 10MB
  - `onUploadCompleted` creates cvUpload DB record (production only)
  - PUT handler creates cvUpload record explicitly (works in local dev + production)
- Created `src/app/api/admin/cv/status/route.ts` with GET handler
  - Returns all CV uploads ordered by createdAt desc
  - Selects id, filename, status, errorMessage, profileId, createdAt, parsedAt
- Created `src/app/api/admin/cv/parse/[id]/route.ts` with GET handler
  - Returns single CV upload by ID with 404 handling
- **Commit:** `04f813e`

### Task 2: Create parse trigger and batch parse routes
- Created `src/app/api/admin/cv/parse/route.ts` with POST handler
  - Triggers single CV parse via `parseSingleCv(cvUploadId)`
  - Validates cvUploadId is provided (returns 400 if missing)
  - `maxDuration = 60` for Claude API call time
- Created `src/app/api/admin/cv/batch/route.ts` with POST handler
  - Accepts `{ cvUploadIds: string[] }`, validates non-empty, max 50 per batch
  - Returns 202 Accepted immediately with count
  - Uses `after()` from `next/server` for background sequential processing
  - 500ms delay between API calls for rate limiting
  - `maxDuration = 300` for batch processing window
- **Commit:** `6f31b75`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` compiles without errors | PASS |
| All 6 files exist (1 auth helper + 5 route handlers) | PASS |
| Every route uses requireAdmin() for auth | PASS |
| Upload route uses handleUpload() from @vercel/blob/client | PASS |
| Parse route imports and calls parseSingleCv | PASS |
| Batch route uses after() from next/server | PASS |
| maxDuration exported: parse (60) and batch (300) | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 02-04:
- All API routes are available for the admin UI to call
- Upload route at `/api/admin/cv/upload` handles Vercel Blob client protocol
- Parse route at `/api/admin/cv/parse` triggers single CV parsing
- Batch route at `/api/admin/cv/batch` triggers bulk parsing
- Status route at `/api/admin/cv/status` provides polling endpoint
- Single status at `/api/admin/cv/parse/[id]` provides per-CV status checks
