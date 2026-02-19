# IP Lawyer Recruiting Platform

## What This Is

A recruiting platform that connects intellectual property lawyers with law firms and companies seeking IP talent. A single recruitment agency manages the candidate pool, while end clients (employers) browse anonymized profiles and pay per-profile to unlock contact details. Candidates can also self-register and upload their own CVs.

## Core Value

**Automated CV parsing and intelligent job matching for IP lawyers.** The platform turns unstructured PDF CVs into clean, structured candidate profiles and uses AI to match candidates against job requirements — saving the recruitment agency and their clients hours of manual screening.

## Users

### 1. Admin (Recruitment Agency)
- Single tenant — one recruitment agency operates the platform
- Uploads candidate CVs (batch of 95 PDFs initially, ongoing additions)
- Full admin dashboard: manage profiles, review parsed data, correct errors, view analytics, manage client accounts
- Can upload/create job listings and run matches

### 2. Employers (Law Firms / Companies)
- End clients of the recruitment agency
- Browse and search candidate profiles
- **Free tier**: See anonymized profiles (no name, no contact details) — can view qualifications, specializations, experience
- **Paid tier**: Pay per-profile to unlock full contact details and name
- Can post job ads on the platform, system matches candidates automatically
- Authenticate via magic link (passwordless email login)

### 3. Candidates (IP Lawyers)
- Can self-register on the platform
- Create their own profile and upload their CV (PDF)
- CV is parsed automatically, same as agency-uploaded CVs
- Can manage/update their profile
- Authenticate via magic link (passwordless email login)

## Authentication

Magic link (passwordless) authentication for all users, following the specification in `01-magic-link-auth.md`:
- Email-based, no passwords
- Time-limited, one-time-use tokens (10 min expiry)
- HTTP-only session cookies
- Rate limiting (5 requests/email/hour)
- On login: route to candidate experience or employer experience based on user role
- Admin has separate access (or super-user role)

## CV Parsing (Core Feature)

- Upload PDF CVs → Claude API extracts structured data
- Data points extracted:
  - **Core details**: Name, email, phone, location, years of experience, education, bar admissions
  - **IP specializations**: Patent prosecution, trademark, copyright, trade secrets, IP litigation, licensing
  - **Technical background**: Technical degrees, patent bar status, technology domains (biotech, software, pharma, mechanical, electrical, etc.)
  - **Work history**: Firms worked at, positions held, notable clients/matters
- Parsed data stored in PostgreSQL in structured tables
- Admin can review and correct parsed results

## Job Matching

- AI-powered matching using Claude API
- Both sides can create job listings:
  - Agency uploads jobs on behalf of clients
  - Employers post jobs directly on the platform
- System analyzes job requirements and ranks candidates by fit score
- Considers: specialization match, experience level, technical background, location, bar admissions

## Monetization

- Per-profile unlock model
- Employers browse free (anonymized), pay to reveal individual candidate's full details
- Payment integration needed (Stripe or similar)

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js + TypeScript | Full-stack React, SSR, API routes |
| Database | PostgreSQL (Supabase or Neon) | Structured candidate data, full-text search, relational integrity |
| CV Parsing | Claude API | Handles messy PDF formats, extracts structured data reliably |
| Job Matching | Claude API | Semantic understanding of job requirements vs candidate profiles |
| Auth | Magic link (custom) | Per 01-magic-link-auth.md spec |
| Email | Resend | Magic links + notifications |
| Payments | Stripe | Per-profile unlock purchases |
| Hosting | Vercel | Natural fit for Next.js |
| File Storage | Supabase Storage or S3 | PDF CV storage |

## Constraints

- Single-tenant (one recruitment agency)
- Initial dataset: 95 PDF CVs of IP lawyers
- Must handle varied CV formats (different layouts, structures)
- Anonymization must be reliable — no name/contact leakage to free-tier users
- CV parsing accuracy is critical — garbage in = garbage out

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI/LLM for CV parsing (not OCR) | CVs have varied formats; AI handles unstructured data better than rule-based extraction | Claude API |
| AI-powered job matching | IP law specializations require semantic understanding, not just keyword matching | Claude API |
| Per-profile unlock (not subscription) | Lower barrier to entry for employers, pay only for candidates they're interested in | Stripe integration |
| Magic link auth (not password) | Simpler UX, fewer security concerns, specified in reference doc | Custom implementation |
| PostgreSQL (not MongoDB) | Structured candidate data with relational integrity, good full-text search | Supabase/Neon |
| Candidates can self-register | Grows the candidate pool beyond agency-uploaded CVs | Dual-entry system |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Magic link authentication with role-based routing (candidate vs employer)
- [ ] Admin dashboard for recruitment agency
- [ ] PDF CV upload and AI-powered parsing
- [ ] Structured candidate database with all IP lawyer data points
- [ ] Profile browsing with anonymization for free users
- [ ] Per-profile unlock with Stripe payments
- [ ] Candidate self-registration and profile management
- [ ] Job ad posting (by employers and agency)
- [ ] AI-powered candidate-job matching with fit scores
- [ ] Search and filter candidates by specialization, experience, location, etc.

### Out of Scope

- Multi-tenant (multiple agencies) — single agency only for v1
- Subscription billing — per-profile unlock only
- Mobile app — web only
- Video interviews or messaging between parties
- Automated outreach/email campaigns

---
*Last updated: 2026-02-19 after initialization*
