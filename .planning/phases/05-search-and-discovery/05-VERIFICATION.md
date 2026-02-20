---
phase: 05-search-and-discovery
verified: 2026-02-20T22:00:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Employer can filter by experience level and see correct results"
    status: failed
    reason: "Experience range filter values in UI do not match bucketExperienceYears() output, causing zero matches"
    artifacts:
      - path: "src/app/(authenticated)/employer/browse/filters.tsx"
        issue: "EXPERIENCE_RANGES values are shorthand like 2-5 without years suffix"
      - path: "src/lib/anonymize.ts"
        issue: "bucketExperienceYears() returns strings like 2-5 years with years suffix"
      - path: "src/lib/dal/employer-profiles.ts"
        issue: "Line 238: strict equality comparison always false due to value format mismatch"
    missing:
      - "Either change EXPERIENCE_RANGES values to match bucketExperienceYears output or normalize the comparison in the DAL"
---
# Phase 5: Search and Discovery Verification Report

**Phase Goal:** Employers can search and filter the candidate pool to find IP lawyers matching their specific needs
**Verified:** 2026-02-20
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Employer can filter candidates by IP specialization, technical background, location, and patent bar status | VERIFIED | employer-profiles.ts has EXISTS subqueries for specializations (line 70-88), technical domains (line 91-112), patent bar (line 115-129), location (line 132-149). FilterBar has checkbox groups for each. Browse page wires all params. |
| 2 | Employer can combine multiple filters with count and pagination | VERIFIED | Browse page builds SearchFilters from all params (lines 68-77), passes to DAL. DAL builds AND conditions (line 200), returns total count (line 243), paginates in JS (line 244-247). BuildPageUrl preserves all filters (lines 95-109). |
| 3 | Employer can save/favorite profiles and access them later | VERIFIED | savedProfiles schema table (schema.ts line 213-225), toggleSaveProfile server action (saved-profiles.ts), SaveButton with optimistic UI (saved-button.tsx), saved profiles page loads and renders saved profiles (saved/page.tsx). |
| 4 | Search results display relevance-sorted anonymized profile cards with enough detail to evaluate fit | VERIFIED | ProfileCard renders specializations, technical domains, experience range, bar admissions, education summary, anonymized work history (profile-card.tsx). PII columns never selected (employer-profiles.ts column inclusion mode). Free-text search only queries non-PII fields (lines 153-178). |
| 5 | Empty search states and no-results states provide helpful guidance | VERIFIED | Browse page empty state has filter-aware message and clear-all link (page.tsx lines 147-161). Saved page empty state shows heart icon and Browse Candidates CTA (saved/page.tsx lines 67-79). |

**Score:** 4/5 truths verified (experience range filter broken, all other filter dimensions work correctly)
### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| src/lib/db/schema.ts | savedProfiles table | VERIFIED | Lines 213-225: composite PK on (employerUserId, profileId), FK cascade, indexes |
| src/lib/db/relations.ts | savedProfiles relations | VERIFIED | Lines 107-116: bidirectional relations. Users (line 88), profiles (line 24) include many(savedProfiles) |
| drizzle/0001_enable_pg_trgm.sql | pg_trgm + GIN indexes | VERIFIED | 17 lines, enables pg_trgm and creates 5 GIN indexes on non-PII text columns |
| src/lib/dal/employer-profiles.ts | Dynamic filtering DAL | VERIFIED (with bug) | 411 lines, EXISTS subqueries for spec/tech/patent/location, free-text search, two-query strategy. Experience range filter has value mismatch bug. |
| src/lib/dal/employer-saved.ts | Saved profile queries | VERIFIED | 68 lines, exports getSavedProfileIds, getSavedProfiles, isProfileSaved. All use cache() and server-only. |
| src/actions/saved-profiles.ts | Toggle save server action | VERIFIED | 63 lines, auth check, insert-or-delete toggle, revalidates both paths |
| src/app/(authenticated)/employer/browse/filters.tsx | Multi-select filter UI | VERIFIED | 249 lines, checkboxes for specs (6) and tech (8), experience dropdown, patent bar toggle, location input with 300ms debounce, clear all button |
| src/app/(authenticated)/employer/browse/saved-button.tsx | Optimistic heart toggle | VERIFIED | 52 lines, useOptimistic + useTransition, filled red heart when saved, aria-labels, disabled during pending |
| src/app/(authenticated)/employer/browse/page.tsx | Wired browse page | VERIFIED | 211 lines, reads all filter params, calls getAnonymizedProfiles with SearchFilters, loads saved IDs, passes isSaved to ProfileCard, filter-aware empty state |
| src/app/(authenticated)/employer/browse/[id]/page.tsx | Detail page with save | VERIFIED | 188 lines, imports isProfileSaved and SaveButton, renders save button next to title |
| src/app/(authenticated)/employer/saved/page.tsx | Saved profiles list | VERIFIED | 82 lines, approval gate, loads saved IDs via getSavedProfiles, parallel loads profiles, empty state with browse CTA |
| src/app/(authenticated)/employer/nav.tsx | Employer navigation | VERIFIED | 49 lines, client component with Dashboard/Browse/Saved links, active highlighting via usePathname |
| src/app/(authenticated)/employer/layout.tsx | Layout with nav | VERIFIED | 34 lines, renders EmployerNav above children |
| src/components/employer/profile-card.tsx | Card with save button | VERIFIED | 116 lines, accepts isSaved prop, renders SaveButton in card header |
| src/components/ui/checkbox.tsx | Checkbox UI component | VERIFIED | 32 lines, Radix Checkbox primitive with proper styling |
### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| browse/page.tsx | employer-profiles.ts | getAnonymizedProfiles(SearchFilters) | WIRED | Line 68: passes all filter params |
| browse/page.tsx | employer-saved.ts | getSavedProfileIds(user.id, profileIds) | WIRED | Line 81: batch lookup, result passed to each ProfileCard |
| filters.tsx | URL search params | router.replace with params | WIRED | toggleMultiParam, setSingleParam, handleLocationChange all use router.replace |
| saved-button.tsx | saved-profiles.ts action | toggleSaveProfile(profileId) | WIRED | Line 29: called inside startTransition with optimistic update |
| saved-profiles.ts action | schema.ts | insert/delete on savedProfiles | WIRED | Lines 37-55: select check, then delete or insert |
| saved/page.tsx | employer-saved.ts | getSavedProfiles(user.id) | WIRED | Line 32: loads all saved profile IDs |
| saved/page.tsx | employer-profiles.ts | getAnonymizedProfileById for each | WIRED | Lines 35-37: Promise.all parallel loading |
| employer-profiles.ts | schema.ts | EXISTS subqueries on junction tables | WIRED | Lines 70-149: profileSpecializations, profileTechnicalDomains, barAdmissions, education |
| layout.tsx | nav.tsx | EmployerNav component | WIRED | Line 30: rendered above children |
| profile-card.tsx | saved-button.tsx | SaveButton import | WIRED | Line 13: import, line 37: rendered with profileId and isSaved |
| detail page [id] | saved-button.tsx | SaveButton with isProfileSaved | WIRED | Lines 4, 14, 53, 70: imports and renders SaveButton with saved state |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| MARK-02: Search/filter by specialization, experience, location, tech background, patent bar | PARTIAL | Experience range filter broken (value mismatch). All other dimensions work correctly. |
| MARK-04: Save/favorite profiles for later viewing | SATISFIED | Full save/unsave flow with optimistic UI, saved profiles page, navigation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/app/(authenticated)/employer/page.tsx | 104 | Coming soon (My Jobs card) | Info | Expected -- Phase 8 feature |
| src/components/employer/unlock-button.tsx | 6 | Placeholder for Phase 6 | Info | Expected -- Phase 6 feature |
| src/app/(authenticated)/employer/browse/filters.tsx | 38 | Experience range value mismatch vs DAL | Blocker | Experience range filter silently returns zero results |
### Human Verification Required

#### 1. Visual Filter Panel Layout
**Test:** Navigate to /employer/browse as approved employer and verify filter panel renders cleanly
**Expected:** Specialization and technical domain checkboxes are readable, experience dropdown opens correctly, patent bar checkbox toggles, location input accepts text
**Why human:** Visual layout and spacing cannot be verified programmatically

#### 2. Optimistic Save/Unsave Interaction
**Test:** Click heart icon on a profile card, observe immediate red fill, then reload page and verify persistence
**Expected:** Heart fills red instantly (no loading delay), remains red after page reload, clicking again instantly unfills
**Why human:** Timing of optimistic UI feedback and visual state requires human observation

#### 3. Free-Text Search Does Not Leak PII
**Test:** Type a real candidate name into the search box and verify zero results
**Expected:** No profiles match (search only queries specializations, technical domains, jurisdictions, education)
**Why human:** Requires knowing actual candidate PII to test against

#### 4. Debounce Timing
**Test:** Type quickly in location field and search field, observe that URL updates only after typing stops
**Expected:** 300ms debounce delay before URL params update
**Why human:** Timing behavior requires human observation

### Gaps Summary

One gap was found that blocks full Phase 5 goal achievement:

**Experience Range Filter Value Mismatch (Blocker):** The filter UI dropdown in filters.tsx (lines 37-44) sends URL param values like "<2", "2-5", "5-10", "10-15", "15-20", "20+". The DAL at employer-profiles.ts line 238 compares these against the output of bucketExperienceYears() from anonymize.ts, which returns "< 2 years", "2-5 years", "5-10 years", etc. (with " years" suffix and a space after "<"). The strict equality check will always evaluate to false because the URL param value never matches the bucket output string. This means selecting any experience range filter will produce zero results.

The fix is straightforward: either update the EXPERIENCE_RANGES values in filters.tsx to match the bucketExperienceYears() output strings, or add a normalization step in the DAL comparison.

All other filter dimensions (specializations, technical domains, patent bar, location, free-text search), the save/favorite system, pagination, empty states, and navigation work correctly and are properly wired end-to-end.

---

_Verified: 2026-02-20_
_Verifier: Claude (gsd-verifier)_
