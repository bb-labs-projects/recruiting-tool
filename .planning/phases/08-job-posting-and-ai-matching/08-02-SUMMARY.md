---
phase: 08-job-posting-and-ai-matching
plan: 02
type: summary
status: completed
completed_at: 2026-02-20
---

## What was built

Two-stage AI matching pipeline: SQL pre-filter for candidate elimination, Claude Haiku 4.5 for scoring with structured output, result caching, async API routes for triggering/polling, and automatic post-matching notifications.

## Files created

1. **src/lib/matching/schema.ts** - Zod schema for match score structured output (`MatchScoreSchema`), plus `CandidateForScoring` and `JobForScoring` DTOs. CandidateForScoring contains NO PII fields.

2. **src/lib/matching/prompt.ts** - `buildScoringPrompt()` function that constructs the rubric prompt with explicit scoring scale (90-100 exact, 70-89 strong, 50-69 partial, 25-49 weak, 0-24 none), 5 weighted dimensions (specialization 30%, experience 25%, technical 20%, bar 15%, location 10%), and recommendation thresholds.

3. **src/lib/matching/pre-filter.ts** - `preFilterCandidates()` using EXISTS subqueries on junction tables (same pattern as employer-profiles.ts). Filters on required specializations (OR logic), required bar admissions, and required technical domains. Experience is NOT filtered in SQL (computed in JS).

4. **src/lib/matching/score.ts** - `scoreCandidate()` calls Claude Haiku 4.5 with `zodOutputFormat(MatchScoreSchema)` for guaranteed structured output. Exact same API pattern as CV parser.

5. **src/lib/matching/run-matching.ts** - `runMatchingForJob()` orchestrator: loads job, sets status to 'running', calls pre-filter, iterates shortlist with cache check, scores each candidate, inserts results, sets status to 'completed', then calls `notifyMatchResults()`. Per-candidate errors are caught and collected without aborting. If ALL candidates error, status is 'failed'.

6. **src/lib/matching/notify.ts** - `notifyMatchResults()` sends employer and candidate notification emails via Resend. Uses batch API in chunks of 100 for candidate emails. Calls `markMatchesNotified()` to prevent re-notification. Entire function wrapped in try/catch -- notification failures are logged but never thrown.

7. **src/app/api/matching/run/route.ts** - POST endpoint with `maxDuration = 120`. Auth-gated for admin and employer roles. Employer ownership verified. Requires job status 'open' and matchingStatus not 'running' (409 conflict). Calls `runMatchingForJob()` which includes automatic notifications.

8. **src/app/api/matching/status/route.ts** - GET endpoint for polling matching progress. Returns `matchingStatus`, `matchedAt`, and `matchCount` (via count query). Auth-gated with employer ownership check.

## Key design decisions

- **No PII in scoring path**: CandidateForScoring only contains specializations, experienceYears, education, barAdmissions, and technicalDomains. No name, email, phone, or employer names.
- **Per-candidate error isolation**: A single candidate scoring failure does not crash the entire pipeline. Errors are collected and returned alongside successful match count.
- **Best-effort notifications**: notify.ts wraps everything in try/catch. Notification failures are logged but never propagate to the matching pipeline.
- **Cache check uses timestamp**: Cached matches are only reused if `scoredAt > job.updatedAt`, ensuring re-scoring happens when job requirements change.
- **Notifications after status update**: `notifyMatchResults()` is called AFTER `updateJobMatchingStatus(jobId, 'completed')` so the job shows correct status even if notifications fail.

## Verification

- `npx tsc --noEmit` passes with zero errors in all 8 matching files
- CandidateForScoring type has no PII fields
- Scoring prompt contains explicit scoring scale definitions and dimension weights
- Pre-filter uses EXISTS subqueries (same pattern as employer-profiles.ts)
- Run route has `maxDuration = 120`
- Status route returns matchingStatus and matchCount
