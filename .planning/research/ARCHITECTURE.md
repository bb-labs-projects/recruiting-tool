# Architecture Patterns

**Domain:** IP Lawyer Recruiting Platform (single-tenant, three user roles)
**Researched:** 2026-02-19
**Overall Confidence:** HIGH (Next.js App Router patterns verified against official docs v16.1.6; recruiting platform patterns well-established in training data; Claude API PDF handling based on known capabilities)

---

## System Overview

The platform is a **document-processing recruiting application** with three distinct concerns:

1. **Ingestion pipeline** -- PDF upload, AI parsing, structured data extraction
2. **Marketplace layer** -- Browse, search, match, with anonymization and payment gating
3. **Management layer** -- Admin dashboard, candidate self-service, employer workspace

These three concerns map cleanly to three architectural layers that share a common database and auth system.

```
                    +---------------------------+
                    |      Next.js Frontend      |
                    |  (App Router, SSR + RSC)   |
                    +---------------------------+
                    |  /admin  | /employer | /candidate
                    +----------+-----------+-----------+
                               |
                    +---------------------------+
                    |    Next.js API Routes      |
                    |   (Route Handlers in /api) |
                    +---------------------------+
                         |          |         |
              +----------+    +----+----+    +--------+
              |               |          |            |
     +--------v---+   +------v----+ +---v------+ +---v-------+
     | Auth       |   | CV Parse  | | Search & | | Payment   |
     | Service    |   | Pipeline  | | Match    | | Service   |
     | (magic     |   | (Claude   | | Engine   | | (Stripe)  |
     |  link)     |   |  API)     | |          | |           |
     +--------+---+   +------+----+ +---+------+ +---+-------+
              |               |          |            |
              +-------+-------+----+-----+------+-----+
                      |            |             |
                +-----v----+ +----v------+ +----v--------+
                | PostgreSQL | | File     | | Stripe      |
                | (Supabase/ | | Storage  | | (external)  |
                |  Neon)     | | (S3 or   | |             |
                +------------+ | Supabase)| +-------------+
                               +----------+
```

---

## Component Boundaries

### 1. Authentication & Authorization

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Magic link auth, session management, role-based access control |
| **Owns** | `users`, `magic_link_tokens`, `sessions` tables |
| **Communicates with** | Email service (Resend), database, middleware |
| **Boundary** | Auth is a cross-cutting concern enforced via Next.js middleware + server-side session checks |

**Key design decisions:**

- **Middleware-based route protection.** Next.js middleware at the edge checks session cookies and routes users to role-appropriate sections. Unauthenticated users see only public pages and the login flow.
- **Role stored on user record.** Three roles: `admin`, `employer`, `candidate`. Role determines which route group the user can access.
- **No Supabase Auth.** Custom magic link implementation per `01-magic-link-auth.md` spec. This avoids coupling to Supabase's auth layer and gives full control over the token lifecycle.

```
User types and their route access:

ADMIN      --> /admin/*      (full platform management)
EMPLOYER   --> /employer/*   (browse, search, unlock, post jobs)
CANDIDATE  --> /candidate/*  (profile management, job viewing)
PUBLIC     --> /             (landing, login, registration)
```

### 2. CV Ingestion Pipeline

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Accept PDF uploads, extract text via Claude API, parse into structured data, store results |
| **Owns** | `candidates`, `candidate_specializations`, `work_history`, `education`, `bar_admissions` tables; file storage bucket |
| **Communicates with** | Claude API, file storage, database |
| **Triggered by** | Admin bulk upload, candidate self-upload |
| **Boundary** | Isolated pipeline -- upload triggers async processing; results land in candidate tables |

**Pipeline stages:**

```
Stage 1: Upload
  PDF file --> validate (type, size) --> store in file storage --> create DB record with status="uploaded"

Stage 2: Extract (async)
  Read PDF from storage --> send to Claude API as base64 --> receive structured JSON response

Stage 3: Parse & Store
  Validate Claude response against schema --> write to normalized DB tables --> update status="parsed"

Stage 4: Review (human)
  Admin reviews parsed data in dashboard --> corrects errors --> marks status="reviewed"

Stage 5: Publish
  Admin approves profile --> status="active" --> visible to employers
```

**Why async processing matters:** Claude API calls for PDF parsing take 5-30 seconds per document. For the initial batch of 95 PDFs, this means the pipeline must be async. Two approaches, in order of recommendation:

1. **Background job via API route + polling (recommended for v1).** Upload endpoint returns immediately. A separate API route processes the queue. Frontend polls for status. Simple, works on Vercel with function timeout of 60s (enough for single-PDF processing).

2. **Queue-based with external worker (if needed later).** If processing volume grows or PDFs are complex, move to Inngest, Trigger.dev, or a similar serverless queue. Overkill for 95 PDFs but worth knowing the upgrade path.

**Claude API PDF handling approach:**

The Claude API supports PDF input through its messages API. The recommended approach is:

```typescript
// Send PDF as base64-encoded content to Claude
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64EncodedPdf,
        },
      },
      {
        type: "text",
        text: "Extract structured data from this CV..."
      }
    ]
  }]
});
```

**Confidence note:** Claude's PDF support via the `document` content block type is a HIGH confidence pattern. The exact field names should be verified against the Anthropic SDK at implementation time, as the API evolves. The structured extraction prompt will need iteration -- plan for prompt engineering as a discrete task.

### 3. Candidate Database & Profile Model

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Store structured candidate data, support search/filter, enforce anonymization rules |
| **Owns** | All candidate-related tables |
| **Communicates with** | Search engine, anonymization layer, admin dashboard |
| **Boundary** | Single source of truth for candidate data; all access goes through a data access layer that enforces anonymization |

**Data model (normalized PostgreSQL):**

```
users
  id            UUID PK
  email         VARCHAR UNIQUE
  role          ENUM('admin', 'employer', 'candidate')
  email_verified BOOLEAN
  created_at    TIMESTAMPTZ
  last_login_at TIMESTAMPTZ

candidates
  id                UUID PK
  user_id           UUID FK -> users (nullable, null for agency-uploaded)
  status            ENUM('uploaded', 'parsing', 'parsed', 'reviewed', 'active', 'inactive')
  -- Identifiable fields (gated behind payment)
  full_name         VARCHAR
  email             VARCHAR
  phone             VARCHAR
  -- Non-identifiable fields (always visible)
  location_city     VARCHAR
  location_state    VARCHAR
  location_country  VARCHAR
  years_experience  INTEGER
  summary           TEXT
  cv_file_path      VARCHAR
  parsed_at         TIMESTAMPTZ
  reviewed_at       TIMESTAMPTZ
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

candidate_specializations
  id              UUID PK
  candidate_id    UUID FK -> candidates
  specialization  ENUM('patent_prosecution', 'trademark', 'copyright',
                       'trade_secrets', 'ip_litigation', 'licensing', 'other')
  proficiency     ENUM('primary', 'secondary', 'familiar')

candidate_technical_background
  id              UUID PK
  candidate_id    UUID FK -> candidates
  domain          VARCHAR  -- 'biotech', 'software', 'pharma', 'mechanical', 'electrical', etc.
  has_patent_bar  BOOLEAN
  technical_degrees TEXT[]  -- array of degree descriptions

work_history
  id              UUID PK
  candidate_id    UUID FK -> candidates
  organization    VARCHAR
  title           VARCHAR
  start_date      DATE
  end_date        DATE (nullable = current)
  description     TEXT
  is_current      BOOLEAN
  sort_order      INTEGER

education
  id              UUID PK
  candidate_id    UUID FK -> candidates
  institution     VARCHAR
  degree          VARCHAR
  field           VARCHAR
  graduation_year INTEGER

bar_admissions
  id              UUID PK
  candidate_id    UUID FK -> candidates
  jurisdiction    VARCHAR
  year_admitted   INTEGER
  is_patent_bar   BOOLEAN
```

**Why this normalization:** IP lawyers have multi-valued attributes (multiple specializations, multiple bar admissions, multiple degrees). Normalizing these into separate tables enables precise filtering ("show me candidates with patent prosecution AND biotech background AND California bar admission") without JSON querying complexity.

### 4. Anonymization Layer

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Control what candidate data is visible based on employer's unlock status |
| **Owns** | `profile_unlocks` table |
| **Communicates with** | Candidate database, payment service |
| **Boundary** | Data access middleware -- sits between API routes and raw candidate data |

**Design: Server-side field filtering, not separate views.**

```
profile_unlocks
  id              UUID PK
  employer_id     UUID FK -> users
  candidate_id    UUID FK -> candidates
  stripe_payment_id VARCHAR
  unlocked_at     TIMESTAMPTZ
  amount_paid     INTEGER  -- cents

-- Query pattern:
-- SELECT candidate with fields based on unlock status
```

**Implementation approach:**

```typescript
// Data access function -- the ONLY way to fetch candidate data
function getCandidateProfile(candidateId: string, requestingUserId: string, userRole: string) {
  const candidate = await db.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);

  if (userRole === 'admin') {
    return candidate; // Full access
  }

  if (userRole === 'employer') {
    const unlock = await db.query(
      'SELECT id FROM profile_unlocks WHERE employer_id = $1 AND candidate_id = $2',
      [requestingUserId, candidateId]
    );

    if (unlock) {
      return candidate; // Full access (paid)
    }

    // Anonymized: strip identifiable fields
    return {
      ...candidate,
      full_name: null,
      email: null,
      phone: null,
    };
  }

  // Candidates can only see their own profile
  if (userRole === 'candidate' && candidate.user_id === requestingUserId) {
    return candidate;
  }

  throw new ForbiddenError();
}
```

**Critical rule:** Anonymization MUST be enforced server-side in the data access layer, never in the frontend. The API response itself must omit the fields, not just hide them in the UI. This prevents inspection of network responses from leaking data.

### 5. Search & Browse Engine

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Full-text search, faceted filtering, candidate browsing |
| **Owns** | Search indexes (PostgreSQL full-text search) |
| **Communicates with** | Candidate database, anonymization layer |
| **Boundary** | Query layer that sits on top of the candidate data model |

**Approach: PostgreSQL full-text search + structured filters.**

For v1 with ~100-1000 candidates, PostgreSQL's built-in capabilities are sufficient and avoid external dependencies:

```sql
-- GIN index for full-text search
ALTER TABLE candidates ADD COLUMN search_vector tsvector;
CREATE INDEX idx_candidates_search ON candidates USING GIN(search_vector);

-- Update search vector on insert/update (trigger or application-level)
UPDATE candidates SET search_vector =
  to_tsvector('english',
    coalesce(summary, '') || ' ' ||
    coalesce(location_city, '') || ' ' ||
    coalesce(location_state, '')
  );

-- Combined search: text + structured filters
SELECT c.* FROM candidates c
  JOIN candidate_specializations cs ON cs.candidate_id = c.id
  WHERE c.status = 'active'
    AND c.search_vector @@ plainto_tsquery('english', $1)  -- text search
    AND cs.specialization = 'patent_prosecution'             -- structured filter
    AND c.years_experience >= 5                              -- range filter
  ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', $1)) DESC;
```

**Upgrade path:** If the candidate pool grows to thousands or search requirements become complex (fuzzy matching, did-you-mean, semantic search), migrate to a dedicated search service (Typesense or Meilisearch are good self-hosted options; Algolia for managed). For now, PostgreSQL avoids the operational complexity and cost.

### 6. AI Job Matching Engine

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Match job requirements against candidate profiles, produce ranked fit scores |
| **Owns** | `jobs`, `job_matches` tables |
| **Communicates with** | Claude API, candidate database, job postings |
| **Triggered by** | Job creation/update, manual "run matching" action |
| **Boundary** | Async process that reads jobs and candidates, writes match scores |

**Data model:**

```
jobs
  id              UUID PK
  posted_by       UUID FK -> users (employer or admin)
  title           VARCHAR
  description     TEXT
  -- Structured requirements (for matching)
  required_specializations  TEXT[]
  required_experience_years INTEGER
  preferred_technical_domains TEXT[]
  required_bar_admissions   TEXT[]
  location_preference       VARCHAR
  remote_ok                 BOOLEAN
  status          ENUM('draft', 'active', 'closed')
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

job_matches
  id              UUID PK
  job_id          UUID FK -> jobs
  candidate_id    UUID FK -> candidates
  fit_score       DECIMAL(3,2)  -- 0.00 to 1.00
  reasoning       TEXT          -- AI-generated explanation
  matched_at      TIMESTAMPTZ
  -- Breakdown scores for transparency
  specialization_score   DECIMAL(3,2)
  experience_score       DECIMAL(3,2)
  technical_score        DECIMAL(3,2)
  location_score         DECIMAL(3,2)
```

**Matching approach -- hybrid (structured + AI):**

1. **Pre-filter with SQL** -- Eliminate obviously mismatched candidates using structured data (wrong specialization, insufficient experience). This reduces the candidate set sent to Claude.

2. **AI scoring with Claude** -- Send the remaining candidates' profiles and the job requirements to Claude for semantic matching. Claude evaluates nuanced fit (e.g., "patent prosecution experience in biotech" is a closer match to a pharma patent role than generic IP litigation).

3. **Batch efficiently** -- Send multiple candidate profiles in a single Claude API call (within token limits) rather than one-per-call. A single prompt with 10-20 candidate summaries is more cost-effective and faster.

```typescript
// Matching flow
async function matchJobToCandidates(jobId: string) {
  const job = await getJob(jobId);

  // Step 1: Pre-filter (SQL)
  const candidates = await db.query(`
    SELECT c.* FROM candidates c
    JOIN candidate_specializations cs ON cs.candidate_id = c.id
    WHERE c.status = 'active'
    AND cs.specialization = ANY($1)
    AND c.years_experience >= $2 - 2  -- slight flexibility
  `, [job.required_specializations, job.required_experience_years]);

  // Step 2: Batch AI scoring
  const batches = chunk(candidates, 15); // 15 per batch
  for (const batch of batches) {
    const scores = await claudeMatchScore(job, batch);
    await saveMatchScores(jobId, scores);
  }
}
```

### 7. Payment Service (Stripe Integration)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Process per-profile unlock payments |
| **Owns** | `profile_unlocks` table, Stripe webhook handling |
| **Communicates with** | Stripe API, anonymization layer, database |
| **Boundary** | Thin wrapper around Stripe -- create checkout/payment intent, handle webhook, update unlock status |

**Payment flow:**

```
Employer clicks "Unlock Profile" on anonymized candidate
  --> Frontend calls POST /api/payments/create-checkout
  --> API creates Stripe Checkout Session (or Payment Intent)
  --> Employer completes payment on Stripe-hosted page (or embedded)
  --> Stripe sends webhook to POST /api/webhooks/stripe
  --> Webhook handler verifies signature, creates profile_unlocks record
  --> Employer is redirected back, now sees full profile
```

**Use Stripe Checkout (not custom payment form) for v1.** Reasons:
- PCI compliance handled by Stripe
- Supports all payment methods automatically
- Less frontend code
- Can switch to embedded Stripe Elements later if needed

**Webhook reliability:** Stripe webhooks are the source of truth for payment completion. The webhook handler must be idempotent (handle duplicate deliveries) and verify the Stripe signature. Store the Stripe event ID to deduplicate.

### 8. Admin Dashboard

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Platform management for the recruitment agency |
| **Owns** | No unique tables; reads/writes across all tables |
| **Communicates with** | All other components |
| **Boundary** | UI + API routes scoped to admin role |

**Admin capabilities mapped to components:**

| Capability | Underlying Component |
|------------|---------------------|
| Bulk CV upload | CV Ingestion Pipeline |
| Review parsed profiles | Candidate Database (edit) |
| Manage candidate status | Candidate Database (status transitions) |
| Create/manage job listings | Job Matching Engine |
| View employer accounts | Auth + Users |
| View payment history | Payment Service |
| Platform analytics | Aggregation queries across all tables |

---

## Data Flow Diagrams

### Flow 1: CV Upload and Parsing (Admin)

```
Admin uploads 95 PDFs
    |
    v
POST /api/admin/candidates/upload (multipart form)
    |
    v
Validate file (PDF, <10MB) --> Store in file storage bucket
    |
    v
Create candidate record: status="uploaded"
    |
    v
Enqueue parsing job (or process inline if single file)
    |
    v
POST /api/admin/candidates/[id]/parse (or background trigger)
    |
    v
Read PDF from storage --> base64 encode
    |
    v
Send to Claude API with structured extraction prompt
    |
    v
Receive JSON response --> Validate against schema
    |
    v
Write to normalized tables:
  - candidates (core fields)
  - candidate_specializations (multi-valued)
  - candidate_technical_background
  - work_history (array)
  - education (array)
  - bar_admissions (array)
    |
    v
Update status="parsed"
    |
    v
Admin reviews in dashboard --> corrects errors --> status="reviewed" --> status="active"
```

### Flow 2: Candidate Self-Registration

```
Candidate visits /register
    |
    v
Enters email --> receives magic link
    |
    v
Clicks magic link --> session created, role="candidate"
    |
    v
Directed to /candidate/profile/create
    |
    v
Fills out basic info + uploads CV (PDF)
    |
    v
Same parsing pipeline as admin upload:
  PDF --> storage --> Claude API --> structured data
    |
    v
Candidate reviews parsed data, corrects errors
    |
    v
Submits profile --> status="parsed" (admin reviews before "active")
    |
    OR (if auto-approval is enabled)
    v
status="active" --> visible to employers
```

### Flow 3: Employer Browse, Search, and Unlock

```
Employer logs in via magic link
    |
    v
Lands on /employer/candidates (browse/search page)
    |
    v
GET /api/candidates?search=...&specialization=...&experience=...
    |
    v
Server queries PostgreSQL with filters + full-text search
    |
    v
Anonymization layer strips PII from each result
  (full_name, email, phone --> null)
    |
    v
Employer sees list of anonymized profiles with:
  - Specializations, experience, location, education summary
  - Technical background, bar admissions
  - NO name, NO email, NO phone
    |
    v
Employer clicks "Unlock Full Profile" on a candidate
    |
    v
POST /api/payments/create-checkout
  { candidateId, successUrl, cancelUrl }
    |
    v
Stripe Checkout Session created --> redirect to Stripe
    |
    v
Payment completes --> Stripe webhook fires
    |
    v
POST /api/webhooks/stripe
  Verify signature --> Create profile_unlocks record
    |
    v
Employer redirected to /employer/candidates/[id]
    |
    v
GET /api/candidates/[id]
  Anonymization layer checks profile_unlocks --> FOUND
  Returns full profile with name, email, phone
```

### Flow 4: Job Posting and AI Matching

```
Employer (or Admin) creates job listing
    |
    v
POST /api/jobs
  { title, description, requirements... }
    |
    v
Job stored in database, status="active"
    |
    v
Matching triggered (immediately or on-demand)
    |
    v
SQL pre-filter: candidates matching required specializations + minimum experience
    |
    v
Filtered candidates sent to Claude API in batches:
  "Given this job: {...}, rank these candidates: [{...}, {...}, ...]
   Return fit_score (0-1) and reasoning for each."
    |
    v
Match scores stored in job_matches table
    |
    v
Employer views /employer/jobs/[id]/matches
    |
    v
GET /api/jobs/[id]/matches
  Returns ranked candidates with fit scores
  (still anonymized unless unlocked)
```

---

## Next.js App Router Structure

Based on verified Next.js v16.x patterns (App Router with `params` as Promise, route handlers using Web Request/Response API):

```
src/
  app/
    (public)/                  # Public route group (no auth required)
      page.tsx                 # Landing page
      login/page.tsx           # Magic link request
      verify/page.tsx          # Magic link verification
      register/page.tsx        # Candidate/employer registration
    (authenticated)/           # Route group with auth layout
      admin/                   # Admin routes
        layout.tsx             # Admin sidebar layout
        page.tsx               # Admin dashboard
        candidates/
          page.tsx             # Candidate list (all statuses)
          upload/page.tsx      # Bulk upload interface
          [id]/page.tsx        # Candidate detail/edit
          [id]/parse/page.tsx  # Review parsed data
        jobs/
          page.tsx             # Job listings management
          [id]/page.tsx        # Job detail + matches
        employers/
          page.tsx             # Employer accounts list
        analytics/page.tsx     # Platform analytics
      employer/                # Employer routes
        layout.tsx             # Employer layout
        page.tsx               # Employer dashboard
        candidates/
          page.tsx             # Browse/search (anonymized)
          [id]/page.tsx        # Candidate profile (anon or full)
        jobs/
          page.tsx             # My job listings
          create/page.tsx      # Create job
          [id]/page.tsx        # Job detail + matches
        unlocked/page.tsx      # My unlocked profiles
      candidate/               # Candidate routes
        layout.tsx             # Candidate layout
        page.tsx               # Candidate dashboard
        profile/
          page.tsx             # View my profile
          edit/page.tsx        # Edit profile
        jobs/page.tsx          # Browse available jobs (future)
    api/
      auth/
        magic-link/
          request/route.ts     # POST: send magic link
          verify/route.ts      # POST: verify token
        logout/route.ts        # POST: logout
        me/route.ts            # GET: current user
      candidates/
        route.ts               # GET: search/browse (anonymized)
        [id]/route.ts          # GET: single candidate
      admin/
        candidates/
          upload/route.ts      # POST: upload CVs
          [id]/
            route.ts           # GET/PUT: manage candidate
            parse/route.ts     # POST: trigger/retry parsing
            status/route.ts    # PUT: update status
        employers/route.ts     # GET: list employers
      jobs/
        route.ts               # GET/POST: list and create jobs
        [id]/
          route.ts             # GET/PUT/DELETE: manage job
          matches/route.ts     # GET/POST: view/trigger matches
      payments/
        create-checkout/route.ts  # POST: create Stripe checkout
      webhooks/
        stripe/route.ts        # POST: Stripe webhook handler
  lib/
    db/
      prisma.ts               # Prisma client (or Drizzle)
      schema.prisma            # Database schema
    auth/
      session.ts              # Session management
      middleware.ts           # Auth middleware helpers
      magic-link.ts           # Token generation/verification
    candidates/
      data-access.ts          # Candidate queries WITH anonymization
      parse-cv.ts             # Claude API PDF parsing logic
      search.ts               # Search query builder
    jobs/
      data-access.ts          # Job queries
      matcher.ts              # AI matching logic
    payments/
      stripe.ts               # Stripe client + helpers
      webhooks.ts             # Webhook verification + handlers
    email/
      resend.ts               # Email client
      templates/              # Email templates
    types/
      index.ts                # Shared TypeScript types
    constants.ts              # App constants
  middleware.ts               # Next.js middleware (auth + routing)
  components/
    ui/                       # Shared UI components
    admin/                    # Admin-specific components
    employer/                 # Employer-specific components
    candidate/                # Candidate-specific components
```

**Route group rationale:** The `(public)` and `(authenticated)` groups share no layout nesting. The authenticated group's layout checks session validity and redirects to login if unauthenticated. Within authenticated, `admin/`, `employer/`, and `candidate/` each have their own layout with role-appropriate navigation.

---

## Middleware Strategy

Next.js middleware runs at the edge and handles routing decisions before page rendering:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  // Public routes - always accessible
  if (path === '/' || path.startsWith('/login') || path.startsWith('/verify')
      || path.startsWith('/register') || path.startsWith('/api/auth')
      || path.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  // No session -> redirect to login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based routing is handled in layouts (middleware can't query DB)
  // But we can set headers for downstream use
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Important limitation:** Next.js middleware runs at the edge and should NOT query the database directly (latency, cold starts). Role-based access checks happen in the page/layout server components or API route handlers, which run in Node.js.

---

## Database ORM Recommendation

**Recommendation: Prisma ORM** (with PostgreSQL on Supabase or Neon).

| Factor | Prisma | Drizzle |
|--------|--------|---------|
| Type safety | Excellent (generated types) | Excellent (schema types) |
| Migration management | Built-in (`prisma migrate`) | Built-in (`drizzle-kit`) |
| Ecosystem maturity | More mature, larger community | Newer, lighter weight |
| Learning curve | Lower (declarative schema) | Moderate (SQL-like API) |
| Performance | Good for this scale | Slightly better raw performance |
| Full-text search | Requires raw queries | Requires raw queries |

Either works well. Prisma is recommended for this project because:
- The team is building a greenfield app; Prisma's schema-first approach speeds up initial development
- Generated types prevent data shape mismatches between DB and TypeScript
- Migration management is straightforward for a single-tenant app
- For the full-text search queries, raw SQL via `prisma.$queryRaw` works fine

---

## Security Architecture

### Data Isolation Boundaries

```
PUBLIC (no auth):
  - Landing page
  - Login/register forms
  - Static content

AUTHENTICATED (session required):
  - ADMIN: full read/write on all data
  - EMPLOYER: read candidates (anonymized), write jobs, read own unlocks
  - CANDIDATE: read/write own profile only

API LEVEL (enforced in route handlers):
  - Every API route checks session + role
  - Candidate data ALWAYS flows through anonymization layer
  - No direct DB access from components; all through lib/ data access functions
```

### Anonymization Enforcement Points

1. **Database layer** -- Data access functions in `lib/candidates/data-access.ts` are the ONLY way to fetch candidate data. They accept `requestingUserId` and `role` parameters and strip PII accordingly.

2. **API layer** -- Route handlers call data access functions, never raw queries for candidate data.

3. **UI layer** -- Components receive already-anonymized data. Even if a bug in the UI tried to render `candidate.full_name`, it would be `null` because the server never sent it.

4. **Search results** -- The search endpoint returns anonymized results by default. Unlock status is checked per-result. This means the search response includes a `isUnlocked: boolean` field so the UI can show "Unlock" vs. the full name.

---

## External Service Integration Points

| Service | Purpose | Integration Pattern | Failure Mode |
|---------|---------|--------------------|----|
| **Claude API** | CV parsing, job matching | Server-side only, via Anthropic SDK | Retry with backoff; mark candidate as "parse_failed" |
| **Stripe** | Per-profile payments | Checkout Session + webhooks | Webhook retry (Stripe retries automatically); idempotent handler |
| **Resend** | Magic link emails, notifications | Server-side via Resend SDK | Retry once; log failure; user can request new link |
| **Supabase Storage / S3** | PDF file storage | Direct upload from API route | Return error; user retries upload |
| **Vercel** | Hosting, serverless functions | Deploy via git push | Standard Vercel reliability |

---

## Scalability Considerations

| Concern | At 100 candidates | At 1,000 candidates | At 10,000+ candidates |
|---------|-------------------|---------------------|-----------------------|
| **Search** | PostgreSQL FTS is fine | PostgreSQL FTS is fine | Consider dedicated search (Typesense) |
| **CV Parsing** | Process inline in API route | Background queue recommended | Dedicated queue service (Inngest) |
| **Job Matching** | Batch all candidates to Claude | Pre-filter + batch (15/batch) | Pre-filter aggressively; cache scores |
| **File Storage** | Supabase Storage / S3 | Same | Same (object storage scales linearly) |
| **Database** | Single Postgres, no replicas | Single Postgres, add indexes | Consider read replica for search |
| **API Costs (Claude)** | ~$5-10 for initial parse | ~$50-100 per bulk parse | Significant; cache aggressively |

**The platform is designed for the ~100-1000 candidate range.** The architecture supports growing to 10K+ with incremental changes (add search service, add queue), not rewrites.

---

## Build Order (Dependency Graph)

Components have dependencies that dictate build order. Here is the critical path:

```
Phase 1: Foundation (no dependencies)
  [1] Database schema + Prisma setup
  [2] Auth system (magic link)
  [3] Basic project scaffolding (layouts, middleware, route groups)

Phase 2: Core Pipeline (depends on Phase 1)
  [4] File storage setup
  [5] CV upload endpoint (depends on [1], [4])
  [6] Claude API parsing integration (depends on [5])
  [7] Candidate data model + CRUD (depends on [1], [6])
  [8] Admin dashboard - candidate management (depends on [7])

Phase 3: Marketplace (depends on Phase 2)
  [9] Anonymization layer (depends on [7])
  [10] Search/browse with filters (depends on [7], [9])
  [11] Employer browse experience (depends on [9], [10])

Phase 4: Monetization (depends on Phase 3)
  [12] Stripe integration (depends on [9])
  [13] Profile unlock flow (depends on [11], [12])
  [14] Payment webhook handling (depends on [12])

Phase 5: Intelligence (depends on Phase 2)
  [15] Job posting CRUD (depends on [1])
  [16] AI matching engine (depends on [7], [15])
  [17] Match results UI (depends on [16], [9])

Phase 6: Polish (depends on all above)
  [18] Candidate self-registration flow (depends on [2], [6])
  [19] Admin analytics dashboard (depends on all data)
  [20] Email notifications (depends on all flows)
```

**Key dependency insight:** The CV parsing pipeline (Phase 2) is the critical bottleneck. Everything downstream -- search, anonymization, matching, payments -- depends on having structured candidate data in the database. Build the pipeline first and load the initial 95 CVs before building the employer-facing features. This also serves as the best early validation: if CV parsing quality is poor, the entire product is compromised.

**Parallelization opportunities:**
- [15] Job posting CRUD can be built in parallel with Phase 3 (marketplace) since it only depends on Phase 1
- [18] Candidate self-registration reuses the parsing pipeline and auth, so it can slot in whenever those are stable
- UI work for employer/admin dashboards can proceed with mock data while the API layer is being built

---

## Anti-Patterns to Avoid

### 1. Client-side Anonymization

**What:** Sending full candidate data to the browser and hiding fields with CSS/JS.
**Why bad:** Any user with browser dev tools can see the full data. This is a data breach.
**Instead:** Strip PII server-side. The anonymized response literally does not contain the data.

### 2. Synchronous CV Parsing

**What:** Making the user wait while Claude API processes a PDF (5-30 seconds).
**Why bad:** HTTP timeout, terrible UX, blocks the upload of additional files.
**Instead:** Upload returns immediately with status="uploaded". Parsing happens asynchronously. Frontend polls for status updates.

### 3. Monolithic Claude Prompts

**What:** One giant prompt that extracts all CV data in a single unstructured response.
**Why bad:** Hard to validate, hard to retry partially, inconsistent output structure.
**Instead:** Use structured output (JSON mode) with a well-defined schema. Validate the response against a TypeScript/Zod schema before storing.

### 4. No Parsing Review Step

**What:** Auto-publishing parsed CVs without human review.
**Why bad:** AI parsing is good but not perfect. Incorrect data (wrong specialization, wrong experience level) leads to bad matches and erodes trust.
**Instead:** Parsed profiles go to "parsed" status. Admin reviews and corrects before setting "active." For candidate self-uploads, the candidate reviews their own parsed data.

### 5. Payment Before Webhook

**What:** Unlocking profiles based on client-side payment confirmation (redirect URL) instead of webhook.
**Why bad:** Users can manipulate the redirect URL. Payment may not have actually completed.
**Instead:** Only create `profile_unlocks` records in the webhook handler after verifying the Stripe signature. The redirect URL shows a "processing" state until the webhook confirms.

### 6. Flat Candidate Table

**What:** Storing all candidate data in a single table with JSON columns for multi-valued fields.
**Why bad:** Cannot efficiently filter by specialization, bar admission, or technical domain. JSON queries in PostgreSQL are slower and harder to index.
**Instead:** Normalize multi-valued attributes into separate tables with proper indexes and foreign keys.

---

## Technology-Specific Patterns

### Next.js Server Components for Data Fetching

Use React Server Components (RSC) for pages that display candidate data. This keeps data fetching server-side and prevents accidental data leakage to the client:

```typescript
// app/(authenticated)/employer/candidates/page.tsx
// This is a Server Component by default in App Router
export default async function CandidatesPage() {
  const session = await getSession(); // server-side session check
  const candidates = await searchCandidates({
    requestingUserId: session.userId,
    role: session.role,
    // ... search params
  });

  // candidates is already anonymized by the data access layer
  return <CandidateList candidates={candidates} />;
}
```

### API Route Pattern for Mutations

Use Route Handlers for mutations (uploads, payments, status changes):

```typescript
// app/api/admin/candidates/[id]/status/route.ts
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json();
  // ... update candidate status
}
```

### Zod for Input Validation

Every API route should validate input with Zod before processing:

```typescript
import { z } from 'zod';

const uploadSchema = z.object({
  files: z.array(z.instanceof(File)).min(1).max(50),
});

const searchSchema = z.object({
  query: z.string().optional(),
  specialization: z.enum(['patent_prosecution', 'trademark', ...]).optional(),
  minExperience: z.number().min(0).max(50).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});
```

---

## Sources and Confidence

| Claim | Confidence | Source |
|-------|------------|--------|
| Next.js App Router patterns (route handlers, params as Promise, middleware) | HIGH | Verified against official docs v16.1.6 (2026-02-16) |
| Claude API PDF support via document content blocks | HIGH | Known from training data + consistent with Anthropic API patterns. Verify exact SDK method signatures at implementation time. |
| PostgreSQL full-text search with GIN indexes | HIGH | Well-established PostgreSQL feature, stable for years |
| Stripe Checkout + webhook pattern | HIGH | Standard Stripe integration pattern, well-documented |
| Prisma ORM recommendation | MEDIUM | Based on ecosystem knowledge; verify current Prisma version compatibility with chosen PostgreSQL host at implementation time |
| Recruiting platform component structure | HIGH | Well-established domain pattern from training data; verified against PROJECT.md requirements |
| Anonymization as server-side field filtering | HIGH | Standard security pattern; reinforced by PROJECT.md constraint on reliable anonymization |

---

## Open Questions for Implementation

1. **Supabase vs Neon for PostgreSQL hosting** -- Both work. Supabase offers integrated Storage (avoiding separate S3 setup). Neon offers better serverless scaling. Decision depends on whether bundled file storage is valued.

2. **PDF extraction quality** -- The Claude API extraction prompt will need iteration. Plan for a prompt engineering phase with the initial 95 CVs as test data. Budget 2-3 iterations of prompt refinement.

3. **Batch upload UX** -- For 95 initial CVs, does the admin upload all at once or in batches? Vercel serverless function timeout (60s default, up to 300s on Pro) may limit batch size per request. Recommend chunking: upload files in batches of 10, process each individually.

4. **Profile unlock pricing** -- Per-profile unlock price is a business decision, not architectural. But the schema should support variable pricing (the `amount_paid` field on `profile_unlocks` handles this).

5. **Match score freshness** -- When a candidate profile is updated, do existing match scores become stale? Recommend: flag stale matches and re-run matching on demand rather than automatically.
