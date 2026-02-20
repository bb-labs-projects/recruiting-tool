---
phase: 04-employer-onboarding-and-browse
plan: 01
subsystem: employer-data-layer
tags: [schema, anonymization, dal, server-actions, drizzle, employer]
---

## Summary

Database schema extension, server-side anonymization utilities, DAL modules, and server actions for employer onboarding and browse -- data foundation for all employer-facing features using column-whitelisted DTOs that never expose PII.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Schema extension, relations, and anonymization utilities | 26b396e | src/lib/db/schema.ts, src/lib/db/relations.ts, src/lib/anonymize.ts |
| 2 | DAL modules and server actions | 01687c4 | src/lib/dal/employer-profiles.ts, src/lib/dal/admin-employers.ts, src/actions/employers.ts |

## Key Decisions

- **Column inclusion mode for anonymization:** Used Drizzle `columns: { id: true, createdAt: true }` (whitelist) rather than exclusion mode (`name: false`) to ensure PII fields are never selected even if new columns are added to the schema later
- **Separate DAL modules:** Two completely separate data paths (employer-profiles for anonymized browsing, admin-employers for full data) following the plan's anti-pattern guidance -- never a single function with conditional field return
- **Experience range bucketing as pure functions:** `bucketExperienceYears` and `anonymizeWorkHistory` in `src/lib/anonymize.ts` with `server-only` guard, following the research doc Pattern 2
- **Employer type inference from title:** Uses keyword matching (partner/associate/counsel -> "Law Firm", in-house/corporate -> "In-House", examiner/government -> "Government", fallback -> "Legal")
- **Duplicate prevention in registerEmployer:** Checks for existing employer profile before insert to prevent duplicate rows

## Deviations from Plan

None -- plan executed exactly as written.

## Duration

~3 minutes
