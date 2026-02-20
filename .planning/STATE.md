# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Automated CV parsing and intelligent job matching for IP lawyers -- turning unstructured PDF CVs into structured candidate profiles and using AI to match candidates against job requirements.
**Current focus:** Phase 6 in progress -- Monetization (1 of 3 plans complete)

## Current Position

Phase: 6 of 8 (Monetization)
Plan: 1 of 3 (Phase 6)
Status: In progress
Last activity: 2026-02-20 -- Completed 06-01-PLAN.md (Stripe infrastructure and profile unlock backend)

Progress: █████████████████████████████████████████░ ~59% (23 of ~39 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 23
- Average duration: ~4 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation and Auth | 5/5 | ~30 min | ~6 min |
| 2 - CV Parsing Pipeline | 4/4 | ~11 min | ~3 min |
| 3 - Admin Review and Profiles | 5/5 | ~15 min | ~3 min |
| 4 - Employer Onboarding/Browse | 5/5 | ~15 min | ~3 min |
| 5 - Search and Discovery | 3/3 | ~16 min | ~5 min |
| 6 - Monetization | 1/3 | ~5 min | ~5 min |

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
- [04-03-D1] Inline employer status badge rather than reusing candidate StatusBadge (different status values: pending/approved/rejected vs pending_review/active/rejected)
- [04-03-D2] Direct DB query in employer detail page by profile id (existing DAL getEmployerProfile uses userId, not profile id needed for admin nav)
- [04-02-D1] Page-level approval gating over layout gating (Next.js layouts don't re-render on client navigation, can't read pathname reliably)
- [04-02-D2] Updated registerEmployer signature to (prevState, formData) for useActionState compatibility
- [05-01-D1] Two-query strategy for filtered browse: select builder with EXISTS subqueries for filtering, then relational API with column inclusion for anonymized data loading
- [05-01-D2] Post-query experience range filtering in JS (experience computed from work_history dates, not stored as column; fast enough at <1000 profiles)
- [05-01-D3] URL param renamed from 'specialization' to 'spec' (shorter, supports multi-value via repeated params)
- [05-03-D1] Extracted EmployerNav to shared component for Dashboard/Browse/Saved navigation with active state highlighting
- [06-01-D1] Reused existing APP_URL env var for Stripe success/cancel URLs instead of adding NEXT_PUBLIC_URL

### Pending Todos

- User must set up Neon PostgreSQL and configure DATABASE_URL before Plan 01-03
- User must run `npx drizzle-kit push` to apply schema to database (now includes CV parsing tables + profile status enum + review columns + employerProfiles table + employer_status enum + savedProfiles table + stripeEvents + profileUnlocks + profileViews)
- User must run `drizzle/0001_enable_pg_trgm.sql` against the database to enable pg_trgm extension and GIN indexes for search
- User must generate SESSION_SECRET (`openssl rand -base64 32`)
- User must configure Resend API key and email address
- User must set ANTHROPIC_API_KEY for Claude API CV parsing
- User must set BLOB_READ_WRITE_TOKEN for Vercel Blob PDF storage
- User must set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_AMOUNT for payment processing
- User must configure Stripe webhook endpoint (CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

### Blockers/Concerns

- IP law taxonomy (specializations, technical domains) should be validated with the agency client
- GDPR legal basis needs legal counsel review
- Claude API pricing for PDF processing should be verified against current Anthropic pricing

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 06-01-PLAN.md (Stripe infrastructure and profile unlock backend)
Resume file: None
