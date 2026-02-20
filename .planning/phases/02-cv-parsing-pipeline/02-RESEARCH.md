# Phase 2: CV Parsing Pipeline - Research

**Researched:** 2026-02-20
**Domain:** PDF parsing via Claude API, file storage, async processing, database schema design
**Confidence:** HIGH

## Summary

This phase builds the core CV parsing pipeline: admin uploads PDF CVs to Vercel Blob, the system sends them to Claude API for structured data extraction (with per-field confidence scoring), and stores the normalized results in PostgreSQL via Drizzle ORM. Batch uploads of up to 95 CVs require async processing with status polling.

The standard approach is: use `@vercel/blob` client uploads (since PDFs can exceed the 4.5 MB server upload limit), send PDFs as base64 `document` content blocks to Claude's Messages API with structured output (`output_config.format` + Zod schema via `zodOutputFormat()`), and process batch uploads sequentially via individual API route calls with database-tracked status and client polling.

**Primary recommendation:** Use Claude Haiku 4.5 for CV parsing (best cost/performance ratio for structured extraction), base64 PDF document blocks, Zod-validated structured outputs via `output_config.format`, Vercel Blob client uploads, and database-driven job status polling from the frontend.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.77.0 | Claude API client for PDF parsing | Official TypeScript SDK, native PDF support via `document` content blocks, built-in Zod integration via `zodOutputFormat()` |
| @vercel/blob | latest | PDF file storage | Native Vercel integration, client upload support for >4.5 MB files, private blob URLs, CDN delivery |
| zod | ^4.3.6 (already installed) | Schema validation for Claude output | Already in stack; SDK's `zodOutputFormat()` converts Zod schemas to JSON Schema for structured outputs |
| drizzle-orm | ^0.45.1 (already installed) | Database ORM for profile tables | Already in stack; supports normalized schema with relations v2 API |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | The existing stack covers all requirements |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Haiku 4.5 | Claude Sonnet 4.5 | Sonnet is 3x more expensive ($3/$15 vs $1/$5 per MTok) but higher accuracy. Start with Haiku, upgrade if accuracy insufficient |
| Base64 PDF upload | Anthropic Files API | Files API avoids re-encoding but requires beta header (`files-api-2025-04-14`), adds upload step. Base64 is simpler for one-shot parsing |
| Client polling | Server-Sent Events | SSE is more responsive but adds complexity. Polling every 2-3 seconds is sufficient for batch CV processing |
| Individual API calls | Claude Batch API | Batch API gives 50% discount but is async (up to 24h). Not suitable for interactive 30-second single CV parsing target |

**Installation:**
```bash
npm install @anthropic-ai/sdk @vercel/blob
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   └── schema.ts           # Extended with profile tables
│   ├── cv-parser/
│   │   ├── prompt.ts           # System prompt for CV extraction
│   │   ├── schema.ts           # Zod schemas for parsed CV data + confidence
│   │   └── parse.ts            # Claude API call + validation logic
│   └── blob/
│       └── upload.ts           # Vercel Blob upload helpers
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── cv/
│   │   │   │   ├── upload/route.ts      # Client upload handler (handleUpload)
│   │   │   │   ├── parse/route.ts       # Trigger parsing for uploaded CV
│   │   │   │   ├── parse/[id]/route.ts  # Get parse status for a single CV
│   │   │   │   └── batch/route.ts       # Trigger batch parsing
│   │   │   └── status/route.ts          # Batch status polling endpoint
│   └── admin/
│       └── cv-upload/
│           └── page.tsx                  # Upload UI with progress tracking
```

### Pattern 1: PDF to Claude API via Base64 Document Block
**What:** Send PDF directly to Claude as a `document` content block with base64 encoding
**When to use:** Every CV parse operation
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const anthropic = new Anthropic()

// Fetch PDF from Vercel Blob and convert to base64
const pdfResponse = await fetch(blobUrl)
const arrayBuffer = await pdfResponse.arrayBuffer()
const pdfBase64 = Buffer.from(arrayBuffer).toString('base64')

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64
        }
      },
      {
        type: 'text',
        text: CV_EXTRACTION_PROMPT
      }
    ]
  }],
  output_config: {
    format: zodOutputFormat(CvParsedDataSchema)
  }
})
```

### Pattern 2: Structured Output with Confidence Scoring via Zod
**What:** Use Claude's native structured outputs with `output_config.format` and `zodOutputFormat()` to guarantee valid JSON matching the Zod schema. Embed confidence scoring directly in the schema.
**When to use:** Every Claude API call for CV extraction
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/structured-outputs
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const ConfidenceLevel = z.enum(['high', 'medium', 'low'])

const FieldWithConfidence = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: ConfidenceLevel,
  })

const CvParsedDataSchema = z.object({
  name: FieldWithConfidence(z.string()),
  email: FieldWithConfidence(z.string()),
  phone: FieldWithConfidence(z.string()),
  specializations: FieldWithConfidence(z.array(z.string())),
  education: FieldWithConfidence(z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    year: z.string(),
  }))),
  technicalBackground: FieldWithConfidence(z.array(z.string())),
  barAdmissions: FieldWithConfidence(z.array(z.object({
    jurisdiction: z.string(),
    year: z.string(),
    status: z.string(),
  }))),
  workHistory: FieldWithConfidence(z.array(z.object({
    employer: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string(),
  }))),
})

// Use with output_config.format (GA, no beta header needed)
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [...],
  output_config: {
    format: zodOutputFormat(CvParsedDataSchema)
  }
})

// response.content[0].text is guaranteed valid JSON matching schema
const parsed = CvParsedDataSchema.parse(JSON.parse(response.content[0].text))
```

### Pattern 3: Client Upload with Vercel Blob
**What:** Upload PDFs directly from browser to Vercel Blob, bypassing the 4.5 MB server function body limit
**When to use:** All PDF uploads (single and batch)
**Example:**
```typescript
// Client component
// Source: https://vercel.com/docs/vercel-blob/client-upload
'use client'
import { upload } from '@vercel/blob/client'

const newBlob = await upload(file.name, file, {
  access: 'private',
  handleUploadUrl: '/api/admin/cv/upload',
})

// Server route handler
// Source: https://vercel.com/docs/vercel-blob/client-upload
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody
  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      // Verify admin auth here
      return {
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB per CV
      }
    },
    onUploadCompleted: async ({ blob }) => {
      // Create cv_uploads record in database with status 'uploaded'
    },
  })
  return NextResponse.json(jsonResponse)
}
```

### Pattern 4: Database-Driven Async Job Processing
**What:** Track parse jobs in database, trigger parsing via API routes, poll for status from frontend. Use Next.js `after()` for fire-and-forget parsing after responding to the client.
**When to use:** Batch CV processing (95 CVs)
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/after
import { after } from 'next/server'

export async function POST(request: Request) {
  // 1. Validate admin auth
  // 2. Get list of unparsed cv_upload IDs
  // 3. Mark all as 'parsing' in database
  // 4. Return 202 Accepted immediately

  after(async () => {
    // Process each CV sequentially or in small batches (3-5 concurrent)
    for (const upload of uploads) {
      try {
        await parseSingleCv(upload.id)
        // Update status to 'parsed'
      } catch (error) {
        // Update status to 'failed' with error message
      }
    }
  })

  return new Response(JSON.stringify({ message: 'Parsing started' }), {
    status: 202
  })
}
```

**Polling endpoint:**
```typescript
// GET /api/admin/cv/status
export async function GET(request: Request) {
  const uploads = await db.select().from(cvUploads)
    .where(eq(cvUploads.uploadedBy, adminId))
    .orderBy(desc(cvUploads.createdAt))

  return Response.json(uploads.map(u => ({
    id: u.id,
    filename: u.filename,
    status: u.status, // 'uploaded' | 'parsing' | 'parsed' | 'failed'
    errorMessage: u.errorMessage,
  })))
}
```

### Anti-Patterns to Avoid
- **Processing CVs in middleware/proxy:** Never do heavy work in Next.js proxy.ts. Use route handlers.
- **Storing PDFs in database:** Use Vercel Blob for file storage, store only the blob URL in the database.
- **Parsing all 95 CVs in a single API call:** Vercel Functions have a max duration of 800s on Pro. Process individually and track status.
- **Using `client.messages.parse()` for structured output:** The TypeScript SDK's `.parse()` method still uses `output_format` (old beta parameter). Use `output_config.format` with `zodOutputFormat()` directly for the GA API.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser (pdf-parse, pdfjs-dist) | Claude API native PDF support (`document` content blocks) | Claude processes PDFs natively, extracting both text and visual elements. Each page is converted to text+image. No separate extraction step needed |
| JSON validation of LLM output | Manual try/catch JSON.parse with if-checks | `output_config.format` with `zodOutputFormat()` | Structured outputs use constrained decoding to guarantee valid JSON. Zero parsing errors, no retries needed |
| File upload handling | Custom multipart form parsing | `@vercel/blob` client uploads with `handleUpload()` | Handles token exchange, auth, size limits, content type validation, and multipart uploads for large files |
| Job queue for async processing | Redis/Bull queue, external job service | Database status column + `after()` + polling | For 95 CVs, a database status field is sufficient. No need for infrastructure like Redis or Inngest |
| Confidence scoring | Custom heuristic post-processing | Prompt Claude to assess its own extraction confidence per field | Claude can reliably self-assess extraction confidence. Embed in the extraction prompt and schema |

**Key insight:** Claude's native PDF support + structured outputs eliminate the two hardest problems in CV parsing (text extraction and output validation). The remaining complexity is orchestration, which a database status field handles adequately for this scale.

## Common Pitfalls

### Pitfall 1: Exceeding Vercel Function Body Size Limit
**What goes wrong:** Server-side PDF upload fails silently or returns 413 when file exceeds 4.5 MB
**Why it happens:** Vercel Functions have a 4.5 MB request body size limit. Many CV PDFs are 1-5 MB, and some with embedded images can exceed this.
**How to avoid:** Use Vercel Blob client uploads exclusively. The file goes directly from browser to Blob storage, never through the function.
**Warning signs:** Intermittent upload failures, especially with image-heavy CVs

### Pitfall 2: Structured Output Schema Too Complex
**What goes wrong:** 400 error "Schema is too complex for compilation" or slow first request
**Why it happens:** Structured outputs compile schemas to grammars. Complex schemas with many optional fields (limit: 24 optional params) or union types (limit: 16) hit compilation limits.
**How to avoid:** Make all fields required in the Zod schema. Use `z.string()` for optional data with empty string as sentinel rather than `z.optional()`. Keep the schema flat where possible.
**Warning signs:** First request taking >5 seconds, 400 errors from API

### Pitfall 3: Vercel Function Timeout During Batch Processing
**What goes wrong:** Batch parse request times out, leaving some CVs in 'parsing' state permanently
**Why it happens:** Vercel Functions have a max duration of 800s on Pro with Fluid Compute. Processing 95 CVs sequentially at ~15-20s each would take ~25-30 minutes.
**How to avoid:** Use `after()` to process CVs, but trigger parsing in smaller batches from the client side. The frontend can trigger parsing for 5-10 CVs at a time, polling status between batches. Alternatively, use `maxDuration` set to 800 (Pro plan) and process CVs sequentially within a single `after()` callback -- but implement checkpointing so if the function terminates, already-parsed CVs retain their status.
**Warning signs:** CVs stuck in 'parsing' status with no error

### Pitfall 4: Token Costs Spiraling with Large PDFs
**What goes wrong:** Unexpectedly high API bills
**Why it happens:** Each PDF page costs 1,500-3,000 text tokens PLUS image tokens (each page is also sent as an image). A 10-page CV could use 15,000-30,000+ input tokens.
**How to avoid:** Use Claude Haiku 4.5 ($1/$5 per MTok) instead of Sonnet ($3/$15). For 95 CVs averaging 3 pages each: ~95 * 7,500 tokens = ~712,500 input tokens = ~$0.71 with Haiku. Output at ~2,000 tokens each: ~190,000 tokens = ~$0.95. Total estimated cost: ~$1.66 for the full batch with Haiku.
**Warning signs:** Monitor `usage.input_tokens` in API responses

### Pitfall 5: onUploadCompleted Not Working in Local Dev
**What goes wrong:** Vercel Blob's `onUploadCompleted` callback never fires during local development
**Why it happens:** The callback is called by Vercel's servers, which cannot reach localhost.
**How to avoid:** For local dev, don't rely on `onUploadCompleted`. Instead, after the client upload completes, make a separate API call to create the database record. Use ngrok if you need the full flow locally. The `onUploadCompleted` callback is primarily useful in production.
**Warning signs:** Database records not being created after upload in local dev

### Pitfall 6: Not Handling Claude API Rate Limits
**What goes wrong:** Batch processing fails midway with 429 errors
**Why it happens:** Claude API has rate limits per minute. Processing 95 CVs rapidly can exceed RPM limits.
**How to avoid:** Add delays between API calls (e.g., 500ms-1s). Implement exponential backoff on 429 responses. Process sequentially, not in parallel.
**Warning signs:** 429 Too Many Requests errors during batch processing

## Code Examples

### CV Extraction Prompt
```typescript
// Source: Anthropic best practices for document extraction
export const CV_EXTRACTION_PROMPT = `You are an expert at extracting structured data from IP (Intellectual Property) lawyer CVs/resumes.

Analyze the provided PDF CV and extract the following information. For each field, assess your confidence level:
- "high": The information is clearly and explicitly stated in the CV
- "medium": The information is partially stated or inferred from context
- "low": The information is uncertain, ambiguous, or may be inaccurate

Extract:
1. Full name
2. Email address
3. Phone number
4. IP law specializations (e.g., patent prosecution, trademark litigation, trade secrets, copyright, IP portfolio management)
5. Education history (institution, degree, field of study, graduation year)
6. Technical background / technical domains (e.g., electrical engineering, software, biotech, chemistry, mechanical engineering)
7. Bar admissions (jurisdiction, year admitted, current status if known)
8. Work history (employer, title, start date, end date, brief description)

If a field cannot be found in the CV, use an empty string or empty array as appropriate, with "low" confidence.
For dates, use ISO-like format where possible (YYYY or YYYY-MM). If only partial dates are available, include what's available.`
```

### Database Schema for CV Profiles (Drizzle)
```typescript
// Source: Drizzle ORM docs + project conventions from schema.ts
import {
  pgTable, pgEnum, uuid, varchar, text, boolean,
  timestamp, integer, index, uniqueIndex, jsonb
} from 'drizzle-orm/pg-core'
import { users } from './schema' // existing users table

export const cvUploadStatusEnum = pgEnum('cv_upload_status', [
  'uploaded', 'parsing', 'parsed', 'failed'
])

export const confidenceEnum = pgEnum('confidence_level', [
  'high', 'medium', 'low'
])

// CV uploads tracking table
export const cvUploads = pgTable('cv_uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  blobUrl: text('blob_url').notNull(),
  status: cvUploadStatusEnum('status').notNull().default('uploaded'),
  errorMessage: text('error_message'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  profileId: uuid('profile_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  parsedAt: timestamp('parsed_at', { withTimezone: true }),
}, (table) => [
  index('cv_uploads_status_idx').on(table.status),
  index('cv_uploads_uploaded_by_idx').on(table.uploadedBy),
])

// Main profile table
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameConfidence: confidenceEnum('name_confidence').notNull(),
  email: varchar('email', { length: 255 }),
  emailConfidence: confidenceEnum('email_confidence').notNull(),
  phone: varchar('phone', { length: 50 }),
  phoneConfidence: confidenceEnum('phone_confidence').notNull(),
  cvUploadId: uuid('cv_upload_id').notNull().references(() => cvUploads.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Specializations (many-to-many via junction)
export const specializations = pgTable('specializations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
})

export const profileSpecializations = pgTable('profile_specializations', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  specializationId: uuid('specialization_id').notNull().references(() => specializations.id),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  index('profile_spec_profile_idx').on(table.profileId),
  index('profile_spec_spec_idx').on(table.specializationId),
])

// Education entries
export const education = pgTable('education', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  field: varchar('field', { length: 255 }).notNull(),
  year: varchar('year', { length: 10 }),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  index('education_profile_idx').on(table.profileId),
])

// Technical domains (many-to-many via junction)
export const technicalDomains = pgTable('technical_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
})

export const profileTechnicalDomains = pgTable('profile_technical_domains', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  technicalDomainId: uuid('technical_domain_id').notNull().references(() => technicalDomains.id),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  index('profile_tech_profile_idx').on(table.profileId),
  index('profile_tech_domain_idx').on(table.technicalDomainId),
])

// Bar admissions
export const barAdmissions = pgTable('bar_admissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  jurisdiction: varchar('jurisdiction', { length: 255 }).notNull(),
  year: varchar('year', { length: 10 }),
  status: varchar('status', { length: 100 }),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  index('bar_admissions_profile_idx').on(table.profileId),
])

// Work history
export const workHistory = pgTable('work_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  employer: varchar('employer', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  startDate: varchar('start_date', { length: 20 }),
  endDate: varchar('end_date', { length: 20 }),
  description: text('description'),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  index('work_history_profile_idx').on(table.profileId),
])
```

### Vercel Function Max Duration Config
```typescript
// For parse routes that call Claude API
// Source: https://vercel.com/docs/functions/configuring-functions/duration
export const maxDuration = 60 // 60 seconds for single CV parse

// For batch processing route
export const maxDuration = 300 // 5 minutes default, up to 800 on Pro
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use for structured output | `output_config.format` with JSON Schema | GA release (was beta with `output_format`) | Guaranteed schema-valid JSON via constrained decoding. No more parsing errors or retries |
| Beta `output_format` param | `output_config.format` param | Recent GA promotion | Old beta header `structured-outputs-2025-11-13` still works but is deprecated. Use `output_config.format` |
| Separate PDF text extraction (pdfjs, pdf-parse) then send text to Claude | Native PDF `document` content blocks | Available since Claude 3 era, mature | Claude processes PDFs directly -- no separate extraction step. Handles both text and visual elements |
| Serverless 10s/60s timeouts | Fluid Compute: 300s default, 800s max (Pro) | Vercel Fluid Compute launch | Much more headroom for CV parsing. Single CV well within limits |
| `waitUntil()` from @vercel/functions | `after()` from next/server | Next.js 15.1.0 (stable) | Built-in Next.js primitive for post-response work. Runs within the function's `maxDuration` |
| Drizzle Relations v1 (manual junction queries) | Relations v2 with `through()` | Drizzle ORM v0.45+ | Cleaner many-to-many queries via junction tables |

**Deprecated/outdated:**
- `output_format` parameter: Still works but deprecated in favor of `output_config.format`
- `unstable_after`: Renamed to `after` in Next.js 15.1.0
- Beta header `structured-outputs-2025-11-13`: No longer needed, structured outputs are GA

## Open Questions

1. **Exact Haiku 4.5 model ID for API calls**
   - What we know: The model exists as `claude-haiku-4-5-20251001` based on documentation
   - What's unclear: Whether there's a newer snapshot or alias
   - Recommendation: Use `claude-haiku-4-5-20251001` initially, can switch to alias `claude-haiku-4-5` if available

2. **Confidence scoring accuracy from LLM self-assessment**
   - What we know: Claude can self-assess extraction confidence and the structured output guarantees the schema
   - What's unclear: How well the confidence ratings correlate with actual accuracy for IP lawyer CVs specifically
   - Recommendation: Start with LLM self-assessment, validate against a small sample manually, adjust prompt if needed

3. **Vercel Blob private storage download URL expiry**
   - What we know: Private blobs use signed URLs via `getDownloadUrl()` or the `downloadUrl` from `put()`
   - What's unclear: Whether the download URL returned by `put()` expires or requires re-signing for Claude API access
   - Recommendation: When parsing, fetch the blob content server-side using `get()` and convert to base64, rather than passing URLs to Claude API

4. **`after()` behavior with Vercel Fluid Compute for long batches**
   - What we know: `after()` runs within the function's `maxDuration`. On Pro with Fluid Compute, max is 800s (13 min)
   - What's unclear: Whether processing all 95 CVs fits within 800s (at ~15s each = ~1,425s, exceeding the limit)
   - Recommendation: Process CVs in batches of ~40-50 per `after()` call. Frontend triggers multiple batch requests. Each CV's status is tracked independently in the database

## Sources

### Primary (HIGH confidence)
- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support) - Complete PDF API reference with TypeScript examples
- [Anthropic Structured Outputs Docs](https://platform.claude.com/docs/en/docs/build-with-claude/structured-outputs) - `output_config.format`, `zodOutputFormat()`, schema limitations, GA status
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - Model pricing: Haiku 4.5 at $1/$5, Sonnet 4.5 at $3/$15 per MTok
- [Vercel Blob Client Upload Docs](https://vercel.com/docs/vercel-blob/client-upload) - `handleUpload()`, `onBeforeGenerateToken`, security model
- [Vercel Blob SDK Reference](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk) - `put()`, `get()`, `del()`, `list()`, `head()` API
- [Next.js `after()` Docs](https://nextjs.org/docs/app/api-reference/functions/after) - Post-response work, serverless support via `waitUntil`
- [Vercel Functions Duration](https://vercel.com/docs/functions/configuring-functions/duration) - Max duration: 300s default, 800s max on Pro with Fluid Compute
- [Drizzle ORM Relations v2](https://orm.drizzle.team/docs/relations-v2) - `defineRelations`, `through()` for junction tables

### Secondary (MEDIUM confidence)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) - 4.5 MB body size limit confirming need for client uploads
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - Latest version 0.77.0

### Tertiary (LOW confidence)
- Various WebSearch results on async processing patterns - Confirmed general approach but specific implementation details verified via official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official documentation and npm
- Architecture: HIGH - Patterns verified against Next.js 16.1.6 docs, Anthropic API docs, and Vercel Blob docs
- PDF parsing approach: HIGH - Claude's native PDF `document` blocks are well-documented and GA
- Structured outputs: HIGH - `output_config.format` with Zod is GA, verified with official docs
- Async processing: MEDIUM - `after()` is stable in Next.js 15.1+, but the exact behavior with very long batch processing on Vercel Fluid Compute needs runtime validation
- Database schema: MEDIUM - Schema design follows normalization best practices and Drizzle patterns, but may need tuning based on actual CV data
- Cost estimates: MEDIUM - Token counts per page are documented ranges (1,500-3,000), actual costs depend on CV length/complexity

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days - stable technologies)
