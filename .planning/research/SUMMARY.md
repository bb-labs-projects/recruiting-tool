# Research Summary

**Project:** IP Lawyer Recruiting Platform
**Synthesized:** 2026-02-19
**Research files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

This is a **document-processing recruiting marketplace** for IP lawyers, built around a single agency that uploads candidate CVs, an AI parsing pipeline (Claude API) that structures the data, and a per-profile-unlock monetization model where employers pay to reveal anonymized candidate identities. The recommended approach is a Next.js 15 App Router application backed by Neon (serverless PostgreSQL), Drizzle ORM, Stripe Checkout for payments, and Claude API for both CV parsing and job matching. The architecture splits cleanly into three concerns: an ingestion pipeline (PDF upload and AI parsing), a marketplace layer (search, anonymization, payment gating), and a management layer (admin dashboard, candidate self-service, employer workspace).

The two make-or-break technical challenges are **CV parsing accuracy** and **server-side anonymization**. If Claude extracts wrong specializations or hallucinated bar admissions, the entire data foundation is corrupted -- bad data poisons search results, AI matching, and employer trust. If anonymization leaks candidate identity through contextual data or client-side exposure, the monetization model collapses because employers can identify candidates without paying. Both of these must be solved at the architectural level during the foundation phase, not patched later.

The project is well-scoped for a solo developer or small team. The initial dataset is only 95 candidates, which means PostgreSQL full-text search is sufficient (no Elasticsearch needed), Claude API costs are manageable (~$5-15/month at MVP scale), and infrastructure costs are near-zero on free tiers. The critical path to revenue is short: auth, database schema, CV upload/parsing, anonymized profiles, search, Stripe unlock. Everything else (AI matching, job posting, saved searches) layers on top.

---

## Key Findings

### From STACK.md

| Technology | Rationale |
|-----------|-----------|
| **Next.js 15 (App Router)** | Server Components for data-safe rendering, Server Actions for mutations, seamless Vercel deployment |
| **Neon (serverless PostgreSQL)** | Pure Postgres without Supabase's bundled opinions; serverless driver for Vercel edge; DB branching for preview deploys |
| **Drizzle ORM** | Lighter than Prisma for serverless (no binary engine), SQL-like API for complex search queries, native Neon driver support |
| **Claude API (@anthropic-ai/sdk)** | Two uses: CV parsing (PDF-to-structured-data) and job matching (semantic candidate ranking). Superior to generic CV parsers for IP-law-specific fields |
| **Stripe (Checkout Sessions)** | Per-profile one-time payments, not subscriptions. Webhook-driven fulfillment with metadata for candidate/employer IDs |
| **Resend + React Email** | Magic link delivery and notifications. Best DX in the email space, free tier covers MVP volume |
| **Vercel Blob** | Zero-config PDF storage for Vercel deployments. Swappable to S3 if needed |
| **shadcn/ui + Tailwind v4** | Copy-paste components with full control. Accessible Radix primitives. Standard modern React UI stack |
| **Zod** | Critical for validating Claude API JSON responses against expected schema before DB insertion |
| **PostgreSQL FTS + pg_trgm** | Built-in search sufficient for <1000 candidates. No external search infrastructure needed |

**Critical version note:** All version numbers are based on training data through May 2025. Run `npm view <pkg> version` for each package before installing.

**MVP monthly cost:** ~$5-15/month (almost entirely Claude API costs). All other services fit within free tiers.

### From FEATURES.md

**Table Stakes (must have for launch):**
- Magic link authentication with role-based access (Admin, Employer, Candidate)
- PDF CV upload (single + batch) with AI-powered parsing via Claude
- Parsing review/correction UI (side-by-side PDF and extracted data)
- Anonymized candidate profiles with structured display
- Search and filter by IP specialization, experience, location, bar admissions, patent bar
- Per-profile unlock via Stripe (one-time payment, instant access)
- Admin dashboard (candidate management, employer list, revenue overview)
- Candidate self-registration, profile editing, and visibility toggle

**Differentiators (should have for competitive advantage):**
- AI job matching with fit scores and plain-English explanations
- IP-law-specific taxonomy: patent bar tracking, technical background categorization, firm tier tagging
- Employer job posting with structured requirements for automated matching
- Saved searches with email alerts
- Parsing confidence scores per field
- Duplicate detection (agency upload vs. self-registration overlap)

**Anti-features (explicitly do NOT build):**
- In-platform messaging (agency is the intermediary)
- Video interview integration (Zoom/Teams exist)
- Subscription billing (per-profile unlock is the model)
- Multi-tenant architecture (single-agency product)
- Social login (magic link only)
- Complex permission hierarchies (three flat roles only)
- Public candidate profiles / SEO indexing (privacy-first)
- ATS features (this is a talent marketplace, not an ATS)

**Critical path to revenue:** Auth -> Schema -> CV Upload/Parse -> Anonymized Profiles -> Search -> Stripe Unlock

### From ARCHITECTURE.md

**Three architectural layers:**
1. **Ingestion pipeline** -- PDF upload, Claude API parsing, structured data extraction, admin review
2. **Marketplace layer** -- Browse, search, anonymization enforcement, payment-gated profile unlocks
3. **Management layer** -- Admin dashboard, candidate self-service, employer workspace

**Major architectural patterns:**
- **Server-side anonymization (non-negotiable):** Data access functions accept `requestingUserId` and `role`, strip PII at the query level. The API response for unpaid employers literally does not contain name/email/phone. Never send full data to the client and hide it in the UI.
- **Async CV parsing:** Claude API takes 5-30 seconds per PDF. Upload returns immediately, parsing runs in background, frontend polls for status. For 95 initial PDFs, chunk into batches of 10.
- **Normalized candidate schema:** Separate junction tables for specializations, bar admissions, technical domains, work history, education. Enables precise multi-filter queries with proper indexing.
- **Two-stage AI matching:** SQL pre-filter eliminates obvious mismatches (70-90% of candidates), then Claude scores only the shortlist. Prevents quadratic API cost growth.
- **Webhook-first payment pattern:** Profile unlocks happen ONLY when Stripe webhook confirms payment, never on client-side redirect. Idempotent webhook handler with Stripe event ID deduplication.

**Next.js route structure:** `(public)` and `(authenticated)` route groups. Within authenticated: `admin/`, `employer/`, `candidate/` each with own layout. Middleware checks session cookie at edge; role-based access enforced in server components and route handlers.

**Key data model tables:** `users`, `candidates`, `candidate_specializations`, `candidate_technical_background`, `work_history`, `education`, `bar_admissions`, `profile_unlocks`, `jobs`, `job_matches`

### From PITFALLS.md

**Top 5 Critical Pitfalls:**

| # | Pitfall | Impact | Prevention |
|---|---------|--------|------------|
| 1 | **CV parsing produces silently wrong data** | Poisoned data foundation, employer trust destruction | Confidence scores per field, mandatory admin review queue, structured prompt with controlled vocabulary, parse-then-verify double-check |
| 2 | **Anonymization leaks identity through contextual data** | Monetization model collapse | Tiered data disclosure (ranges not specifics), firm name suppression, k-anonymity principle, admin-configurable rules |
| 3 | **Payment gating bypass via API/client data exposure** | Free access to all candidate data | Server-side field stripping at query level, explicit column selection (never SELECT *), automated tests asserting anonymized endpoints never return PII |
| 4 | **GDPR and candidate consent violations** | Legal liability, fines up to 4% turnover | Consent tracking table in initial schema, data deletion cascade endpoint, right-to-access export, data retention policy |
| 5 | **Claude API costs spiral on job matching** | Unsustainable costs, slow matching | Two-stage architecture (SQL pre-filter + Claude for shortlist only), cached match scores, background batch processing |

**Cross-cutting compound risks:**
- Bad parsing (#1) feeds bad matching (#5) -- garbage in, garbage out
- Weak anonymization (#2) makes payment gating (#3) pointless
- GDPR (#4) affects every phase -- deletion must cascade through all data stores
- Search performance (#7) and search UX (#12) are two sides of the same coin

---

## Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Foundation and Data Pipeline**
- Project scaffolding (Next.js 15, Drizzle, Neon, Tailwind, shadcn/ui)
- Database schema with all normalized tables, junction tables, indexes, consent tracking, and soft-delete support
- Magic link authentication with session management, rate limiting, IP binding
- Role-based middleware and route group structure
- PDF upload to Vercel Blob (single file + batch)
- Claude API CV parsing pipeline with structured output validation via Zod
- Parsing status tracking (uploaded -> parsing -> parsed -> reviewed -> active)
- Admin parsing review UI (side-by-side PDF + extracted data)

**Rationale:** Everything depends on having structured candidate data in the database. This phase is the critical bottleneck. Build it first and load the 95 real CVs to validate parsing quality before building any employer-facing features.

**Delivers:** Working auth, populated candidate database with reviewed profiles, admin can upload and manage CVs.

**Must avoid:** Silent parsing errors (Pitfall #1), PDF extraction failures (Pitfall #6), GDPR schema omissions (Pitfall #4), magic link security gaps (Pitfall #9).

---

**Phase 2: Marketplace Core (Path to Revenue)**
- Anonymized candidate profile display with tiered data disclosure
- Server-side anonymization layer in data access functions
- Search and filter system (PostgreSQL FTS + structured filters on specialization, experience, location, bar admissions, patent bar, tech background)
- Search results with pagination and sort
- Employer browse experience with "Unlock Profile" CTA
- Stripe Checkout integration for per-profile unlock payments
- Webhook-driven profile unlock fulfillment
- Purchase history for employers
- Basic admin dashboard (candidate list, employer list, revenue summary)

**Rationale:** This phase delivers the revenue-generating core. Employers can find, evaluate (anonymized), and pay to unlock candidate profiles. The anonymization and payment gating must be bulletproof -- they ARE the business model.

**Delivers:** Revenue capability. Employers can search, browse anonymized profiles, pay to unlock, and see full details.

**Must avoid:** Anonymization identity leaks (Pitfall #2), payment gating bypass (Pitfall #3), Stripe race conditions (Pitfall #8), search UX mismatch (Pitfall #12), profile ID enumeration (Pitfall #14).

---

**Phase 3: Candidate Self-Service and Platform Polish**
- Candidate self-registration flow (magic link -> role selection -> CV upload -> parsing -> review)
- Candidate profile editing with controlled vocabulary dropdowns
- CV re-upload with re-parsing
- Profile visibility toggle (active/hidden)
- Candidate dashboard
- Admin candidate status management improvements
- Duplicate detection (email + name+firm matching)
- Data freshness indicators
- GDPR data export and deletion endpoints for candidates

**Rationale:** Self-registration grows the candidate pool beyond the initial 95 agency-uploaded CVs. This is the platform's growth engine. Build it after the core marketplace is validated with real employer usage.

**Delivers:** Candidate acquisition channel, improved data quality tooling, GDPR compliance endpoints.

**Must avoid:** Data quality divergence between parsed and form-entered data (Pitfall #13), batch upload UX frustration (Pitfall #11).

---

**Phase 4: Intelligence Layer (Differentiators)**
- Job posting with structured requirements (specializations, experience, tech domains, bar requirements)
- Two-stage AI job matching (SQL pre-filter + Claude API scoring for shortlist)
- Decomposed scoring rubric (specialization, experience, technical, location sub-scores)
- Match results display with fit scores and plain-English reasoning
- Match score caching in `job_matches` table
- Saved searches with email alerts (Resend)
- Candidate shortlists/favorites for employers

**Rationale:** AI matching is the headline differentiator but depends on having clean candidate data (Phase 1) and a working employer experience (Phase 2). Building it last means the data foundation is solid and validated.

**Delivers:** AI-powered recruiting intelligence that no competitor offers for IP law.

**Must avoid:** API cost spiral (Pitfall #5), opaque scoring (Pitfall #10).

---

**Defer to Post-MVP:**
- Bulk unlock discount packs
- Candidate recommendations for jobs (reverse matching)
- Smart search suggestions
- Company profile pages for employers
- Profile verification badges
- Advanced analytics and reporting

### Research Flags

| Phase | Needs `/gsd:research-phase`? | Rationale |
|-------|------------------------------|-----------|
| Phase 1 (Foundation) | **YES** -- CV parsing pipeline | Claude API PDF handling, prompt engineering for IP law extraction, confidence scoring patterns. This is novel and domain-specific. |
| Phase 1 (Foundation) | No -- Auth, schema, scaffolding | Magic link auth is well-documented. Database schema patterns are standard. |
| Phase 2 (Marketplace) | **YES** -- Anonymization design | The anonymization rules for IP law are domain-specific. Need to define exactly what is visible at each tier. k-anonymity with 95 candidates is non-trivial. |
| Phase 2 (Marketplace) | No -- Stripe integration | Well-documented standard pattern. Checkout Sessions + webhooks. |
| Phase 2 (Marketplace) | No -- Search/filter | PostgreSQL FTS is well-documented. Standard CRUD. |
| Phase 3 (Self-Service) | No | Reuses patterns from Phase 1 (parsing) and Phase 2 (profiles). Standard forms and CRUD. |
| Phase 4 (Intelligence) | **YES** -- AI matching | Prompt design for scoring, rubric decomposition, batching strategy, cost optimization. Novel pattern requiring experimentation. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Next.js 15 + Neon + Drizzle + Stripe + Resend is a well-established modern stack. All choices have clear rationale and alternatives documented. Package versions need verification. |
| Features | **MEDIUM** | Feature categorization is solid (table stakes vs differentiators vs anti-features). IP law taxonomy should be validated with the agency client. Anonymization rules need user testing. Competitive analysis was not possible against live competitors. |
| Architecture | **HIGH** | Three-layer architecture (ingestion, marketplace, management) maps cleanly to the domain. Normalized schema, server-side anonymization, async parsing pipeline, and webhook-first payments are all well-established patterns. Minor ORM inconsistency: ARCHITECTURE.md sometimes references Prisma while STACK.md recommends Drizzle -- **use Drizzle** per the stack decision. |
| Pitfalls | **MEDIUM-HIGH** | 14 pitfalls identified with clear prevention strategies. Critical pitfalls (#1-5) are well-reasoned and actionable. GDPR specifics should be validated with a legal professional. Claude API cost estimates should be verified against current Anthropic pricing. |

### Gaps to Address

1. **Package version verification:** All npm package versions are from training data (May 2025). Must run `npm view <pkg> version` before installation.
2. **IP law taxonomy validation:** The specialization and technical domain taxonomy should be reviewed by the agency client who knows the market.
3. **Anonymization rules testing:** The tiered data disclosure model needs user testing with actual IP law employers to ensure profiles are sufficiently anonymized.
4. **GDPR legal review:** Technical provisions for GDPR are included, but the legal basis for processing (consent vs. legitimate interest) requires legal counsel.
5. **Claude API pricing:** Cost estimates are approximate. Verify against current Anthropic pricing, especially for PDF document processing.
6. **Competitive landscape:** No live competitive analysis was possible. Validate feature set against Lateral Link, Major Lindsey & Africa, and similar IP legal recruiters.
7. **ORM alignment:** ARCHITECTURE.md was written with some Prisma references. The stack decision is Drizzle. Ensure all implementation follows Drizzle patterns.

---

## Sources

Aggregated from all research files:

- PROJECT.md and 01-magic-link-auth.md from this repository (read directly by researchers)
- Next.js official documentation v16.1.6 (verified by ARCHITECTURE.md researcher)
- Training data through May 2025 for: library versions, ecosystem patterns, recruiting platform architecture, Stripe integration patterns, PostgreSQL search optimization, GDPR requirements, LLM document parsing patterns
- Reference platforms considered: LinkedIn Recruiter, Hired, Toptal, LawCrossing, Lateral Link, Major Lindsey & Africa, Robert Half Legal, ZoomInfo

**No live web verification was available during research.** All findings should be treated as high-quality starting points that need validation against current documentation during implementation.
