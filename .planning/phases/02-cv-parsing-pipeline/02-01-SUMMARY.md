---
phase: 02-cv-parsing-pipeline
plan: 01
subsystem: data-model
tags: [drizzle, postgresql, schema, anthropic-sdk, vercel-blob]
depends_on:
  - "01-foundation-and-auth"
provides:
  - "Anthropic SDK (@anthropic-ai/sdk) for Claude API CV parsing"
  - "Vercel Blob (@vercel/blob) for PDF file storage"
  - "Database schema for CV parsing pipeline (9 tables, 2 enums)"
  - "Profile data model with per-field confidence tracking"
affects:
  - "02-02: CV parser core depends on schema types and Anthropic SDK"
  - "02-03: Upload handler depends on cvUploads table and Vercel Blob"
  - "02-04: Admin UI depends on all schema tables for display"
tech_stack:
  added:
    - "@anthropic-ai/sdk@^0.78.0"
    - "@vercel/blob@^2.3.0"
  patterns:
    - "Per-field confidence tracking (high/medium/low enum on each extracted field)"
    - "Junction tables with composite primary keys for many-to-many relationships"
    - "CV upload status state machine (uploaded -> parsing -> parsed/failed)"
    - "Lookup tables for specializations and technical domains (get-or-create pattern)"
key_files:
  created: []
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/lib/db/schema.ts"
decisions: []
metrics:
  duration: "~3 minutes"
  completed: "2026-02-20"
---

# Phase 2 Plan 1: Database Schema Extension and Package Installation Summary

Installed @anthropic-ai/sdk and @vercel/blob packages, extended Drizzle ORM schema with 2 enums (cvUploadStatusEnum, confidenceEnum) and 9 tables for the CV parsing pipeline with per-field confidence tracking and proper foreign key relationships.

## What Was Done

### Task 1: Install npm packages
- Installed `@anthropic-ai/sdk@^0.78.0` for Claude API CV parsing
- Installed `@vercel/blob@^2.3.0` for PDF file storage
- Both packages use caret ranges (not pinned)
- **Commit:** `6869169`

### Task 2: Extend database schema with CV parsing tables
- Added `primaryKey` to drizzle-orm/pg-core imports for composite primary keys
- Added `cvUploadStatusEnum` enum: uploaded, parsing, parsed, failed
- Added `confidenceEnum` enum: high, medium, low
- Added 9 tables in foreign-key-safe order:
  1. **profiles** -- main profile with name/email/phone and per-field confidence
  2. **cvUploads** -- tracks PDF uploads with status state machine, FK to users and profiles
  3. **specializations** -- lookup table for IP law specializations
  4. **profileSpecializations** -- junction table with composite PK and confidence
  5. **education** -- education entries with institution/degree/field/year
  6. **technicalDomains** -- lookup table for technical backgrounds
  7. **profileTechnicalDomains** -- junction table with composite PK and confidence
  8. **barAdmissions** -- bar admission records with jurisdiction/year/status
  9. **workHistory** -- work history with employer/title/dates/description
- All tables follow existing conventions (UUID PKs, timestamp with timezone, index patterns)
- Existing tables (users, magicLinkTokens, sessions) left completely unchanged
- **Commit:** `a839997`

## Verification Results

| Check | Result |
|-------|--------|
| `npm ls @anthropic-ai/sdk @vercel/blob` lists both | PASS |
| `npx tsc --noEmit` compiles without errors | PASS |
| All 9 new tables exported from schema.ts | PASS |
| Both new enums exported from schema.ts | PASS |
| Foreign keys reference users.id and profiles.id correctly | PASS |
| Cascade deletes on profile-dependent tables | PASS |
| Existing tables unchanged | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Next Phase Readiness

### What's ready for Plan 02-02:
- Anthropic SDK installed and importable
- All schema types available for Zod schema definitions
- Confidence enum ready for parser output typing
- Profile and related table structures defined for insert operations

### What's ready for Plan 02-03:
- Vercel Blob installed for PDF upload handling
- cvUploads table ready for upload tracking
- Status enum defines the upload lifecycle state machine

### Note for deployment:
- User must run `npx drizzle-kit push` or `npx drizzle-kit generate && npx drizzle-kit migrate` to apply new tables to database
