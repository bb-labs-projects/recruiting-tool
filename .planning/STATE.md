# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Automated CV parsing and intelligent job matching for IP lawyers -- turning unstructured PDF CVs into structured candidate profiles and using AI to match candidates against job requirements.
**Current focus:** Phase 1 -- Foundation and Auth

## Current Position

Phase: 1 of 8 (Foundation and Auth)
Plan: Not started
Status: Ready to plan
Last activity: 2026-02-19 -- Project roadmap created

Progress: ░░░░░░░░░░ 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: --

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| -- | -- | -- | -- |

## Accumulated Context

### Decisions

- Magic link auth follows spec in `01-magic-link-auth.md` (no passwords, HTTP-only cookies, rate limiting, 10-min token expiry)
- Stack: Next.js 15 + Drizzle ORM + Neon PostgreSQL + Stripe + Resend + Vercel Blob + shadcn/ui
- Server-side anonymization enforced at data access layer (never send PII to unapproved/unpaid employers)
- Two-stage AI matching: SQL pre-filter then Claude API scoring on shortlist only
- Webhook-first payment pattern: profile unlocks only on Stripe webhook confirmation

### Pending Todos

(None yet)

### Blockers/Concerns

- Package versions from research are based on May 2025 training data -- verify with `npm view` before installing
- IP law taxonomy (specializations, technical domains) should be validated with the agency client
- GDPR legal basis needs legal counsel review
- Claude API pricing for PDF processing should be verified against current Anthropic pricing

## Session Continuity

Last session: 2026-02-19
Stopped at: Roadmap creation
Resume file: None
