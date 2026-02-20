# Roadmap

**Project:** IP Lawyer Recruiting Platform
**Created:** 2026-02-19
**Phases:** 8

## Overview

This roadmap follows the critical path to revenue identified in research: authentication, candidate data pipeline, marketplace with anonymization, payment-gated unlocks, then intelligence features. Phases are ordered by strict dependency -- each phase delivers a complete, verifiable capability that unblocks the next. The first three phases build the data foundation (auth, parsing, review), the next three build the revenue engine (employer access, search, payments), and the final two add growth and differentiation (candidate self-service, AI matching).

## Phases

### Phase 1: Foundation and Auth

**Goal:** Users can authenticate via magic link and the application routes them to the correct role-based experience

**Depends on:** Nothing (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03

**Success Criteria:**
1. User can enter their email on the login page, receive a magic link email via Resend, and click it to log in -- no password involved
2. After login, a candidate is routed to the candidate area and an employer is routed to the employer area based on their role
3. Admin can log in and access the admin dashboard (other roles cannot access admin routes)
4. Session persists across browser tabs and page refreshes via HTTP-only cookie; user can log out from any page
5. Rate limiting prevents more than 5 magic link requests per email per hour, and expired/reused tokens show clear error messages

**Notes:** Implements the full magic link specification from `01-magic-link-auth.md`. Includes project scaffolding (Next.js 16, Drizzle ORM, Neon PostgreSQL, Tailwind v4, shadcn/ui), database schema with all normalized tables, and the complete route group structure (`(public)`, `admin/`, `employer/`, `candidate/`).

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, dependencies, database schema
- [x] 01-02-PLAN.md -- Auth libraries (session, tokens, rate limit) + DAL + proxy
- [x] 01-03-PLAN.md -- Auth API routes, server action, email template
- [x] 01-04-PLAN.md -- Route group structure, layouts, role-based placeholder pages
- [x] 01-05-PLAN.md -- Auth UI components, wiring, end-to-end verification

---

### Phase 2: CV Parsing Pipeline

**Goal:** Admin can upload PDF CVs and the system extracts structured IP lawyer data via Claude API with confidence scoring

**Depends on:** Phase 1 (auth and database schema)

**Requirements:** PROF-01, PROF-02, ADMN-04

**Success Criteria:**
1. Admin can upload a single PDF CV and the system extracts structured data (name, contact, specializations, education, technical background, bar admissions, work history) within 30 seconds
2. Admin can batch-upload multiple CVs (up to 95) and the system processes them asynchronously, showing progress status for each (uploaded, parsing, parsed, failed)
3. Each extracted field displays a confidence score (high/medium/low) so admin knows which fields need manual review
4. Parsed data is stored in normalized PostgreSQL tables with proper relational integrity (separate tables for specializations, bar admissions, technical domains, work history, education)
5. Failed parses show clear error messages and can be retried

**Notes:** This is the make-or-break technical phase. CV parsing accuracy determines the quality of everything downstream. Uses Claude API with structured output validated by Zod schemas. PDFs stored in Vercel Blob. Async processing with status polling on the frontend.

**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md -- Database schema extension and package installation
- [x] 02-02-PLAN.md -- CV parser core (Claude API + Zod schemas)
- [x] 02-03-PLAN.md -- Upload handler and API routes
- [x] 02-04-PLAN.md -- Admin CV upload UI with batch processing

---

### Phase 3: Admin Review and Profile Management

**Goal:** Admin can review, correct, and approve parsed candidate profiles before they go live on the platform

**Depends on:** Phase 2 (parsed candidate data exists)

**Requirements:** PROF-03, ADMN-01

**Success Criteria:**
1. Admin sees a review queue of parsed profiles sorted by those needing attention (low-confidence fields first)
2. Admin can view parsed data side-by-side with the original PDF CV and correct any extraction errors
3. Admin can approve a profile to make it live, or reject it with notes for re-processing
4. Admin can edit any field on any candidate profile at any time (not just during initial review)
5. Admin can see all candidate profiles in a searchable, sortable list with status indicators (pending review, active, rejected)

**Notes:** This phase ensures data quality before any employer-facing features. The review UI is critical -- bad data that slips through here poisons search results, matching, and employer trust.

**Plans:** 5 plans

Plans:
- [x] 03-01-PLAN.md -- Schema extension, Drizzle relations, packages, badge components
- [x] 03-02-PLAN.md -- Server actions for profile CRUD (approve, reject, edit)
- [x] 03-03-PLAN.md -- Candidate list page with TanStack Table
- [x] 03-04-PLAN.md -- Profile detail page with inline editing and PDF side-by-side view
- [x] 03-05-PLAN.md -- End-to-end verification checkpoint

---

### Phase 4: Employer Onboarding and Browse

**Goal:** Employers can create accounts, get approved by admin, and browse anonymized candidate profiles

**Depends on:** Phase 3 (approved profiles exist to browse)

**Requirements:** AUTH-04, MARK-01, ADMN-02

**Success Criteria:**
1. New employer can request an account; they cannot browse profiles until admin approves their account
2. Admin can see pending employer accounts, approve or reject them, and view activity of approved employers
3. Approved employer can browse candidate profiles that show qualifications, specializations, experience ranges, and technical background -- but never name, email, phone, or specific identifying details
4. Anonymization is enforced server-side: the API response for unapproved/unpaid employers literally does not contain PII fields (not hidden via CSS, not filtered client-side)
5. Employer sees a clear "Unlock Profile" call-to-action on each anonymized profile

**Notes:** Anonymization is the business model. If employers can identify candidates without paying, the platform has no revenue. Server-side field stripping at the data access layer is non-negotiable. Tiered data disclosure: show experience ranges (not exact years), suppress firm names, use IP specialization categories (not specific matter details).

**Plans:** (created by /gsd:plan-phase)

---

### Phase 5: Search and Discovery

**Goal:** Employers can search and filter the candidate pool to find IP lawyers matching their specific needs

**Depends on:** Phase 4 (employer browse experience exists)

**Requirements:** MARK-02, MARK-04

**Success Criteria:**
1. Employer can filter candidates by IP specialization (patent prosecution, trademark, copyright, trade secrets, IP litigation, licensing), experience level, location, technical background, and patent bar status
2. Employer can combine multiple filters and see results update with count and pagination
3. Employer can save/favorite individual profiles and access them later from a saved profiles list
4. Search results display relevance-sorted anonymized profile cards with enough detail to evaluate fit without revealing identity
5. Empty search states and no-results states provide helpful guidance (broaden filters, try different specializations)

**Notes:** Uses PostgreSQL full-text search with pg_trgm for text matching, plus structured filters on junction tables (specializations, bar admissions, technical domains). Sufficient for <1000 candidates -- no Elasticsearch needed.

**Plans:** (created by /gsd:plan-phase)

---

### Phase 6: Monetization

**Goal:** Employers can pay to unlock full candidate profiles, and admin can track revenue

**Depends on:** Phase 5 (search and discovery drives unlock intent)

**Requirements:** MARK-03, ADMN-03

**Success Criteria:**
1. Employer can click "Unlock Profile" on any anonymized candidate, complete payment via Stripe Checkout, and immediately see the candidate's full name, email, phone, and complete details
2. Previously unlocked profiles remain accessible to the employer permanently (no re-payment required)
3. Employer can view their purchase history showing all unlocked profiles with dates and amounts
4. Admin can view analytics dashboard showing profile views, unlock conversion rates, popular search filters, and total revenue
5. Payment is fulfilled only via Stripe webhook confirmation -- client-side redirect alone never grants access (prevents payment bypass)

**Notes:** Stripe Checkout Sessions with webhook-driven fulfillment. Idempotent webhook handler with Stripe event ID deduplication. The `profile_unlocks` table records which employer unlocked which candidate, preventing double-charges and enabling permanent access.

**Plans:** (created by /gsd:plan-phase)

---

### Phase 7: Candidate Self-Service

**Goal:** IP lawyers can self-register on the platform, upload their CV, and manage their own profile

**Depends on:** Phase 2 (parsing pipeline) and Phase 4 (profile display)

**Requirements:** PROF-04

**Success Criteria:**
1. Candidate can self-register via magic link, provide basic info, and upload their CV for automatic parsing
2. Candidate can view their parsed profile and correct any extraction errors before it goes live
3. Candidate can update their profile information and re-upload a new CV at any time
4. Candidate's self-submitted profile goes through the same parsing pipeline and review process as agency-uploaded CVs
5. Self-registered candidates appear in the same search results and browse experience as agency-uploaded candidates (no second-class profiles)

**Notes:** Reuses the parsing pipeline from Phase 2 and the profile display patterns from Phase 4. The key addition is the candidate-facing registration flow and profile editing UI. Duplicate detection (email matching, name+firm matching) should flag potential overlaps between agency-uploaded and self-registered profiles.

**Plans:** (created by /gsd:plan-phase)

---

### Phase 8: Job Posting and AI Matching

**Goal:** Employers and agency can post jobs, and the system uses AI to rank candidates by fit score

**Depends on:** Phase 5 (search infrastructure) and Phase 6 (employer engagement)

**Requirements:** JOBS-01, JOBS-02, JOBS-03

**Success Criteria:**
1. Employer can create a job listing with structured requirements (required specializations, minimum experience, preferred location, technical background, bar requirements)
2. Admin can create job listings on behalf of employer clients
3. System analyzes job requirements and produces a ranked list of matching candidates with fit scores and plain-English explanations of why each candidate matches (or doesn't)
4. Matching uses a two-stage approach: SQL pre-filter eliminates obvious mismatches, then Claude API scores only the shortlist (cost-effective at scale)
5. System notifies employers when new candidates match their open jobs, and notifies candidates when new jobs match their profile

**Notes:** AI matching is the headline differentiator. Uses decomposed scoring rubric (specialization match, experience fit, technical background, location, bar admissions sub-scores). Match scores cached in `job_matches` table to avoid redundant API calls. Notifications via Resend email.

**Plans:** (created by /gsd:plan-phase)

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1 - Foundation and Auth | Complete | 2026-02-20 |
| 2 - CV Parsing Pipeline | Complete | 2026-02-20 |
| 3 - Admin Review and Profiles | Complete | 2026-02-20 |
| 4 - Employer Onboarding and Browse | Not started | -- |
| 5 - Search and Discovery | Not started | -- |
| 6 - Monetization | Not started | -- |
| 7 - Candidate Self-Service | Not started | -- |
| 8 - Job Posting and AI Matching | Not started | -- |

---

*Roadmap for milestone: v1.0*
