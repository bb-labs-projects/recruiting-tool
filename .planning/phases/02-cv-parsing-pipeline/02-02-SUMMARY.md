---
phase: 02-cv-parsing-pipeline
plan: 02
subsystem: cv-parser
tags: [anthropic-sdk, claude-api, zod, structured-output, pdf-parsing]
depends_on:
  - "02-01"
provides:
  - "Zod schemas for Claude structured CV output with per-field confidence"
  - "IP law-specific extraction prompt for Claude API"
  - "parseSingleCv() function: PDF fetch -> Claude API -> normalized DB storage"
  - "delay() helper for batch processing rate limiting"
affects:
  - "02-03: Batch processing calls parseSingleCv() and delay()"
  - "02-04: Admin UI triggers parsing and displays results from profile tables"
tech_stack:
  added: []
  patterns:
    - "zodOutputFormat() with output_config.format for structured Claude output"
    - "Base64 PDF document blocks for native Claude PDF processing"
    - "Database transaction for atomic multi-table inserts"
    - "Upsert pattern (onConflictDoNothing + select) for lookup tables"
key_files:
  created:
    - "src/lib/cv-parser/schema.ts"
    - "src/lib/cv-parser/prompt.ts"
    - "src/lib/cv-parser/parse.ts"
  modified: []
decisions: []
metrics:
  duration: "~3 minutes"
  completed: "2026-02-20"
---

# Phase 2 Plan 2: CV Parser Core -- Claude API Integration and Zod Schemas Summary

Core CV parsing module with Zod-validated structured output from Claude Haiku 4.5, IP law extraction prompt, and atomic multi-table database storage with per-field confidence scoring.

## What Was Done

### Task 1: Create Zod schemas for Claude structured output
- Created `src/lib/cv-parser/schema.ts` with `CvParsedDataSchema`
- 8 extraction fields each wrapped with confidence level (high/medium/low)
- Sub-schemas: EducationEntry, BarAdmissionEntry, WorkHistoryEntry
- All fields required (no `z.optional()`) to avoid structured output's 24 optional param limit
- Empty string used as sentinel for missing data
- **Commit:** `50e990f`

### Task 2: Create extraction prompt and main parse function
- Created `src/lib/cv-parser/prompt.ts` with `CV_EXTRACTION_PROMPT`
  - IP law domain-specific guidance listing common specializations and technical backgrounds
  - Confidence level definitions (high/medium/low)
  - Date format preferences (YYYY or YYYY-MM)
  - Rules for handling missing data
- Created `src/lib/cv-parser/parse.ts` with `parseSingleCv()` and `delay()`
  - Fetches PDF from Vercel Blob URL and converts to base64
  - Calls Claude Haiku 4.5 with document content block and structured output via `output_config.format`
  - Parses response with Zod schema validation
  - Stores results atomically in transaction across all normalized tables:
    - profiles (name, email, phone with confidence)
    - specializations + profileSpecializations (upsert pattern)
    - education entries
    - technicalDomains + profileTechnicalDomains (upsert pattern)
    - barAdmissions entries
    - workHistory entries
    - cvUploads status update to 'parsed'
  - Error handling: catches all errors, updates cvUpload status to 'failed' with truncated message
  - Validates upload status before parsing (allows retry of 'failed')
- **Commit:** `8033f7f`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` compiles without errors | PASS |
| schema.ts exports CvParsedDataSchema, CvParsedData, ConfidenceLevel | PASS |
| prompt.ts exports CV_EXTRACTION_PROMPT | PASS |
| parse.ts exports parseSingleCv and delay | PASS |
| parse.ts uses `output_config.format` (not `output_format` or `.parse()`) | PASS |
| parse.ts uses database transaction for atomic writes | PASS |
| parse.ts handles success (status='parsed') and failure (status='failed') | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 02-03:
- `parseSingleCv()` is the core function that batch processing will call
- `delay()` helper is exported for rate limiting between API calls
- All database table interactions are proven to type-check

### What's ready for Plan 02-04:
- Profile data is stored in normalized tables ready for UI display
- cvUpload status tracking enables progress polling from frontend
