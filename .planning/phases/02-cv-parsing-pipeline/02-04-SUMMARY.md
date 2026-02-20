---
phase: 02-cv-parsing-pipeline
plan: 04
subsystem: admin-ui
tags: [react, client-component, drag-drop, vercel-blob, polling, batch-processing]
depends_on:
  - "02-02"
  - "02-03"
provides:
  - "Admin CV upload page with drag-and-drop multi-file PDF upload"
  - "Batch parse trigger with progress tracking"
  - "Real-time status polling for parsing progress"
  - "Retry functionality for failed CV parses"
  - "Admin navigation link for CV Upload"
affects:
  - "Future phases: admin can now upload and parse CVs end-to-end"
tech_stack:
  added: []
  patterns:
    - "Vercel Blob client upload with handleUploadUrl pattern"
    - "useEffect + setInterval polling with conditional start/stop"
    - "Client-side batch splitting (groups of 10) for API calls"
key_files:
  created:
    - "src/app/admin/cv-upload/page.tsx"
  modified:
    - "src/app/admin/layout.tsx"
decisions: []
metrics:
  duration: "~3 minutes"
  completed: "2026-02-20"
---

# Phase 2 Plan 4: Admin CV Upload UI with Batch Processing and Status Tracking Summary

Client-side CV upload page with drag-and-drop PDF upload to Vercel Blob, batch parse triggering in groups of 10, real-time status polling every 3 seconds, and retry for failed parses with admin nav integration.

## What Was Done

### Task 1: Create admin CV upload page with full functionality
- Created `src/app/admin/cv-upload/page.tsx` as a 'use client' component
- **Upload Area:** Drag-and-drop zone with PDF-only validation (type + 10MB limit), hidden file input for click-to-select, multi-file support
- **File Upload Flow:** Uses `@vercel/blob/client` `upload()` with handleUploadUrl, then PUT to create DB record
- **Per-file progress:** Shows uploading spinner, checkmark on success, error with message on failure
- **Batch Actions:** "Parse All Uploaded" button sends CVs in batches of 10 to `/api/admin/cv/batch`
- **Progress bar:** Shows overall parsing progress with counts (uploaded/parsing/parsed/failed)
- **Upload List:** Table with filename, status badge (color-coded), uploaded date, parsed date, actions column
- **Status badges:** Blue (uploaded), amber with spinner (parsing), green with checkmark (parsed), red with error (failed)
- **Failed uploads:** Show error message with truncation, "Retry" button calls POST `/api/admin/cv/parse`
- **Status Polling:** useEffect + setInterval polls GET `/api/admin/cv/status` every 3 seconds while any uploads are in 'parsing' state, auto-stops when none are parsing
- Uses lucide-react icons: Upload, FileText, CheckCircle, XCircle, Loader2, RotateCcw
- Uses existing shadcn components: Button, Card, CardContent, CardHeader, CardTitle
- **Commit:** `e47377c`

### Task 2: Update admin layout navigation
- Added `{ name: 'CV Upload', href: '/admin/cv-upload' }` to navLinks array in second position
- **Commit:** `2630fe0`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` compiles without errors | PASS |
| Admin CV upload page exists at src/app/admin/cv-upload/page.tsx | PASS |
| Admin layout nav includes "CV Upload" link | PASS |
| Page has drag-and-drop upload zone | PASS |
| Page has batch parse button | PASS |
| Page has status polling logic (3s interval) | PASS |
| Page has retry button for failed uploads | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready:
- Complete CV upload and parsing pipeline is now functional end-to-end
- Admin can upload PDFs, trigger parsing, monitor progress, and retry failures
- Phase 2 (CV Parsing Pipeline) is complete pending user verification

### Note for usage:
- User must set ANTHROPIC_API_KEY and BLOB_READ_WRITE_TOKEN in .env.local
- User must run `npx drizzle-kit push` to apply schema tables to database
