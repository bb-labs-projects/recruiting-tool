# Phase 8: Job Posting and AI Matching - Research

**Researched:** 2026-02-20
**Domain:** Job posting CRUD, AI-powered candidate-job matching with Claude API, email notifications
**Confidence:** HIGH

## Summary

Phase 8 adds job posting capabilities for employers and admin, plus AI-powered candidate matching using a two-stage approach (SQL pre-filter then Claude API scoring). This builds directly on established patterns in the codebase: the Claude API integration from CV parsing (Phase 2), the DAL/server action patterns from employer features (Phases 4-6), and the Resend email infrastructure from auth (Phase 1).

The core technical challenge is the AI matching pipeline. The existing codebase already uses `@anthropic-ai/sdk` v0.78+ with `zodOutputFormat` for structured output during CV parsing. The same pattern applies for match scoring: define a Zod schema for the scoring rubric, call Claude Haiku 4.5 with structured output, and get guaranteed-valid JSON back. The two-stage approach (SQL pre-filter eliminates obvious mismatches, then Claude scores the shortlist) keeps API costs low -- at $1/MTok input and $5/MTok output for Haiku 4.5, scoring 50 candidates against a job costs roughly $0.05-0.15.

The notification system uses Resend's batch API (up to 100 emails per call), which is already installed. No new dependencies are required for this entire phase.

**Primary recommendation:** Reuse the exact Claude API + Zod structured output pattern from CV parsing for match scoring. Use `messages.create()` with `output_config.format: zodOutputFormat(MatchScoreSchema)` and Haiku 4.5 for cost-effective scoring. Cache all match results in a `job_matches` table to avoid redundant API calls.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.78.0 | Claude API for match scoring | Already installed, used for CV parsing; supports structured output with Zod |
| drizzle-orm | ^0.45.1 | Database schema, queries, relations | Already installed, used throughout codebase |
| resend | ^6.9.2 | Email notifications for matches | Already installed, used for magic link emails |
| zod | ^4.3.6 | Schema validation for job forms + match scoring output | Already installed, used for CV parsing schemas |
| shadcn/ui | installed | Form components, tables, cards for job UI | Already installed, used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.575.0 | Icons for job status, match scores | Already installed |
| @tanstack/react-table | ^8.21.3 | Job listing tables for admin | Already installed, used in admin candidates/employers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Haiku 4.5 for scoring | Claude Sonnet 4.5 | 3x more expensive ($3/$15 vs $1/$5 per MTok); Haiku is sufficient for rubric-based scoring |
| Batch API for scoring | Real-time per-candidate | Batch API has 50% discount but is async; real-time is simpler for initial implementation |
| Resend batch | Individual emails | Batch sends up to 100 at once, more efficient for match notifications |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    db/
      schema.ts              # Add: jobs, jobRequirements, jobMatches tables
      relations.ts           # Add: job-related relations
    dal/
      jobs.ts                # Job CRUD DAL (admin + employer)
      job-matches.ts         # Match results DAL (read cached matches)
    matching/
      pre-filter.ts          # SQL pre-filter: eliminate obvious mismatches
      score.ts               # Claude API scoring with structured output
      schema.ts              # Zod schemas for match score response
      prompt.ts              # Scoring rubric prompt
      run-matching.ts        # Orchestrator: pre-filter -> score -> cache
    email/
      match-notification.ts  # Email templates for match notifications
  actions/
    jobs.ts                  # Server actions for job CRUD
    matching.ts              # Server action to trigger matching
  app/
    (authenticated)/
      employer/
        jobs/
          page.tsx           # Employer's job listings
          new/
            page.tsx         # Create new job form
          [id]/
            page.tsx         # Job detail with match results
    admin/
      jobs/
        page.tsx             # Admin job management
        new/
          page.tsx           # Admin creates job on behalf of employer
        [id]/
          page.tsx           # Admin job detail with matches
    api/
      matching/
        run/
          route.ts           # API route to trigger matching (async)
        status/
          route.ts           # Poll matching status
```

### Pattern 1: Two-Stage Matching Pipeline
**What:** SQL pre-filter eliminates obvious mismatches, then Claude API scores only the shortlist
**When to use:** Every time matching is triggered (new job created, or new candidate profile approved)
**Example:**
```typescript
// Source: Existing codebase pattern (employer-profiles.ts buildFilterConditions)
// Stage 1: SQL Pre-Filter
async function preFilterCandidates(jobRequirements: JobRequirements): Promise<string[]> {
  const conditions: SQL[] = [eq(profiles.status, 'active')]

  // Required specializations: EXISTS subquery on junction table
  if (jobRequirements.specializations.length > 0) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(profileSpecializations)
          .innerJoin(specializations, eq(profileSpecializations.specializationId, specializations.id))
          .where(and(
            eq(profileSpecializations.profileId, profiles.id),
            inArray(specializations.name, jobRequirements.specializations)
          ))
      )
    )
  }

  // Bar requirements: EXISTS subquery
  if (jobRequirements.requiredBar.length > 0) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(barAdmissions)
          .where(and(
            eq(barAdmissions.profileId, profiles.id),
            inArray(barAdmissions.jurisdiction, jobRequirements.requiredBar)
          ))
      )
    )
  }

  const rows = await db.select({ id: profiles.id })
    .from(profiles)
    .where(and(...conditions))

  return rows.map(r => r.id)
}

// Stage 2: Claude API Scoring (on shortlist only)
// Source: Existing CV parser pattern (src/lib/cv-parser/parse.ts)
async function scoreCandidate(
  jobData: JobForScoring,
  candidateData: CandidateForScoring
): Promise<MatchScore> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildScoringPrompt(jobData, candidateData),
    }],
    output_config: {
      format: zodOutputFormat(MatchScoreSchema),
    },
  })

  const firstBlock = response.content[0]
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Unexpected response format')
  }
  return MatchScoreSchema.parse(JSON.parse(firstBlock.text))
}
```

### Pattern 2: Decomposed Scoring Rubric with Structured Output
**What:** Multi-dimensional scoring with sub-scores that Claude returns as structured JSON
**When to use:** For every candidate in the shortlist
**Example:**
```typescript
// Source: Anthropic structured output docs + existing zodOutputFormat pattern
import { z } from 'zod'

export const MatchScoreSchema = z.object({
  overallScore: z.number(),         // 0-100 weighted composite
  specializationMatch: z.object({
    score: z.number(),              // 0-100
    explanation: z.string(),
  }),
  experienceFit: z.object({
    score: z.number(),
    explanation: z.string(),
  }),
  technicalBackground: z.object({
    score: z.number(),
    explanation: z.string(),
  }),
  locationMatch: z.object({
    score: z.number(),
    explanation: z.string(),
  }),
  barAdmissions: z.object({
    score: z.number(),
    explanation: z.string(),
  }),
  summary: z.string(),             // Plain-English overall assessment
  recommendation: z.string(),      // "Strong Match", "Good Match", "Partial Match", "Weak Match"
})

export type MatchScore = z.infer<typeof MatchScoreSchema>
```

### Pattern 3: Match Result Caching
**What:** Store match results in `job_matches` table to avoid redundant API calls
**When to use:** After scoring each candidate; check cache before scoring
**Example:**
```typescript
// Check cache first
const existing = await db.select()
  .from(jobMatches)
  .where(and(
    eq(jobMatches.jobId, jobId),
    eq(jobMatches.profileId, profileId)
  ))
  .limit(1)

if (existing.length > 0) {
  return existing[0] // Cache hit, skip API call
}

// Score and cache
const score = await scoreCandidate(jobData, candidateData)
await db.insert(jobMatches).values({
  jobId,
  profileId,
  overallScore: score.overallScore,
  subscores: score,  // JSONB column for full decomposed scores
  scoredAt: new Date(),
})
```

### Pattern 4: Async Matching with Status Polling
**What:** Reuse the CV parsing async pattern -- trigger matching via API route, poll for status
**When to use:** When matching is triggered (could take 5-30 seconds depending on shortlist size)
**Example:**
```typescript
// Follows the exact pattern from src/app/api/admin/cv/parse/route.ts
// 1. Trigger: POST /api/matching/run { jobId }
// 2. Set job.matchingStatus = 'running'
// 3. Process in background (fire-and-forget on the server)
// 4. Poll: GET /api/matching/status?jobId=xxx
// 5. When done, set job.matchingStatus = 'completed'
```

### Anti-Patterns to Avoid
- **Scoring all candidates without pre-filter:** Never send all 1000 profiles to Claude API. SQL pre-filter first, score only the shortlist (typically 20-100 candidates).
- **Storing match scores in a JSON column on the job:** Use a separate `job_matches` junction table for normalized access and efficient queries.
- **Sending PII to Claude for scoring:** The scoring prompt should receive anonymized profile data (specializations, experience, education, bar admissions) -- never names, emails, or phone numbers.
- **Blocking the UI during matching:** Matching can take 10-60 seconds. Use async pattern with status polling, not a synchronous server action.
- **Re-scoring on every page load:** Always check the `job_matches` cache first. Only re-score when job requirements change or new candidates are added.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured AI output | Manual JSON parsing from Claude text | `zodOutputFormat` + `output_config.format` | Guaranteed schema compliance, no parse errors, already used in CV parsing |
| Batch email sending | Loop over individual `resend.emails.send()` | `resend.batch.send()` | Sends up to 100 emails in one API call, includes idempotency keys |
| SQL pre-filtering | Custom query string building | Existing `buildFilterConditions` pattern with EXISTS subqueries | Already proven pattern in `employer-profiles.ts`, type-safe with Drizzle |
| Form validation | Manual field checking | Zod schemas with `safeParse` | Already used in all server actions, type-safe, composable |
| Experience calculation | New experience column/computation | Existing `bucketExperienceYears()` from `anonymize.ts` | Already handles null dates, work history aggregation |

**Key insight:** This phase introduces no new technical domains. Every component (Claude API, email, form handling, database patterns) has an existing implementation to reference. The risk is architectural -- getting the matching pipeline right -- not library-level.

## Common Pitfalls

### Pitfall 1: Expensive AI Scoring Without Pre-Filter
**What goes wrong:** Sending all active profiles to Claude API for scoring, resulting in high API costs and slow matching.
**Why it happens:** Developer skips SQL pre-filter because it seems like an optimization that can be added later.
**How to avoid:** Always implement pre-filter first. For 500 profiles, if pre-filter reduces to 50, that is a 10x cost reduction. At Haiku 4.5 pricing ($1/$5 per MTok), scoring 500 profiles would cost ~$0.50-1.50 per job; scoring 50 costs ~$0.05-0.15.
**Warning signs:** Matching takes >60 seconds, API costs spike on job creation.

### Pitfall 2: Scoring Prompt Too Vague
**What goes wrong:** Claude returns inconsistent scores because the rubric is not explicit about what each score range means.
**Why it happens:** Prompt says "rate specialization match" without defining that 90-100 means exact match, 70-89 means related area, etc.
**How to avoid:** Define explicit score ranges in the prompt:
- 90-100: Exact match on required criteria
- 70-89: Strong match with minor gaps
- 50-69: Partial match, some relevant experience
- 25-49: Weak match, tangentially related
- 0-24: No relevant match
Include concrete examples in the prompt for each dimension.
**Warning signs:** Same candidate gets wildly different scores when re-scored, scores cluster around 50-70.

### Pitfall 3: Stale Match Cache
**What goes wrong:** Match scores are cached but never invalidated when job requirements change or candidate profiles are updated.
**Why it happens:** Cache invalidation is deferred as a "later" concern.
**How to avoid:** Invalidate (delete) cached matches when:
1. Job requirements are edited
2. A candidate profile is updated/re-approved
3. Implement `updatedAt` comparison: if job or profile `updatedAt` > match `scoredAt`, re-score.
**Warning signs:** Employer edits job requirements but sees the same match results.

### Pitfall 4: Sending PII in Scoring Prompts
**What goes wrong:** Candidate names, emails, or firm names leak into the Claude API scoring prompt.
**Why it happens:** Developer uses full profile data instead of anonymized version for scoring.
**How to avoid:** Create a dedicated `CandidateForScoring` DTO that only includes: specializations, years of experience (computed), education (institution, degree, field), bar admissions, technical domains. Never include name, email, phone, or work history employer names.
**Warning signs:** Review the scoring prompt template for any PII fields.

### Pitfall 5: No Rate Limiting on Match Trigger
**What goes wrong:** Employer rapidly re-triggers matching, causing API cost spike.
**Why it happens:** No debounce or cooldown on the "Run Matching" action.
**How to avoid:** Check `matchingStatus` before allowing re-trigger. Only allow re-matching if status is 'completed' or 'failed' and at least 5 minutes have passed since last run.
**Warning signs:** Multiple concurrent matching runs for the same job.

### Pitfall 6: Notification Spam
**What goes wrong:** Every time matching runs, all matched employers/candidates get emails, even if they were already notified.
**Why it happens:** No tracking of which matches have been notified.
**How to avoid:** Add `notifiedAt` column to `job_matches` table. Only send notifications for matches where `notifiedAt IS NULL`. Set `notifiedAt` after sending.
**Warning signs:** Users complain about repeated match notification emails.

## Code Examples

Verified patterns from official sources and existing codebase:

### Job Schema Design
```typescript
// Source: Existing schema patterns in src/lib/db/schema.ts
export const jobStatusEnum = pgEnum('job_status', [
  'draft', 'open', 'closed', 'archived'
])

export const matchingStatusEnum = pgEnum('matching_status', [
  'pending', 'running', 'completed', 'failed'
])

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: jobStatusEnum('status').notNull().default('draft'),
  matchingStatus: matchingStatusEnum('matching_status').notNull().default('pending'),
  // Structured requirements (directly on job, not junction tables)
  // Using arrays of text for simplicity at <1000 scale
  requiredSpecializations: text('required_specializations').array(),
  preferredSpecializations: text('preferred_specializations').array(),
  minimumExperience: integer('minimum_experience'), // years
  preferredLocation: varchar('preferred_location', { length: 255 }),
  requiredBar: text('required_bar').array(),         // e.g., ['USPTO', 'California']
  requiredTechnicalDomains: text('required_technical_domains').array(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  matchedAt: timestamp('matched_at', { withTimezone: true }),
}, (table) => [
  index('jobs_employer_idx').on(table.employerUserId),
  index('jobs_status_idx').on(table.status),
])

export const jobMatches = pgTable('job_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score').notNull(), // 0-100
  subscores: text('subscores').notNull(),            // JSON string of decomposed scores
  summary: text('summary').notNull(),                // Plain-English explanation
  recommendation: varchar('recommendation', { length: 50 }).notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }).defaultNow().notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('job_matches_job_profile_idx').on(table.jobId, table.profileId),
  index('job_matches_job_idx').on(table.jobId),
  index('job_matches_profile_idx').on(table.profileId),
  index('job_matches_score_idx').on(table.jobId, table.overallScore),
])
```

### Claude API Match Scoring Call
```typescript
// Source: Existing pattern from src/lib/cv-parser/parse.ts + Anthropic structured output docs
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { MatchScoreSchema } from './schema'
import { buildScoringPrompt } from './prompt'

const anthropic = new Anthropic()

export async function scoreCandidate(
  job: JobForScoring,
  candidate: CandidateForScoring,
): Promise<MatchScore> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildScoringPrompt(job, candidate),
    }],
    output_config: {
      format: zodOutputFormat(MatchScoreSchema),
    },
  })

  const firstBlock = response.content[0]
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Unexpected response format: no text content block')
  }
  return MatchScoreSchema.parse(JSON.parse(firstBlock.text))
}
```

### Scoring Prompt Template
```typescript
// Source: Based on existing CV_EXTRACTION_PROMPT pattern
export function buildScoringPrompt(
  job: JobForScoring,
  candidate: CandidateForScoring,
): string {
  return `You are an expert IP law recruiter evaluating candidate fit for a job opening.

Score this candidate against the job requirements using the following rubric. For each dimension, provide a score from 0-100 and a brief explanation.

## Scoring Scale
- 90-100: Exact match or exceeds requirements
- 70-89: Strong match with minor gaps
- 50-69: Partial match, some relevant experience
- 25-49: Weak match, tangentially related
- 0-24: No relevant match

## Job Requirements
- Title: ${job.title}
- Required Specializations: ${job.requiredSpecializations.join(', ') || 'None specified'}
- Preferred Specializations: ${job.preferredSpecializations.join(', ') || 'None specified'}
- Minimum Experience: ${job.minimumExperience ? `${job.minimumExperience} years` : 'Not specified'}
- Preferred Location: ${job.preferredLocation || 'Not specified'}
- Required Bar Admissions: ${job.requiredBar.join(', ') || 'None specified'}
- Required Technical Domains: ${job.requiredTechnicalDomains.join(', ') || 'None specified'}
${job.description ? `- Description: ${job.description}` : ''}

## Candidate Profile
- Specializations: ${candidate.specializations.join(', ') || 'None listed'}
- Years of Experience: ${candidate.experienceYears}
- Education: ${candidate.education.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join('; ') || 'None listed'}
- Bar Admissions: ${candidate.barAdmissions.map(b => b.jurisdiction).join(', ') || 'None listed'}
- Technical Domains: ${candidate.technicalDomains.join(', ') || 'None listed'}

## Scoring Dimensions
1. **Specialization Match** (weight: 30%): How well do the candidate's IP specializations match the required and preferred specializations?
2. **Experience Fit** (weight: 25%): Does the candidate meet the minimum experience requirement? How well does their experience level match?
3. **Technical Background** (weight: 20%): Does the candidate have the required technical domains?
4. **Location Match** (weight: 10%): Is the candidate admitted in the preferred location or nearby jurisdictions?
5. **Bar Admissions** (weight: 15%): Does the candidate hold the required bar admissions?

Calculate the overall score as a weighted average of the dimension scores using the weights above.

Provide a plain-English summary (2-3 sentences) explaining the overall fit.

Provide a recommendation: "Strong Match" (75+), "Good Match" (50-74), "Partial Match" (25-49), or "Weak Match" (0-24).`
}
```

### Notification Email Template
```typescript
// Source: Existing pattern from src/lib/email/magic-link-email.tsx
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMatchNotifications(
  matches: {
    employerEmail: string
    jobTitle: string
    matchCount: number
    jobId: string
  }[]
) {
  const appName = process.env.APP_NAME ?? 'IP Lawyer Recruiting'
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  // Use batch send for efficiency (up to 100 per call)
  const emails = matches.map(match => ({
    from: `${appName} <${process.env.EMAIL_FROM}>`,
    to: [match.employerEmail],
    subject: `${match.matchCount} candidates match your "${match.jobTitle}" posting`,
    html: `...inline HTML template...`,
  }))

  // Resend batch API: up to 100 emails per call
  const { error } = await resend.batch.send(emails)
  if (error) {
    console.error('Failed to send match notifications:', error)
  }
}
```

### Server Action for Job Creation
```typescript
// Source: Existing pattern from src/actions/employers.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  requiredSpecializations: z.array(z.string()).min(1, 'At least one specialization required'),
  preferredSpecializations: z.array(z.string()).optional(),
  minimumExperience: z.number().int().min(0).optional(),
  preferredLocation: z.string().max(255).optional(),
  requiredBar: z.array(z.string()).optional(),
  requiredTechnicalDomains: z.array(z.string()).optional(),
})

export async function createJob(
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData
) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    return { error: 'Unauthorized' }
  }
  // ... validate with CreateJobSchema, insert into jobs table
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` param (beta) | `output_config.format` (GA) | Late 2025 | No beta header needed; existing codebase already uses `output_config` |
| Manual JSON parsing from Claude | `zodOutputFormat` with structured output | 2025 | Guaranteed schema compliance, no parse errors |
| Individual email sends | `resend.batch.send()` | 2025 | Up to 100 emails per API call |
| Zod v3 | Zod v4.3.6 | 2025 | Already using v4 in this project; minor API differences from older tutorials |

**Deprecated/outdated:**
- `output_format` parameter (replaced by `output_config.format`) -- old beta header `structured-outputs-2025-11-13` still works but unnecessary
- Note: The existing CV parser code uses `output_config.format` which is the current GA approach

## Cost Analysis

### Haiku 4.5 Pricing for Match Scoring
- Input: $1 / MTok
- Output: $5 / MTok
- Per candidate scoring call: ~500-800 input tokens (prompt + candidate data), ~300-500 output tokens (scores + explanations)
- Estimated cost per candidate: ~$0.002-0.003
- 50-candidate shortlist: ~$0.10-0.15 per job
- 100-candidate shortlist: ~$0.20-0.30 per job
- At 100 jobs/month with 50-candidate shortlists: ~$10-15/month

### Batch API Option (Future Optimization)
- 50% discount on input/output tokens
- Haiku 4.5 batch: $0.50 input, $2.50 output per MTok
- Trade-off: Async (results within 24 hours), not suitable for real-time matching
- Recommendation: Start with real-time calls, switch to batch if costs become significant

## Open Questions

Things that could not be fully resolved:

1. **Job requirements as columns vs junction tables**
   - What we know: The existing codebase uses junction tables for profile specializations/domains. Jobs could use the same pattern (separate `job_specializations`, `job_technical_domains` tables) or use PostgreSQL text arrays directly on the jobs table.
   - What's unclear: At <100 jobs, text arrays are simpler and sufficient. Junction tables add complexity but enable better querying.
   - Recommendation: Use text arrays on the jobs table for simplicity. The pre-filter query can use `ANY()` with PostgreSQL arrays. This avoids 4+ junction tables and simplifies CRUD. If the platform scales to 1000+ jobs, migrate to junction tables.

2. **When to trigger matching**
   - What we know: Matching needs to run when (a) a new job is published, (b) a new candidate profile is approved, (c) job requirements are edited.
   - What's unclear: Should (b) be automatic or manual? Automatic matching on every profile approval could be expensive if there are many open jobs.
   - Recommendation: Automatic matching on job publish/edit. Manual "Find matches" button. For new candidate profiles, match against open jobs in background if there are <20 open jobs; otherwise require manual trigger.

3. **Candidate notification opt-in**
   - What we know: The roadmap says "notifies candidates when new jobs match their profile." But candidates may not have set up email notification preferences.
   - What's unclear: Should all active candidates receive match notifications, or only those who opt in?
   - Recommendation: For v1, notify all candidates with active profiles. Add notification preferences in a future iteration.

## Sources

### Primary (HIGH confidence)
- Anthropic Pricing Documentation: https://platform.claude.com/docs/en/about-claude/pricing -- Haiku 4.5 at $1/$5 per MTok confirmed
- Anthropic Structured Outputs Documentation: https://platform.claude.com/docs/en/build-with-claude/structured-outputs -- `output_config.format` with `zodOutputFormat` confirmed as GA
- Existing codebase: `src/lib/cv-parser/parse.ts` -- Verified Claude API integration pattern with `zodOutputFormat`
- Existing codebase: `src/lib/dal/employer-profiles.ts` -- Verified SQL pre-filter pattern with EXISTS subqueries
- Existing codebase: `src/lib/email/magic-link-email.tsx` -- Verified Resend email pattern
- Resend Batch API Documentation: https://resend.com/docs/api-reference/emails/send-batch-emails -- Up to 100 emails per batch call

### Secondary (MEDIUM confidence)
- Claude API scoring rubric best practices from web search -- Weighted multi-dimensional scoring is established pattern
- Resend 2025 features: Idempotency keys for batch API confirmed

### Tertiary (LOW confidence)
- Cost estimates for match scoring are approximate (depend on actual prompt/response sizes)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in codebase
- Architecture: HIGH - Follows existing patterns (CV parsing, DAL, server actions)
- AI matching pipeline: HIGH - Structured output with Zod confirmed working, same pattern as CV parsing
- Scoring rubric design: MEDIUM - Weighted scoring is standard practice but prompt tuning will be needed
- Cost estimates: MEDIUM - Based on Haiku 4.5 official pricing, but actual token usage depends on prompt design
- Notification system: HIGH - Resend batch API is documented and straightforward

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable -- all dependencies already locked, no fast-moving concerns)
