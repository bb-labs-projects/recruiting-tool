# Technology Stack

**Project:** IP Lawyer Recruiting Platform
**Researched:** 2026-02-19
**Overall confidence:** MEDIUM-HIGH (versions based on training data through May 2025; verify with `npm view <pkg> version` before installing)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | ^15.1 | Full-stack React framework | App Router with Server Components, Server Actions, API routes, built-in image optimization, seamless Vercel deployment. The de facto standard for production React apps in 2025. | HIGH |
| React | ^19.0 | UI library | Ships with Next.js 15. React 19 brings Server Components as stable, `use()` hook, Actions, and improved Suspense -- all beneficial for this data-heavy app. | HIGH |
| TypeScript | ^5.7 | Type safety | Non-negotiable for a production app with structured data models (candidates, jobs, payments). Catches CV parsing schema mismatches at compile time. | HIGH |

**Why Next.js over alternatives:**
- **vs. Remix**: Next.js has deeper Vercel integration, larger ecosystem, more hiring pool. Remix is excellent but unnecessary for this use case.
- **vs. SvelteKit**: Smaller ecosystem, fewer component libraries, harder to hire for. Good framework, wrong context.
- **vs. plain Express + React SPA**: Loses SSR, Server Components, and all the DX wins. Would require building what Next.js gives for free.

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Neon | (managed) | PostgreSQL hosting | Serverless Postgres with branching, auto-scaling to zero, generous free tier. Better fit than Supabase for this project (see rationale below). | HIGH |
| Drizzle ORM | ^0.38 | Database ORM | Type-safe SQL-like syntax, excellent PostgreSQL support, lightweight, works perfectly with Neon's serverless driver. Generates clean migrations. | HIGH |
| drizzle-kit | ^0.30 | Migration tooling | Companion CLI for Drizzle: generates migrations from schema, pushes schema changes, has studio for DB browsing. | HIGH |
| @neondatabase/serverless | ^0.10 | Neon connection driver | WebSocket-based Postgres driver optimized for serverless/edge. Required for Neon + Vercel edge functions. | MEDIUM (verify version) |

**Why Neon over Supabase:**
- This project needs Postgres as a database, not Postgres as a platform. Supabase bundles auth, storage, realtime -- we are building custom auth (magic links), custom storage handling (Claude-parsed PDFs), and do not need realtime.
- Neon is pure Postgres: simpler mental model, no fighting Supabase's opinions about how auth/storage should work.
- Neon's serverless driver is purpose-built for Vercel edge functions.
- Neon's database branching is excellent for preview deployments (each Vercel preview can get its own DB branch).
- If you later need Supabase Storage for PDFs, you can use Supabase Storage independently without using Supabase as your primary database.

**Why Drizzle over Prisma:**
- Drizzle generates standard SQL migrations (Prisma uses its own format).
- Drizzle's query API feels like writing SQL -- better for complex queries like candidate search with multiple filters.
- Drizzle is lighter weight: no binary engine, no Rust compilation step, faster cold starts on Vercel.
- Drizzle works natively with Neon's serverless driver. Prisma requires an adapter.
- Prisma is mature and has a larger ecosystem, but for a greenfield project in 2025, Drizzle is the better choice for serverless deployments.

### AI / LLM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | ^0.39 | Claude API client | Official TypeScript SDK for Claude. Handles CV parsing (PDF-to-structured-data) and job matching (semantic candidate ranking). | MEDIUM (verify version) |

**Claude API usage in this project (two distinct uses):**

1. **CV Parsing** -- Send PDF content to Claude, receive structured JSON with candidate data (name, specializations, experience, etc.). Use structured outputs / tool_use to enforce schema compliance.
2. **Job Matching** -- Send job requirements + candidate pool data to Claude, receive ranked list with fit scores and explanations.

**Why Claude over alternatives:**
- **vs. OpenAI GPT-4**: Claude has superior performance on long-document understanding (important for multi-page CVs) and is generally better at following complex extraction schemas. Both would work; Claude is the project's explicit choice.
- **vs. custom NLP/NER pipeline**: Massively more complex to build, worse at handling varied CV formats, and worse at semantic understanding of IP law specializations. LLMs are the right tool here.
- **vs. dedicated CV parsing APIs (Sovren/Textkernel/Affinda)**: These are rule-based and trained on generic CVs. They will miss IP-law-specific fields (patent bar status, technology domains, prosecution vs. litigation experience). Claude can be prompted to extract domain-specific fields.

**PDF text extraction (pre-Claude):**

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pdf-parse | ^1.1.1 | Extract text from PDF | Lightweight, zero-dependency PDF text extraction. Feed the extracted text to Claude for structured parsing. | MEDIUM |

**Note:** If CVs contain scanned images (not text-based PDFs), you will need OCR. Claude's vision capabilities can handle this -- send the PDF pages as images. For text-based PDFs (the likely majority), `pdf-parse` extracts text cheaply before sending to Claude, saving API costs vs. sending full PDFs as images.

**Alternative approach:** Claude can accept PDF files directly via the API (base64-encoded). This may be simpler than pre-extracting text, especially for CVs with complex formatting. Test both approaches with your actual CV samples:
- **Approach A:** `pdf-parse` extracts text -> send text to Claude (cheaper, faster)
- **Approach B:** Send PDF as file/images directly to Claude (handles formatting/tables better, more expensive)

Recommendation: Start with Approach B (direct PDF) for accuracy, optimize to Approach A later if cost becomes a concern with only 95 CVs.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom magic link | N/A | Passwordless auth | Per PROJECT.md and 01-magic-link-auth.md spec. Custom implementation using crypto tokens, session cookies, rate limiting. | HIGH |

**Why custom over auth libraries:**
- The project spec explicitly calls for custom magic link auth.
- NextAuth.js / Auth.js v5 could provide magic link auth, but adds abstraction layers and opinions about session management that may conflict with the detailed spec in 01-magic-link-auth.md.
- The magic link flow is simple enough that a custom implementation is lower risk than fighting a library's assumptions.
- Total implementation: ~4-6 files, well-scoped, fully under your control.

**Supporting libraries for auth implementation:**

| Library | Purpose | Why |
|---------|---------|-----|
| Node.js `crypto` (built-in) | Token generation + hashing | SHA-256 hashing, `randomBytes` for tokens. No external dependency needed. |
| `jose` or built-in `crypto` | JWT (if needed for sessions) | Lightweight JWT library. But per spec, database sessions with HTTP-only cookies may be simpler than JWT. |

**Recommendation:** Use database-backed sessions (not JWT). Per the spec, sessions are stored in a `sessions` table. This is simpler, more secure (revocable), and avoids JWT pitfalls.

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | ^4.1 | Transactional email | Magic link delivery + notifications. Excellent DX, React Email integration for templates, generous free tier (100 emails/day). Built by the Vercel ecosystem community. | MEDIUM (verify version) |
| @react-email/components | ^0.0.31 | Email templates | Build email templates as React components. Type-safe, previewable, consistent styling. | MEDIUM (verify version) |

**Why Resend over alternatives:**
- **vs. SendGrid**: SendGrid works but has worse DX, more complex API, and the React Email integration is not native.
- **vs. AWS SES**: Cheapest at scale but requires AWS infrastructure setup. Overkill for this project's volume.
- **vs. Postmark**: Excellent deliverability but more expensive and no React Email integration.

### Payments

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| stripe | ^17.4 | Payment processing | Per-profile unlock purchases. Stripe Checkout for payment flow, webhooks for fulfillment. Industry standard, excellent docs. | MEDIUM (verify version) |

**Payment architecture for per-profile unlocks:**

The per-profile unlock model maps to **Stripe Checkout Sessions** (not subscriptions):
1. Employer clicks "Unlock Profile" on a candidate
2. Create a Stripe Checkout Session with a one-time price for that profile
3. Redirect to Stripe Checkout (or use embedded checkout)
4. On successful payment (webhook), record the unlock in your database
5. Employer can now see full profile details

**Key Stripe concepts needed:**
- `checkout.sessions.create` -- one-time payments
- `webhooks` -- `checkout.session.completed` event for fulfillment
- `metadata` -- Store `candidateId` and `employerId` in checkout session metadata for fulfillment
- **No need for:** Stripe Subscriptions, Stripe Connect, Stripe Billing

**Alternative pattern -- Stripe Payment Links:**
For an even simpler MVP, create a Payment Link per price point (e.g., "$50 per profile unlock") and append metadata via URL params. This avoids server-side Checkout Session creation entirely. However, it is less flexible for future pricing changes.

**Recommendation:** Use Stripe Checkout Sessions. It is the standard approach, well-documented, and gives you full control over metadata and fulfillment.

### File Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel Blob | ^0.27 | PDF CV storage | Simple blob storage integrated with Vercel. Upload PDFs, get URLs, serve files. No AWS/S3 setup needed. | MEDIUM (verify version) |

**Why Vercel Blob over alternatives:**
- **vs. AWS S3**: S3 is the gold standard but requires AWS credentials, IAM policies, CORS config. Vercel Blob is zero-config for Vercel deployments.
- **vs. Supabase Storage**: Good option if you were using Supabase as primary DB. Since we chose Neon, adding Supabase just for storage adds unnecessary complexity.
- **vs. Uploadthing**: Community-built, works well, but Vercel Blob is first-party and simpler.
- **vs. Cloudflare R2**: Excellent and cheap but requires Cloudflare account setup.

**Fallback:** If Vercel Blob has limitations (pricing, file size), swap to S3 with `@aws-sdk/client-s3`. The abstraction layer should make storage swappable.

### UI / Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.0 | Utility-first CSS | Tailwind v4 shipped in early 2025 with CSS-first config, faster builds, and simplified setup. Standard choice for Next.js projects. | HIGH |
| shadcn/ui | (copy-paste) | Component library | Not an npm package -- copy-paste components built on Radix UI + Tailwind. Full control, no version lock-in, accessible by default. Ideal for a dashboard-heavy app. | HIGH |
| Radix UI | (via shadcn) | Accessible primitives | Headless, accessible UI primitives. Comes with shadcn/ui components. Handles complex components (modals, dropdowns, tabs) correctly. | HIGH |
| lucide-react | ^0.469 | Icons | Clean, consistent icon set. Ships with shadcn/ui. | MEDIUM (verify version) |

**Why shadcn/ui over alternatives:**
- **vs. Material UI**: Heavier, opinionated styling, harder to customize. Enterprise-feeling but not modern.
- **vs. Chakra UI**: Good but less popular in 2025, components feel dated.
- **vs. Ant Design**: Chinese enterprise UI. Wrong aesthetic for a legal recruiting platform.
- **vs. Mantine**: Solid alternative. Less ecosystem momentum than shadcn/ui.
- **vs. building from scratch**: Unnecessary for a CRUD-heavy platform. shadcn/ui gives you the 80% and you customize the 20%.

### Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| zod | ^3.24 | Schema validation | Runtime validation for API inputs, form data, Claude API responses, Stripe webhook payloads. Integrates with Drizzle, React Hook Form, and Next.js Server Actions. | HIGH |

**Zod is critical in this project for:**
1. **CV parsing output validation**: Claude returns JSON; Zod validates it matches your expected schema before DB insertion.
2. **API route input validation**: Validate search filters, payment requests, profile updates.
3. **Form validation**: Client-side and server-side validation with the same schema.
4. **Drizzle schema inference**: Drizzle can generate Zod schemas from your database schema.

### Search

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL full-text search | (built-in) | Candidate search | `tsvector`/`tsquery` for text search across candidate profiles. No additional infrastructure needed. Handles the initial 95-candidate dataset easily. | HIGH |

**Why Postgres FTS over dedicated search:**
- **vs. Elasticsearch/OpenSearch**: Massive overkill for <1000 candidates. Requires separate infrastructure, indexing pipeline, and operational overhead.
- **vs. Algolia**: Excellent search-as-a-service but expensive and unnecessary for this data volume.
- **vs. Meilisearch/Typesense**: Good lightweight options if Postgres FTS proves insufficient. Keep as upgrade path.
- **vs. pg_trgm (trigram matching)**: Use this alongside `tsvector` for fuzzy matching on names and firm names. Built into Postgres, just enable the extension.

**Search strategy:**
1. Structured filters (dropdowns): Specialization, location, years of experience -- simple `WHERE` clauses
2. Full-text search: `tsvector` on combined text fields (bio, work history, skills)
3. Trigram matching: `pg_trgm` for fuzzy name/firm search
4. AI-powered matching: Claude API for semantic job-candidate matching (separate from search)

### Development Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.0 | Linting | Flat config (eslint.config.js) is standard in v9. Next.js 15 ships with ESLint 9 support. | HIGH |
| Prettier | ^3.4 | Code formatting | Consistent formatting. Configure once, forget. | HIGH |
| drizzle-kit | ^0.30 | DB migrations | Schema push and migration generation for Drizzle ORM. | HIGH |

### Testing (Defer to Phase 2+)

| Technology | Version | Purpose | When | Confidence |
|------------|---------|---------|------|------------|
| Vitest | ^2.1 | Unit/integration tests | After core features work. Test CV parsing schemas, payment logic, auth flows. | HIGH |
| Playwright | ^1.49 | E2E tests | After UI is stable. Test critical paths: login, search, unlock, payment. | HIGH |

---

## Complete Installation Commands

**IMPORTANT:** Verify all versions are current before running. Run `npm view <package> version` for each to get the true latest.

```bash
# Initialize Next.js project with TypeScript, Tailwind CSS, ESLint, App Router
npx create-next-app@latest recruiting-tool --typescript --tailwind --eslint --app --src-dir --use-npm

# Core dependencies
npm install @anthropic-ai/sdk stripe resend @react-email/components zod drizzle-orm @neondatabase/serverless @vercel/blob lucide-react

# Dev dependencies
npm install -D drizzle-kit prettier

# shadcn/ui initialization (after project setup)
npx shadcn@latest init
# Then add components as needed:
npx shadcn@latest add button card input table dialog badge tabs sheet dropdown-menu
```

---

## Alternatives Considered (Decision Log)

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Framework | Next.js 15 | Remix, SvelteKit | Smaller ecosystem, less Vercel integration |
| Database host | Neon | Supabase | Supabase bundles unwanted opinions (auth, storage); Neon is pure Postgres |
| ORM | Drizzle | Prisma | Prisma has heavier runtime, binary engine, worse serverless cold starts |
| Auth | Custom magic link | Auth.js v5 | Project spec requires custom implementation; Auth.js adds abstraction we would fight |
| Email | Resend | SendGrid, SES | Resend has best DX, React Email integration, right-sized for this volume |
| Payments | Stripe Checkout | PayPal, LemonSqueezy | Stripe is industry standard for per-item purchases; best docs and webhooks |
| File storage | Vercel Blob | S3, Supabase Storage | Zero-config with Vercel; can swap to S3 later if needed |
| UI components | shadcn/ui | Material UI, Chakra | Copy-paste model gives full control; Radix primitives are accessible |
| Search | Postgres FTS + pg_trgm | Elasticsearch, Algolia | Overkill for <1000 candidates; Postgres built-in is sufficient |
| CSS | Tailwind v4 | CSS Modules, styled-components | Tailwind is standard for Next.js; v4 has improved DX |
| Validation | Zod | Yup, Joi, Valibot | Zod is TypeScript-native, integrates with everything in this stack |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **NextAuth.js / Auth.js** | Project has a detailed custom magic link spec. Auth.js would add abstraction that conflicts with the spec's session management, token handling, and rate limiting requirements. |
| **Prisma** | Binary engine causes slow serverless cold starts. Migration format is proprietary. Drizzle is lighter and more SQL-native. |
| **Supabase Auth** | We are building custom auth. Supabase Auth would be a second auth system to maintain. |
| **Supabase (as primary DB)** | Adds platform opinions we do not need. Neon gives us pure Postgres. |
| **MongoDB** | Relational data (candidates, jobs, unlocks, sessions) demands PostgreSQL. MongoDB would require denormalization gymnastics. |
| **tRPC** | Adds complexity for no gain. Next.js Server Actions + API routes cover all use cases. tRPC shines in monorepo/multi-client setups, not single Next.js apps. |
| **GraphQL** | Same as tRPC -- adds complexity for no gain. REST-style API routes and Server Actions are sufficient. |
| **Redis** | Not needed initially. Rate limiting can use in-memory store or Postgres for the expected traffic. If you need Redis later, Upstash Redis (serverless) is the Vercel-friendly option. |
| **Elasticsearch / Algolia** | With 95 candidates, Postgres full-text search is more than sufficient. Revisit only if dataset grows to 10,000+. |
| **Docker** | Vercel handles deployment. Docker adds complexity with zero benefit for this stack. |
| **Turborepo / monorepo** | Single app, single team. Monorepo tooling is unnecessary overhead. |

---

## Architecture Notes for Stack

### Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..."          # Neon connection string

# AI
ANTHROPIC_API_KEY="sk-ant-..."           # Claude API key

# Auth
APP_URL="https://yourdomain.com"         # Base URL for magic links
MAGIC_LINK_EXPIRY_MINUTES=10
SESSION_EXPIRY_DAYS=7

# Email
RESEND_API_KEY="re_..."                  # Resend API key
EMAIL_FROM="noreply@yourdomain.com"

# Payments
STRIPE_SECRET_KEY="sk_..."              # Stripe secret key
STRIPE_PUBLISHABLE_KEY="pk_..."         # Stripe publishable key
STRIPE_WEBHOOK_SECRET="whsec_..."       # Stripe webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..." # Client-side Stripe key

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..." # Vercel Blob token
```

### Cost Estimates (Monthly, at MVP Scale)

| Service | Free Tier | Estimated Cost | Notes |
|---------|-----------|----------------|-------|
| Vercel | Hobby (free) | $0 | Sufficient for MVP; Pro at $20/mo if needed |
| Neon | Free tier (0.5 GB) | $0 | 95 candidates fits easily; paid starts at $19/mo |
| Claude API | Pay-per-use | ~$5-15/mo | 95 CV parses + occasional matching. Depends on model used. |
| Resend | 100 emails/day free | $0 | Magic links + notifications well within free tier |
| Stripe | 2.9% + $0.30/txn | Per transaction | No monthly fee; costs scale with revenue |
| Vercel Blob | Free tier included | $0 | 95 PDFs is negligible storage |
| **Total MVP** | | **~$5-15/mo** | Almost entirely Claude API costs |

---

## Version Verification Note

**IMPORTANT:** All version numbers in this document are based on training data current through May 2025. Before running `npm install`, verify current versions:

```bash
# Run these to get true latest versions
npm view next version
npm view @anthropic-ai/sdk version
npm view stripe version
npm view drizzle-orm version
npm view drizzle-kit version
npm view resend version
npm view @neondatabase/serverless version
npm view zod version
npm view tailwindcss version
npm view @vercel/blob version
npm view lucide-react version
npm view typescript version
```

Versions marked MEDIUM confidence are most likely to have changed. The major version choices (Next.js 15, React 19, Tailwind 4, Drizzle, Zod 3) are stable and correct.

---

## Sources

- PROJECT.md and 01-magic-link-auth.md from this repository (read directly)
- Training data through May 2025 for library versions and ecosystem knowledge
- **Gaps:** Could not verify exact current versions via npm registry or official docs due to tool restrictions. All version numbers should be verified before installation.
