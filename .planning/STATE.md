# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Automated CV parsing and intelligent job matching for IP lawyers -- turning unstructured PDF CVs into structured candidate profiles and using AI to match candidates against job requirements.
**Current focus:** Phase 4 in progress -- Employer Onboarding and Browse

## Current Position

Phase: 4 of 8 (Employer Onboarding and Browse)
Plan: 1 of ? (Phase 4)
Status: In progress
Last activity: 2026-02-20 -- Completed 04-01-PLAN.md (schema, anonymization, DAL, server actions)

Progress: ██████████████████████████░░ ~37% (15 of ~40 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: ~4 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation and Auth | 5/5 | ~30 min | ~6 min |
| 2 - CV Parsing Pipeline | 4/4 | ~11 min | ~3 min |
| 3 - Admin Review and Profiles | 5/5 | ~15 min | ~3 min |
| 4 - Employer Onboarding/Browse | 1/? | ~3 min | ~3 min |

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
- [01-03-D1] Inline HTML for email template instead of React email components (simpler, better email client compatibility)
- [01-03-D2] Server action uses 'server-action' as IP/userAgent placeholder (Next.js server actions lack request header access)
- [03-04-D1] Used useTransition instead of useActionState for approve/reject actions to avoid complex type narrowing issues
- [03-04-D2] Used orientation prop instead of direction for ResizablePanelGroup (react-resizable-panels v3 API)
- [04-01-D1] Column inclusion mode (whitelist) for anonymized queries rather than exclusion mode, to prevent PII leakage if new columns added
- [04-01-D2] Two separate DAL modules for employer vs admin data paths (never conditional field return in a single function)

### Pending Todos

- User must set up Neon PostgreSQL and configure DATABASE_URL before Plan 01-03
- User must run `npx drizzle-kit push` to apply schema to database (now includes CV parsing tables + profile status enum + review columns + employerProfiles table + employer_status enum)
- User must generate SESSION_SECRET (`openssl rand -base64 32`)
- User must configure Resend API key and email address
- User must set ANTHROPIC_API_KEY for Claude API CV parsing
- User must set BLOB_READ_WRITE_TOKEN for Vercel Blob PDF storage

### Blockers/Concerns

- IP law taxonomy (specializations, technical domains) should be validated with the agency client
- GDPR legal basis needs legal counsel review
- Claude API pricing for PDF processing should be verified against current Anthropic pricing

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 04-01-PLAN.md (schema, anonymization, DAL, server actions)
Resume file: None
