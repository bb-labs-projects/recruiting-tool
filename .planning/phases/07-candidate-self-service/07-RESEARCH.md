# Phase 7: Candidate Self-Service - Research

**Researched:** 2026-02-20
**Domain:** Candidate registration flow, profile ownership, CV upload/parsing reuse, profile editing UI, duplicate detection
**Confidence:** HIGH

## Summary

Phase 7 adds a candidate-facing self-service flow where IP lawyers can self-register, upload their CV for automatic parsing, review and correct their parsed profile, and manage/re-upload at any time. The key challenge is that the existing `profiles` table has NO `userId` column -- profiles were designed for agency-uploaded CVs with no user ownership. Adding a `userId` foreign key to `profiles` is the foundational schema change that enables all candidate self-service features.

The existing codebase provides most of the building blocks. The magic link auth system already auto-creates candidate users on first login (in `request-magic-link.ts` line 44-47). The CV parsing pipeline (`parseSingleCv`) and blob upload infrastructure (Vercel Blob + `@vercel/blob/client`) are fully operational. The admin profile editing UI (inline edit fields, profile form) can be adapted for candidate use. The critical new work is: (1) schema change to link profiles to users, (2) candidate-facing CV upload API route (separate from admin), (3) candidate profile view/edit pages, (4) duplicate detection logic, and (5) ensuring self-registered profiles flow through the same review pipeline as agency-uploaded ones.

The approach should mirror the established employer registration pattern: candidate logs in via magic link, lands on a dashboard, sees "complete your profile" flow if no profile exists, uploads CV, profile goes to `pending_review` status, admin reviews and approves just like agency-uploaded profiles. This ensures "no second-class profiles" per the success criteria.

**Primary recommendation:** Add `userId` column to `profiles` table, create candidate-specific DAL module and server actions (separate from admin), reuse existing `parseSingleCv` and Vercel Blob upload infrastructure, adapt admin `ProfileForm` for candidate editing (without confidence badges), and add duplicate detection at upload time.

## Standard Stack

No new libraries are needed. Phase 7 reuses the existing stack entirely.

### Core (Already Installed)

| Library | Version | Purpose | Reuse |
|---------|---------|---------|-------|
| @vercel/blob | (installed) | Client-side CV PDF upload to Vercel Blob | Reuse `upload()` from admin CV upload page |
| @anthropic-ai/sdk | (installed) | Claude API for CV parsing | Reuse via `parseSingleCv()` |
| drizzle-orm | 0.45.1 | Schema changes, queries | Add `userId` column to profiles |
| zod | 4.3.6 | Form validation | Candidate profile validation schemas |
| shadcn/ui | (installed) | UI components | Card, Input, Button, Badge, etc. |
| lucide-react | (installed) | Icons | FileText, Upload, CheckCircle, etc. |

### No New Dependencies Required

All needed functionality exists in the current stack:
- File upload: `@vercel/blob/client` `upload()` function
- CV parsing: `parseSingleCv()` in `src/lib/cv-parser/parse.ts`
- Auth: magic link auto-creates candidate users
- UI components: shadcn/ui Card, Input, Button, Badge, Separator, Tabs, Dialog
- Email notifications: Resend (for duplicate detection alerts to admin)

## Architecture Patterns

### Schema Change: Link Profiles to Users

**What:** Add optional `userId` column to `profiles` table
**Why:** Currently profiles have no user ownership. Agency-uploaded CVs will have `userId: null` (owned by no specific user). Self-registered candidates will have `userId` pointing to their user record.
**Critical detail:** The column MUST be nullable because existing agency-uploaded profiles have no associated user.

```typescript
// Schema addition to profiles table
userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
```

Plus add a relation in `relations.ts`:
```typescript
// In profilesRelations, add:
user: one(users, {
  fields: [profiles.userId],
  references: [users.id],
})
// In usersRelations, add:
profile: one(profiles, {
  fields: [users.id],
  references: [profiles.userId],
})
```

**Index:** Add index on `profiles.userId` for fast lookup of "my profile" queries.
**Unique constraint consideration:** A candidate should have exactly one profile. Use a partial unique index: `CREATE UNIQUE INDEX profiles_user_id_unique ON profiles(user_id) WHERE user_id IS NOT NULL` to allow multiple NULLs (agency uploads) but only one profile per user.

### Recommended Route Structure

```
src/app/(authenticated)/candidate/
  layout.tsx           # Candidate layout with nav (replace current pass-through)
  page.tsx             # Dashboard (replace placeholder) - shows profile status
  nav.tsx              # CandidateNav component (mirror EmployerNav pattern)
  profile/
    page.tsx           # View/edit parsed profile (reuse ProfileForm pattern)
  upload/
    page.tsx           # CV upload page (adapt from admin cv-upload)
```

### Pattern 1: Candidate Registration Flow (Mirror Employer Pattern)

**What:** Multi-step flow: Login -> Dashboard -> Upload CV -> Parse -> Review Profile -> Await Admin Approval
**When to use:** New candidate first visit
**Why:** Mirrors the employer registration pattern (login -> register -> pending -> approved) that already works well

```
Flow:
1. Candidate enters email on /login
2. Magic link auto-creates user with role=candidate (ALREADY WORKS)
3. Candidate clicks magic link, verified, redirected to /candidate
4. /candidate dashboard checks for existing profile via DAL
   - No profile: show "Upload your CV to create your profile" CTA
   - Profile exists: show profile summary with status badge
5. /candidate/upload: drag-and-drop PDF upload (adapted from admin)
   - Upload to Vercel Blob via candidate-specific API route
   - Trigger parse immediately (single CV, not batch)
   - Show parsing progress with polling
6. After parse completes: redirect to /candidate/profile
7. /candidate/profile: show parsed data with edit capability
   - Candidate can correct extraction errors
   - "Submit for Review" button sets status to pending_review
8. Admin sees profile in /admin/candidates like any other profile
9. Admin approves -> status=active -> appears in employer search
```

### Pattern 2: Candidate DAL Module (Separate from Admin)

**What:** Dedicated `src/lib/dal/candidate-profiles.ts` for candidate data access
**When to use:** All candidate self-service data queries
**Why:** Following the established pattern (04-01-D2: separate DAL modules for employer vs admin). Candidate sees their own full profile data (PII is theirs), but access is scoped to their own userId only.

```typescript
// src/lib/dal/candidate-profiles.ts
import 'server-only'
import { cache } from 'react'

// Get the authenticated candidate's profile (or null if none)
export const getCandidateProfile = cache(async (userId: string) => {
  // Query profiles WHERE userId = userId
  // Include ALL related data (education, work history, etc.)
  // No anonymization needed - this is the candidate's OWN data
})

// Get the authenticated candidate's CV upload records
export const getCandidateUploads = cache(async (userId: string) => {
  // Query cvUploads WHERE uploadedBy = userId
})
```

### Pattern 3: Candidate CV Upload API (Separate from Admin)

**What:** New API route at `/api/candidate/cv/upload` for candidate-initiated uploads
**When to use:** Candidate uploads their CV
**Why:** Admin CV upload route (`/api/admin/cv/upload`) uses `requireAdmin()`. Candidate needs their own route that uses `getUser()` + role check. The Vercel Blob upload pattern is identical.

```typescript
// src/app/api/candidate/cv/upload/route.ts
// Same handleUpload pattern as admin, but:
// 1. Auth: getUser() + role === 'candidate' (not requireAdmin)
// 2. Limit: one CV per candidate (check existing uploads)
// 3. After upload: auto-trigger parseSingleCv (no batch needed)
```

### Pattern 4: Reuse parseSingleCv with User Context

**What:** Call existing `parseSingleCv()` directly for candidate uploads
**When to use:** After candidate CV upload completes
**Why:** The parsing pipeline is identical regardless of who uploaded the CV. The only difference is that for candidate uploads, the resulting profile needs `userId` set.

**Key modification:** After `parseSingleCv` returns `{ success: true, profileId }`, update the newly created profile to set `userId` to the candidate's user ID. This can be done in the candidate upload API route or in a wrapper function.

```typescript
// After parseSingleCv succeeds:
await db.update(profiles)
  .set({ userId: candidateUserId })
  .where(eq(profiles.id, profileId))
```

Alternatively, modify `parseSingleCv` to accept an optional `userId` parameter that gets included in the profile insert. This is cleaner but modifies shared code.

### Pattern 5: Candidate Profile Editing (Adapt Admin ProfileForm)

**What:** Reuse the `ProfileForm` and `InlineEditField` components with candidate-specific server actions
**When to use:** Candidate profile review/edit page
**Why:** Admin already has a working inline-edit profile form. Candidate needs the same functionality but with different authorization (must own the profile instead of being admin).

Differences from admin profile editing:
1. Server actions check `user.role === 'candidate'` AND `profile.userId === user.id` (instead of `requireAdmin`)
2. No confidence badges shown to candidates (confidence is internal quality metric)
3. No approve/reject actions (those remain admin-only)
4. Add "Submit for Review" action that candidates can use
5. Editing allowed only when profile is in `pending_review` or `rejected` status (not `active` -- once approved, edits should re-trigger review)

### Pattern 6: Duplicate Detection

**What:** Check for existing profiles that might match a self-registering candidate
**When to use:** Before creating a new profile from a candidate CV upload
**Why:** Phase notes explicitly call for "Duplicate detection (email matching, name+firm matching) should flag potential overlaps between agency-uploaded and self-registered profiles"

Strategy:
1. **Email match (strong signal):** After CV parse extracts an email, check if any existing profile has the same email. If match found, flag for admin review rather than auto-merging.
2. **Name match (weaker signal):** After CV parse extracts a name, check for exact or fuzzy name matches against existing profiles. Use SQL `ILIKE` for case-insensitive comparison.
3. **Action on detection:** Do NOT auto-merge or auto-reject. Instead, mark the new profile with a flag (e.g., `duplicateSuspect: true` or a separate `duplicate_flags` table) and surface the potential duplicate to the admin in the review queue.

```sql
-- Email match query
SELECT id, name, email FROM profiles
WHERE email ILIKE $1 AND user_id IS NULL;

-- Name match query (fuzzy)
SELECT id, name, email FROM profiles
WHERE name ILIKE $1 AND user_id IS NULL;
```

### Anti-Patterns to Avoid

- **Sharing admin server actions with candidates:** Never let candidate actions call `requireAdmin()`. Create separate candidate-specific actions with ownership-scoped authorization.
- **Auto-merging duplicate profiles:** Automatic merging is dangerous (wrong person, different data quality). Flag for admin review instead.
- **Allowing profile edits after approval without re-review:** If a candidate edits an approved profile, it should go back to `pending_review` to prevent gaming the system.
- **Single upload route for admin and candidate:** Keep separate API routes. Admin can upload for any candidate; candidates can only upload for themselves.
- **Bypassing review for self-registered profiles:** Self-registered profiles MUST go through the same `pending_review` -> admin approval -> `active` pipeline. No special treatment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CV PDF upload | Custom file upload to server | `@vercel/blob/client` `upload()` | Already working in admin, handles streaming, size limits, CDN |
| CV parsing | New parser for candidate flow | `parseSingleCv()` from `src/lib/cv-parser/parse.ts` | Identical pipeline, just different caller |
| Inline editing | Custom form components | Existing `InlineEditField` + `ProfileForm` components | Already tested, handles optimistic updates, error states |
| Navigation component | Custom nav for candidates | Copy `EmployerNav` pattern from `src/app/(authenticated)/employer/nav.tsx` | Same active-state highlighting pattern |
| Auth + role checking | Custom middleware | Existing `getUser()` from `src/lib/dal.ts` + role check | Already handles session verification, caching |
| File validation | Custom PDF validation | Existing `validateFiles()` pattern from admin cv-upload | Same 10MB limit, PDF-only check |
| Status management | Custom status flow | Existing `profileStatusEnum` (pending_review, active, rejected) | Already integrated with admin review workflow |

**Key insight:** Phase 7 is primarily about creating new routes and wiring existing building blocks together with candidate-scoped authorization. Very little truly new functionality needs to be built.

## Common Pitfalls

### Pitfall 1: Profiles Table Has No userId Column

**What goes wrong:** Attempting to query "my profile" without the userId foreign key.
**Why it happens:** The profiles table was designed for agency-uploaded CVs with no user ownership concept.
**How to avoid:** FIRST task of this phase must be the schema migration adding `userId` to profiles. Everything else depends on it.
**Warning signs:** "Column not found" errors when trying to filter profiles by userId.

### Pitfall 2: parseSingleCv Creates Profile Without userId

**What goes wrong:** After parsing, the new profile has `userId: null` even for candidate-uploaded CVs.
**Why it happens:** `parseSingleCv()` never sets userId because it was built for admin-only flow.
**How to avoid:** Either (a) update parseSingleCv to accept an optional userId parameter, or (b) update the profile's userId immediately after parse completes in the candidate upload flow. Option (b) is simpler and avoids modifying shared code that admin flow also uses.
**Warning signs:** Candidate sees "Upload your CV" even after successfully uploading because the DAL query `WHERE userId = ?` returns nothing.

### Pitfall 3: Candidate Editing Approved Profile Without Re-Review

**What goes wrong:** Candidate edits their approved profile, changes appear immediately in employer search without admin review.
**Why it happens:** Admin inline-edit doesn't change profile status. If candidate uses the same pattern, edits bypass review.
**How to avoid:** Candidate profile edit actions should check current status. If profile is `active`, editing should change status back to `pending_review`. Show a warning: "Editing will send your profile back for review and temporarily remove it from search results."
**Warning signs:** Profiles with incorrect or gaming content appearing in employer search without admin having reviewed the changes.

### Pitfall 4: Vercel Blob handleUpload Auth Scope

**What goes wrong:** Candidate upload route using `requireAdmin()` from copy-paste of admin route.
**Why it happens:** Copying the admin CV upload route handler without updating auth.
**How to avoid:** Candidate upload route must use `getUser()` + `user.role === 'candidate'` check. Create a `requireCandidate()` helper or inline the check.
**Warning signs:** 403 Forbidden errors when candidates try to upload.

### Pitfall 5: Multiple Profiles Per Candidate

**What goes wrong:** Candidate uploads CV twice, creating two profiles linked to the same user.
**Why it happens:** No uniqueness constraint on `profiles.userId` and no check before creating.
**How to avoid:** (1) Partial unique index on `profiles.userId WHERE userId IS NOT NULL`. (2) Check for existing profile in the upload flow before allowing a new upload. For re-uploads, the existing profile should be updated/replaced, not duplicated.
**Warning signs:** Candidate shows up twice in search results. DAL returns multiple profiles for one user.

### Pitfall 6: Re-Upload CV Replacing vs Creating New Profile

**What goes wrong:** When candidate re-uploads a CV, the old profile and all its related data (education, work history, etc.) needs to be handled properly.
**Why it happens:** `parseSingleCv` always creates a NEW profile. Re-upload needs different logic.
**How to avoid:** For re-uploads, delete the old profile's related data (or the whole profile) and create fresh from the new parse. OR keep the old profile and update it with new parsed data. The simpler approach is: (1) delete old related data (education, work_history, etc.), (2) delete old profile, (3) parse new CV which creates new profile, (4) set userId on new profile. This is cleaner than trying to merge/update.
**Warning signs:** Orphaned related data, duplicate entries in education/work_history tables.

### Pitfall 7: Admin Upload Route Accidentally Accepting Candidate Requests

**What goes wrong:** If admin and candidate upload routes share the same handleUploadUrl, a candidate could potentially upload through the admin endpoint.
**How to avoid:** Candidate upload uses its own API route path: `/api/candidate/cv/upload` (not `/api/admin/cv/upload`). Each route has its own auth check.
**Warning signs:** Candidates showing up in admin CV upload status list unexpectedly.

## Code Examples

### Schema Migration: Add userId to Profiles

```typescript
// In src/lib/db/schema.ts - profiles table
// Add to profiles pgTable definition:
userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

// Add index in the table's index callback:
index('profiles_user_id_idx').on(table.userId),
```

After adding to schema, apply with `npx drizzle-kit push`.

For the partial unique index (one profile per user), add a raw SQL migration since Drizzle doesn't support partial unique indexes natively:
```sql
CREATE UNIQUE INDEX profiles_user_id_unique ON profiles(user_id) WHERE user_id IS NOT NULL;
```

### Candidate DAL: Get Own Profile

```typescript
// src/lib/dal/candidate-profiles.ts
import 'server-only'
import { cache } from 'react'
import { db } from '@/lib/db'
import { profiles, cvUploads } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const getCandidateProfile = cache(async (userId: string) => {
  const profile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.userId, userId),
    with: {
      education: true,
      workHistory: true,
      barAdmissions: true,
      profileSpecializations: { with: { specialization: true } },
      profileTechnicalDomains: { with: { technicalDomain: true } },
      cvUploads: true,
    },
  })
  return profile ?? null
})

export const getCandidateUploads = cache(async (userId: string) => {
  return db
    .select()
    .from(cvUploads)
    .where(eq(cvUploads.uploadedBy, userId))
    .orderBy(sql`${cvUploads.createdAt} DESC`)
})
```

### Candidate Upload API Route

```typescript
// src/app/api/candidate/cv/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getUser()
        if (!user || user.role !== 'candidate') {
          throw new Error('Unauthorized')
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Note: onUploadCompleted runs asynchronously, may not have
        // access to the request context. Store upload record here.
        // The candidate userId needs to be passed differently.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

**Note:** The Vercel Blob `onUploadCompleted` callback runs asynchronously and may not have access to the original request context. The pattern used in the admin route (separate PUT endpoint for record creation after upload) may be more reliable. Follow the same two-step pattern: POST for blob upload token, PUT for database record creation.

### Candidate Profile Edit Server Actions

```typescript
// src/actions/candidate-profiles.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

async function requireCandidateOwner(profileId: string) {
  const user = await getUser()
  if (!user || user.role !== 'candidate') {
    throw new Error('Unauthorized')
  }
  // Verify this profile belongs to this candidate
  const [profile] = await db
    .select({ id: profiles.id, userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
    .limit(1)
  if (!profile) {
    throw new Error('Unauthorized')
  }
  return user
}
```

### Duplicate Detection Query

```typescript
// In candidate upload flow, after parse completes:
async function checkForDuplicates(parsedName: string, parsedEmail: string | null) {
  const flags: string[] = []

  if (parsedEmail) {
    const emailMatch = await db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(and(
        eq(profiles.email, parsedEmail.toLowerCase()),
        isNull(profiles.userId), // only check agency-uploaded profiles
      ))
      .limit(1)

    if (emailMatch.length > 0) {
      flags.push(`Email matches existing profile: ${emailMatch[0].name} (${emailMatch[0].id})`)
    }
  }

  if (parsedName) {
    const nameMatch = await db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(and(
        ilike(profiles.name, parsedName),
        isNull(profiles.userId),
      ))
      .limit(1)

    if (nameMatch.length > 0) {
      flags.push(`Name matches existing profile: ${nameMatch[0].name} (${nameMatch[0].id})`)
    }
  }

  return flags
}
```

### CandidateNav Component (Mirror EmployerNav)

```typescript
// src/app/(authenticated)/candidate/nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/candidate', label: 'Dashboard' },
  { href: '/candidate/profile', label: 'My Profile' },
  { href: '/candidate/upload', label: 'Upload CV' },
]

export function CandidateNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b">
      <div className="flex gap-4 px-6 py-2">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm py-1.5 border-b-2 transition-colors ${
              pathname === href
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Profiles have no user ownership | Add `userId` to profiles | This phase | Enables candidate self-service |
| Admin-only CV upload | Candidate + admin upload paths | This phase | Separate API routes with role-specific auth |
| Admin-only profile editing | Candidate can edit own profile | This phase | Separate server actions with ownership checks |
| Single entry path (agency upload) | Dual entry: agency upload + self-registration | This phase | Profiles must be indistinguishable in search results |

**Unchanged:**
- Parsing pipeline (`parseSingleCv`) -- no changes needed to core logic
- Profile status flow (pending_review -> active/rejected) -- same for all profiles
- Admin review workflow -- self-registered profiles appear alongside agency-uploaded
- Employer browse/search -- no changes needed, both profile types have same schema
- Anonymization -- works identically for both profile sources

## Open Questions

1. **Profile Ownership Claim for Existing Agency Profiles**
   - What we know: Agency-uploaded profiles have `userId: null`. A candidate may register with the same email as an existing agency-uploaded profile.
   - What's unclear: Should the candidate be able to "claim" the existing agency profile, or should it create a duplicate that admin merges?
   - Recommendation: Flag as duplicate for admin review. Do not auto-claim. Admin can manually link the profiles by setting `userId` on the existing profile. This is the safest approach and avoids impersonation risk.

2. **Re-Upload Strategy: Delete and Recreate vs Update in Place**
   - What we know: When a candidate uploads a new CV, the old profile data needs to be replaced.
   - What's unclear: Should we delete the old profile and all related data, or update in place?
   - Recommendation: Delete old related data + old profile, then create fresh from new parse. Simpler, avoids partial update edge cases. The old profile ID will change, but since the candidate only has one profile (found via `userId`), this is transparent. If the profile was already `active`, the re-upload should set the new profile back to `pending_review`.

3. **Duplicate Detection Storage**
   - What we know: Duplicate flags need to be surfaced to admin during review.
   - What's unclear: Separate `duplicate_flags` table vs column on profiles vs notes field.
   - Recommendation: Use a text column `duplicateNotes` on the `profiles` table. Simple, no extra table, admin sees it alongside other profile data. Alternatively, store as part of `rejectionNotes` if the admin decides to reject.

4. **Edit Restrictions for Active Profiles**
   - What we know: Candidates should be able to edit their profile, but edits to approved profiles need re-review.
   - What's unclear: Should editing be blocked entirely for active profiles, or allowed with automatic status change?
   - Recommendation: Allow editing but show a warning and change status back to `pending_review` on save. This keeps the candidate in control while maintaining admin oversight.

## Sources

### Primary (HIGH confidence)

- **Codebase analysis** - Direct reading of all relevant source files:
  - `src/lib/db/schema.ts` -- profiles table has NO userId column (confirmed)
  - `src/lib/cv-parser/parse.ts` -- parseSingleCv creates profiles without userId
  - `src/lib/auth/request-magic-link.ts` -- auto-creates candidate users on first login
  - `src/app/admin/cv-upload/page.tsx` -- Vercel Blob upload pattern with polling
  - `src/app/api/admin/cv/upload/route.ts` -- handleUpload with auth pattern
  - `src/components/admin/profile-form.tsx` -- inline edit ProfileForm component
  - `src/components/admin/inline-edit-field.tsx` -- InlineEditField component
  - `src/actions/profiles.ts` -- admin profile update server actions pattern
  - `src/actions/employers.ts` -- registerEmployer pattern for registration flow
  - `src/lib/dal/employer-profiles.ts` -- DAL module pattern with anonymization
  - `src/lib/dal/admin-employers.ts` -- getEmployerProfile DAL pattern
  - `src/app/(authenticated)/employer/nav.tsx` -- EmployerNav component pattern
  - `src/app/(authenticated)/employer/layout.tsx` -- employer layout with role check
  - `src/proxy.ts` -- role-based routing (candidate routes already handled)

### Secondary (MEDIUM confidence)

- **Established project patterns from prior phases** - Verified through STATE.md decisions:
  - [04-01-D2] Two separate DAL modules pattern (apply to candidate DAL)
  - [04-02-D1] Page-level approval gating pattern (apply to candidate profile status gating)
  - [05-03-D1] EmployerNav extraction pattern (replicate for CandidateNav)
  - Magic link auth spec in `01-magic-link-auth.md` (candidate flow already supported)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all reusing existing installed packages verified in codebase
- Architecture: HIGH - Patterns directly derived from existing codebase (employer registration flow, admin profile editing, DAL modules)
- Schema changes: HIGH - Direct codebase analysis confirmed profiles.userId gap; migration approach is standard Drizzle pattern
- Pitfalls: HIGH - Based on direct source code reading (parseSingleCv doesn't set userId, admin routes use requireAdmin, etc.)
- Duplicate detection: MEDIUM - Strategy is sound but implementation details (fuzzy matching quality, admin UX for resolving) may need iteration

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- all based on stable existing codebase, no external dependency changes)
