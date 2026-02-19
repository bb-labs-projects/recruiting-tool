# Feature Landscape

**Domain:** Niche legal talent recruiting platform (IP lawyers)
**Researched:** 2026-02-19
**Confidence:** MEDIUM (based on training knowledge of recruiting platforms and legal talent marketplaces; no live web verification available)

## Context

This analysis maps the feature landscape for a single-agency IP lawyer recruiting platform with three user types (Admin, Employer, Candidate) and a per-profile-unlock revenue model. Reference platforms considered: LinkedIn Recruiter, Hired, Toptal, LawCrossing, Lateral Link, Major Lindsey & Africa, Robert Half Legal, ZoomInfo (for data gating patterns), and general SaaS marketplace patterns.

---

## Table Stakes

Features users expect. Missing any of these and the platform feels broken, amateurish, or unusable. These are non-negotiable for launch.

### Authentication & Access

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Magic link authentication | Specified in project requirements; modern, passwordless UX | Medium | Already spec'd in `01-magic-link-auth.md`. Must handle edge cases: email pre-fetch, expired tokens, multiple tabs |
| Role-based access control | Three user types need different views/permissions | Medium | Admin sees everything, Employers see anonymized/paid profiles, Candidates see own profile. This is the security backbone |
| Session management | Users expect to stay logged in across visits | Low | HTTP-only cookies, 7-day sessions per auth spec |
| Email verification | Users expect confirmation that their account exists | Low | Built into magic link flow -- first login verifies email |

### CV Upload & Parsing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PDF upload (single file) | Core value proposition -- this IS the product | Low | File validation, size limits (10MB reasonable), PDF-only |
| Batch PDF upload (admin) | Agency has 95 CVs to upload initially; one-by-one is unacceptable | Medium | Admin-only. Drag-and-drop zone, progress tracking for batch. Queue processing with status per file |
| AI-powered CV parsing | Core differentiator. Without this, it's just a file cabinet | High | Claude API integration. Must extract: name, email, phone, location, education, bar admissions, IP specializations, technical background, work history |
| Parsing review/correction UI | Parsed data WILL have errors; admin must be able to fix them | Medium | Side-by-side view: original PDF on left, parsed fields on right. Edit-in-place for each field. This is table stakes because garbage data destroys trust |
| Parsing status tracking | Admin needs to know which CVs parsed successfully vs failed | Low | Status per CV: pending, processing, completed, failed, needs-review |

### Candidate Profiles

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured profile display | Users expect clean, consistent profile pages regardless of CV format | Medium | Standard layout: header (name/title), specializations, experience timeline, education, bar admissions, tech background |
| Anonymized profile view | Core business model -- free browsing, pay to unlock | Medium | Must strip: name, email, phone, specific firm names (replace with "Top 20 IP Firm"), LinkedIn URL. Keep: specialization, years of experience, education level, location (city-level), technical domains. **Anonymization is critical to get right** |
| Full profile view (paid) | The thing employers pay for | Low | Same as anonymized but with all PII revealed. Clean transition after payment |
| Profile completeness indicator | Candidates and admins need to know what's missing | Low | Percentage bar or checklist. Incomplete profiles rank lower in search |

### Search & Discovery

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Search by keyword | Most basic discovery mechanism. Every recruiting platform has this | Medium | Full-text search across profile fields. PostgreSQL `tsvector`/`tsquery` or `pg_trgm` for fuzzy matching |
| Filter by IP specialization | The #1 filter for this domain. Patent prosecution vs trademark vs litigation etc. | Low | Multi-select dropdown. Pre-defined categories from parsing schema |
| Filter by years of experience | Standard recruiting filter | Low | Range slider or brackets (0-3, 3-7, 7-15, 15+) |
| Filter by location | Employers care about jurisdiction and office location | Low | City/state/country. Text input with autocomplete or dropdown |
| Filter by bar admissions | Critical for legal recruiting -- must be admitted in relevant jurisdiction | Low | Multi-select. State bars + patent bar (USPTO registration) |
| Search results list | Paginated results with summary cards showing key info | Medium | Card per candidate: anonymized name, headline, specializations, experience years, location. Clear "Unlock" CTA |
| Sort results | By relevance, experience, recency | Low | Dropdown sort selector |

### Payments & Monetization

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-profile unlock purchase | Core revenue model | High | Stripe Checkout or Payment Intents. Single purchase flow: click unlock -> payment -> reveal. Must be instant (no manual approval) |
| Purchase history | Employers need to track what they've spent and which profiles they've unlocked | Low | Simple list view in employer dashboard: date, candidate (now named), amount |
| Payment receipts | Business expense -- employers need receipts for accounting | Low | Stripe handles this. Email receipt on purchase |
| Price display on locked profiles | Users need to know cost before clicking unlock. No surprise pricing | Low | Clear "$X to unlock full profile" button on every anonymized profile |

### Admin Dashboard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Candidate management list | Admin needs to see all candidates, their status, parsed data quality | Medium | Table view: name, email, parsing status, profile completeness, date added, source (uploaded vs self-registered) |
| Employer management list | Admin needs to see registered employers, their activity | Low | Table view: company, contact, sign-up date, profiles unlocked, total spend |
| Revenue overview | Agency needs to know how much money is coming in | Low | Total revenue, revenue this month, number of unlocks, average revenue per employer |
| CV upload management | Track batch upload progress, reprocess failed CVs | Medium | Upload queue with status, retry button for failures, bulk actions |

### Candidate Self-Service

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Self-registration flow | Specified in requirements. Candidates sign up, upload CV | Medium | Magic link -> role selection -> CV upload -> parsing -> profile review |
| Profile editing | Candidates must be able to correct or update their own data | Medium | Edit form for all profile fields. Changes may need admin approval flag |
| CV re-upload | Candidates update their CV over time | Low | Replace existing CV, re-trigger parsing, diff against previous data |
| Profile visibility control | Candidates may want to hide their profile temporarily (e.g., they accepted a position) | Low | Toggle: active/hidden. Hidden profiles excluded from search |

---

## Differentiators

Features that set this platform apart from generic recruiting tools or manual recruiter processes. Not expected by users on day one, but provide significant competitive advantage.

### AI-Powered Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI job matching with fit scores | The headline differentiator. Employer posts job, system ranks all candidates by fit score | High | Claude API analyzes job requirements against candidate profiles. Output: ranked list with percentage fit score and explanation of why. Considers: specialization overlap, experience level, technical background, jurisdiction match |
| Match explanation text | "Why is this candidate a good fit?" in plain English | Medium | Claude generates human-readable reasoning for each match. Massively more useful than a raw score number |
| Candidate recommendations for jobs | Reverse matching -- "These 3 jobs are great fits for you" | Medium | Same matching engine, reversed. Surfaces on candidate dashboard. Drives engagement |
| Smart search suggestions | "Employers who searched for X also looked at Y" or "Try broadening to include Z specialization" | Medium | Improves discovery when initial search yields few results. Could be rule-based initially, AI-enhanced later |

### IP Law Domain Specificity

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Patent bar status tracking | Critical differentiator for IP recruiting -- many employers specifically need patent bar attorneys | Low | Boolean + registration number field. Parsed from CV. First-class filter, not buried in free text |
| Technical background categorization | IP lawyers often need specific technical degrees (EE, CS, biotech, pharma). This is a key hiring criterion | Low | Structured field with taxonomy: software, electrical, mechanical, biotech, pharma, chemistry, etc. First-class filter |
| IP specialization taxonomy | Patent prosecution, patent litigation, trademark, copyright, trade secrets, licensing, IP transactions, PTAB/IPR, ITC proceedings | Low | Curated taxonomy specific to IP law. Not generic "practice areas" but granular IP sub-specializations |
| Firm tier/prestige tracking | "Worked at Am Law 100 firm" is a strong signal in legal recruiting | Low | Tag firms as Am Law 100/200, boutique IP firm, in-house, government (USPTO, DOJ). Parsed or admin-tagged |
| Notable matters/clients | High-value candidates have worked on landmark cases or for blue-chip clients | Medium | Structured from CV parsing. Displayed on profile. Powerful signal for employers |

### Employer Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Job posting with structured requirements | Employers describe what they need; system matches automatically | Medium | Form with: title, description, required specializations, experience range, location, technical background, patent bar required (yes/no). Structured data enables matching |
| Saved searches with alerts | "Notify me when a new patent prosecution attorney in Boston joins" | Medium | Store search criteria, run against new profiles, email notification. Drives return visits |
| Candidate shortlists/favorites | Employers save interesting profiles for later review or sharing with hiring committee | Low | Bookmark/star functionality. List view of saved candidates. Persisted per employer account |
| Bulk unlock discount | Incentivize larger purchases: "Unlock 5 profiles for the price of 4" | Low | Stripe coupon or tiered pricing. Simple but effective revenue driver |
| Company profile page | Employers have a presence on the platform that candidates can see | Low | Logo, description, open positions, industry focus. Attracts candidate self-registration |

### Platform Quality & Trust

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Profile verification badge | "Agency Verified" badge on profiles uploaded/reviewed by the agency vs self-registered | Low | Simple flag. Builds trust for employers. Self-registered candidates could request verification |
| Data freshness indicator | "Profile updated 3 months ago" so employers know data is current | Low | Last-updated timestamp displayed prominently. Stale profiles flagged |
| Parsing confidence scores | Show admin how confident the AI was in each extracted field | Medium | Claude can output confidence. Display per-field: green/yellow/red. Admin prioritizes reviewing low-confidence fields |
| Duplicate detection | Prevent same candidate from appearing twice (agency upload + self-registration) | Medium | Match on email, name + firm combination. Flag potential duplicates for admin merge |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in recruiting platform development that waste time, add complexity, or actively harm the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-platform messaging/chat | Massive complexity (real-time, notifications, moderation, message history). The agency IS the intermediary -- messaging bypasses them | Employers contact agency directly or use unlocked contact details to reach candidates. Agency maintains control of the relationship |
| Video interview integration | Huge scope creep. Zoom/Teams already exist. Building or integrating video adds months of work for minimal value | Link to candidate's preferred video platform in profile, or let agency coordinate |
| Subscription billing model | Per-profile unlock is the specified model and creates lower barrier to entry. Subscriptions add billing complexity (prorations, downgrades, overages) and may not suit infrequent users | Stick with per-profile unlock. Consider bulk discount packs (5, 10, 25 unlocks) as the "subscription-lite" option |
| Multi-tenant architecture | Specified as out of scope. Building multi-tenancy now adds enormous complexity (data isolation, tenant management, billing per tenant) for a single-agency product | Single-tenant. If multi-tenant needed later, it's a v2 rewrite decision, not a v1 architecture burden |
| Automated outreach/email campaigns | Spam risk, compliance complexity (CAN-SPAM, GDPR), reputation damage. The agency handles outreach personally | Provide candidate contact info; agency handles relationship |
| Mobile native app | Web-first is correct for this use case. Recruiters and employers use desktop. A responsive web app covers the rare mobile use | Build responsive web design. PWA if needed later |
| Social login (Google, LinkedIn) | Adds OAuth complexity for marginal benefit. Magic link is already passwordless and simpler. Multiple auth methods = multiple attack surfaces | Magic link only. Consistent, simple, secure |
| Complex permission/role hierarchies | "Employer admin vs employer viewer vs employer billing" -- premature complexity. Start with flat roles | Three roles only: Admin, Employer, Candidate. If an employer firm needs internal roles, that's a v2 problem |
| Public candidate profiles / SEO indexing | Candidates expect privacy. Public profiles could expose that they're job-searching to current employers | All profiles behind authentication wall. No public URLs. No search engine indexing of candidate data |
| Applicant Tracking System (ATS) features | Full ATS (pipeline stages, interview scheduling, offer tracking) is a different product entirely. Recruit CRM, Greenhouse, Lever already exist | This is a talent marketplace, not an ATS. Employers find candidates here, then manage the hiring process in their own tools |
| AI-generated candidate summaries replacing actual CV data | Tempting to have Claude write polished summaries, but this distorts the truth. Employers trust raw data over AI embellishment | Parse and structure the real data. Display it cleanly. Let the AI match and explain, not rewrite |
| Credit-based system instead of per-profile pricing | Credits add cognitive overhead ("How many credits do I have? How much is a credit worth?"). Transparent per-profile pricing is clearer | Fixed per-profile price. Optional bulk discount packs with clear savings shown |

---

## Feature Dependencies

Understanding what depends on what is critical for phase ordering.

```
Authentication (magic link)
  |
  +-- Role-based access control
  |     |
  |     +-- Admin dashboard
  |     |     |
  |     |     +-- CV upload management
  |     |     +-- Employer management
  |     |     +-- Revenue analytics
  |     |
  |     +-- Employer experience
  |     |     |
  |     |     +-- Browse anonymized profiles (requires: candidate profiles + anonymization)
  |     |     +-- Search & filter (requires: structured candidate data in DB)
  |     |     +-- Per-profile unlock (requires: Stripe integration + anonymized/full profile toggle)
  |     |     +-- Job posting (requires: job data model)
  |     |     +-- AI job matching (requires: job posting + candidate profiles + Claude API)
  |     |     +-- Saved searches / alerts (requires: search + email notifications)
  |     |
  |     +-- Candidate self-service
  |           |
  |           +-- Profile editing (requires: candidate profiles in DB)
  |           +-- CV re-upload (requires: parsing pipeline)
  |           +-- Visibility toggle
  |
  +-- File storage (S3/Supabase Storage)
  |     |
  |     +-- PDF upload (single + batch)
  |           |
  |           +-- CV parsing pipeline (Claude API)
  |                 |
  |                 +-- Structured candidate data in PostgreSQL
  |                 |     |
  |                 |     +-- Candidate profile pages (anonymized + full)
  |                 |     +-- Search & filter system
  |                 |     +-- AI job matching
  |                 |
  |                 +-- Parsing review/correction UI (admin)
  |                 +-- Parsing confidence scores
  |                 +-- Duplicate detection
  |
  +-- Stripe integration
        |
        +-- Per-profile unlock purchases
        +-- Purchase history
        +-- Bulk discount packs (later)
        +-- Revenue analytics (admin)
```

### Critical Path (shortest path to revenue)

1. Authentication -> 2. Database schema -> 3. CV upload + parsing -> 4. Candidate profiles (anonymized) -> 5. Search/filter -> 6. Stripe per-profile unlock -> **REVENUE**

Everything else layers on top of this critical path.

---

## MVP Recommendation

### Phase 1: Foundation (must ship to have any product)

1. **Magic link authentication** with role-based routing
2. **Database schema** for users, candidates, jobs, payments
3. **PDF CV upload** (single for candidates, batch for admin)
4. **CV parsing pipeline** (Claude API -> structured data)
5. **Parsing review UI** for admin to correct errors

### Phase 2: Core Marketplace (must ship to generate revenue)

1. **Candidate profile pages** with anonymization layer
2. **Search and filter** by specialization, experience, location, bar admissions, patent bar, tech background
3. **Stripe per-profile unlock** payment flow
4. **Admin dashboard** (candidate list, employer list, basic revenue view)
5. **Candidate self-registration** and profile editing

### Phase 3: Intelligence Layer (differentiators)

1. **Job posting** with structured requirements
2. **AI job matching** with fit scores and explanations
3. **Saved searches** with email alerts
4. **Candidate shortlists/favorites**
5. **Duplicate detection**

### Defer to Post-MVP

- Bulk unlock discounts (nice revenue optimization but not needed at launch)
- Candidate recommendations for jobs (reverse matching)
- Smart search suggestions
- Company profile pages for employers
- Profile verification badges
- Advanced analytics and reporting

---

## Domain-Specific Feature Considerations

### Anonymization Nuances for IP Law

Anonymization in legal recruiting is harder than it looks. IP law has a small community, and savvy employers can sometimes de-anonymize profiles from contextual clues:

- **Firm names**: Must be generalized ("Am Law 50 IP boutique" not "Fish & Richardson")
- **Notable matters**: Public patent cases are identifiable. Consider omitting specific case names from anonymized view, or generalizing ("represented major tech company in patent infringement case")
- **Education**: A PhD in a rare technical field from a specific university can be identifying. Consider showing field but not institution in anonymized view
- **Patent bar number**: NEVER show in anonymized view (directly identifies the person via USPTO records)
- **Location**: City-level is fine; specific address obviously not
- **Years at specific positions**: "5 years at [Top IP Boutique]" combined with specialization can narrow down candidates significantly

Recommendation: Err on the side of more aggressive anonymization. The whole business model depends on employers needing to pay to identify candidates. If anonymized profiles are too detailed, employers can figure out who candidates are without paying.

### IP Law Specialization Taxonomy

The parsing and filtering system needs a curated taxonomy, not free-form tags. Recommended primary categories:

**Practice Areas:**
- Patent Prosecution (US)
- Patent Prosecution (International/PCT)
- Patent Litigation
- Trademark Prosecution
- Trademark Litigation
- Copyright
- Trade Secrets
- IP Licensing & Transactions
- PTAB / Inter Partes Review
- ITC Section 337 Investigations
- IP Due Diligence (M&A)
- Open Source / Software Licensing

**Technical Domains (for patent practitioners):**
- Software / Computer Science
- Electrical Engineering / Semiconductors
- Mechanical Engineering
- Biotechnology / Life Sciences
- Pharmaceutical / Chemical
- Medical Devices
- Telecommunications
- AI / Machine Learning
- Clean Energy / Cleantech

**Seniority Levels:**
- Junior Associate (0-3 years)
- Mid-Level Associate (3-6 years)
- Senior Associate (6-9 years)
- Of Counsel
- Partner / Counsel
- In-House (specify level)

This taxonomy should be used consistently across CV parsing, profile display, search filters, and job matching.

---

## Competitive Landscape Context

**How this platform compares to alternatives employers currently use:**

| Current Alternative | Weakness This Platform Addresses |
|--------------------|---------------------------------|
| General job boards (Indeed, LinkedIn) | Not IP-specific. Flooded with irrelevant candidates. No technical background filtering |
| Legal recruiting firms (manual) | Slow, expensive, limited to recruiter's personal network. No self-service search |
| Legal-specific boards (LawCrossing, Lateral Link) | Broad legal focus, not IP-specific. No AI matching. No technical domain filtering |
| Personal networks | Limited scale. Biased toward people you already know |
| USPTO registration search | Public data but no CV info, no experience details, no way to assess fit |

The platform's unique value: **IP-law-specific structured data + AI matching + per-profile pricing**. No existing platform lets employers search specifically for "patent prosecution attorney with biotech background, 5-10 years experience, admitted in California, patent bar registered" and get ranked results.

---

## Sources & Confidence Notes

- **Feature categorization**: Based on training knowledge of recruiting platform patterns (LinkedIn Recruiter, Hired, Toptal, general SaaS marketplaces). MEDIUM confidence -- no live verification was possible.
- **IP law domain specifics**: Based on training knowledge of IP law practice areas, bar admissions, and legal recruiting norms. MEDIUM confidence -- taxonomy should be validated with the agency client.
- **Anonymization requirements**: Based on training knowledge of data gating patterns (ZoomInfo, Lusha) and legal recruiting privacy norms. MEDIUM confidence -- the specific anonymization rules should be user-tested.
- **Anti-features list**: HIGH confidence -- these are well-established scope management principles for marketplace MVPs.
- **Dependency graph**: HIGH confidence -- these are logical technical dependencies derived from the project requirements.

**Key gap**: No live competitive analysis was possible. The feature list should be validated against current offerings from Lateral Link, Major Lindsey & Africa, and similar IP-focused legal recruiters. The agency operating this platform will have firsthand knowledge of competitor feature sets.
