# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Automated CV parsing and intelligent job matching for IP lawyers -- turning unstructured PDF CVs into structured candidate profiles and using AI to match candidates against job requirements.
**Current focus:** Phase 1 -- Foundation and Auth

## Current Position

Phase: 1 of 8 (Foundation and Auth)
Plan: 4 of 5 (Phase 1)
Status: In progress
Last activity: 2026-02-19 -- Completed 01-04-PLAN.md (route groups, layouts, placeholder pages)

Progress: ██████░░░░ ~20% (4 plans of ~20 estimated total)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~6 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation and Auth | 4/5 | ~22 min | ~5.5 min |

## Accumulated Context

### Decisions

- Magic link auth follows spec in `01-magic-link-auth.md` (no passwords, HTTP-only cookies, rate limiting, 10-min token expiry)
- Stack: Next.js 16.1.6 + Drizzle ORM 0.45.1 + Neon PostgreSQL + Stripe + Resend + Vercel Blob + shadcn/ui
- Server-side anonymization enforced at data access layer (never send PII to unapproved/unpaid employers)
- Two-stage AI matching: SQL pre-filter then Claude API scoring on shortlist only
- Webhook-first payment pattern: profile unlocks only on Stripe webhook confirmation
- [01-01-D1] Scaffold fallback: used temp directory approach since project root was non-empty
- [01-01-D2] Added .env.example exception to .gitignore (.env* pattern would exclude it)
- [01-01-D3] text() for IP address columns instead of inet() to avoid driver compatibility issues
- [01-02-D1] Used Next.js 16 proxy.ts (not middleware.ts) -- confirmed via source code that middleware.ts is deprecated in 16.1.6
- [01-02-D2] Role-mismatched proxy redirects go to user's dashboard (not /login) for better UX

### Pending Todos

- User must set up Neon PostgreSQL and configure DATABASE_URL before Plan 01-03
- User must run `npx drizzle-kit push` to apply schema to database
- User must generate SESSION_SECRET (`openssl rand -base64 32`)
- User must configure Resend API key and email address

### Blockers/Concerns

- IP law taxonomy (specializations, technical domains) should be validated with the agency client
- GDPR legal basis needs legal counsel review
- Claude API pricing for PDF processing should be verified against current Anthropic pricing

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 01-04-PLAN.md
Resume file: None
