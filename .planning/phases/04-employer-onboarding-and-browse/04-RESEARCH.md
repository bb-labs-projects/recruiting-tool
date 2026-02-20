# Phase 4: Employer Onboarding and Browse - Research

**Researched:** 2026-02-20
**Domain:** Employer account approval, server-side anonymization, tiered data disclosure, admin employer management, browse UI
**Confidence:** HIGH

## Summary

This phase adds the employer-facing half of the platform: account creation with admin approval gating, and browsing anonymized candidate profiles. The architecture is split across three concerns: (1) schema extension for employer accounts with an approval status, (2) a Data Access Layer that enforces server-side anonymization by returning different Data Transfer Objects depending on the caller's role and approval status, and (3) employer-facing browse UI with search, filtering, and "Unlock Profile" CTAs.

The critical technical challenge is server-side anonymization. The business requirement is non-negotiable: the API response to unapproved/unpaid employers must literally not contain PII fields (name, email, phone, specific firm names, exact years of experience). This is NOT a CSS display:none situation -- it must be enforced at the data access layer before data reaches any component. The established Next.js pattern for this is the Data Transfer Object (DTO) approach documented in the official Next.js data security guide: the DAL performs authorization checks and returns role-specific, minimal DTOs.

The tiered disclosure rules from the project notes require: (a) experience shown as ranges not exact years (e.g., "5-10 years" instead of "7 years"), (b) firm names suppressed (employer field in work history hidden), (c) IP specialization categories shown but not specific matter details, (d) no name, email, phone, or other identifying details.

**Primary recommendation:** Extend the users table with an `employerStatus` field (pending/approved/rejected) and a new `employerProfiles` table for company info. Create two DAL functions: `getAnonymizedProfiles()` for employer browsing (uses Drizzle column exclusion via `columns: { name: false, email: false, phone: false }` in relational queries) and `getFullProfile()` for admin use. Implement experience range bucketing as a pure function. Use URL search params for browse pagination/filtering (established Next.js pattern).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (installed) | Schema extension, relational queries with column selection | Already in stack. v1 relational queries support `columns` option for field inclusion/exclusion |
| zod | ^4.3.6 (installed) | Server action input validation, employer registration form | Already in stack |
| next | 16.1.6 (installed) | Server components for browse pages, server actions for employer management | Already in stack |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | ^10.1.0 | Debounce search input in browse UI | Search box on employer browse page (300ms debounce) |
| shadcn/ui Card | (installed) | Profile cards in browse grid | Anonymized profile card layout |
| shadcn/ui Badge | (installed) | Specialization tags, experience range | Profile card metadata display |
| shadcn/ui Input | (installed) | Search input | Browse page search |
| shadcn/ui Select | (installed) | Filter dropdowns (specialization, experience range) | Browse page filters |
| shadcn/ui Button | (installed) | "Unlock Profile" CTA | Each profile card |
| shadcn/ui Skeleton | (installed or add) | Loading states for browse grid | Suspense fallbacks |
| @tanstack/react-table | ^8.21.3 (installed) | Admin employer management table | Admin /admin/employers page |
| lucide-react | ^0.575.0 (installed) | Icons (Lock, Search, Building, etc.) | Browse UI, CTAs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle `columns` exclusion in relational queries | `getTableColumns` + destructuring in `db.select()` | Relational queries with `columns: { name: false }` are simpler and type-safe for nested data. `getTableColumns` is better for flat `db.select()` queries. Use both where appropriate |
| URL search params for filters | Client-side state (useState) | URL params are bookmarkable, shareable, SSR-friendly, and the established Next.js pattern. Client state is lost on refresh |
| Card grid for browse | Table/list view | Cards are standard for "marketplace browse" UX. Tables are better for admin data management (already used in admin candidates). Different audiences, different patterns |
| `use-debounce` package | Custom setTimeout debounce | use-debounce is 1KB, server-rendering-safe, well-tested. Not worth hand-rolling |

### Installation

```bash
npm install use-debounce
npx shadcn@latest add skeleton
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Extended with employerProfiles, employerStatusEnum
│   │   └── relations.ts        # Extended with employerProfiles <-> users relation
│   ├── dal.ts                  # Extended with employer-specific queries
│   ├── dal/
│   │   ├── employer-profiles.ts # NEW: Anonymized profile DTOs for employers
│   │   └── admin-employers.ts   # NEW: Admin employer management queries
│   └── anonymize.ts            # NEW: Pure functions for data anonymization (experience ranges, etc.)
├── actions/
│   ├── profiles.ts             # Existing (no changes)
│   ├── employers.ts            # NEW: Employer registration, admin approve/reject
│   └── auth.ts                 # Existing (no changes)
├── app/
│   ├── (authenticated)/
│   │   └── employer/
│   │       ├── layout.tsx      # UPDATED: Gate on approval status
│   │       ├── page.tsx        # UPDATED: Dashboard with approval status
│   │       ├── pending/
│   │       │   └── page.tsx    # NEW: "Your account is pending approval" page
│   │       └── browse/
│   │           ├── page.tsx    # NEW: Anonymized profile browse (server component)
│   │           ├── search.tsx  # NEW: Client component for search + debounce
│   │           ├── filters.tsx # NEW: Client component for filter dropdowns
│   │           └── [id]/
│   │               └── page.tsx # NEW: Single anonymized profile detail
│   └── admin/
│       └── employers/
│           ├── page.tsx        # NEW: Employer list (table with approve/reject)
│           ├── columns.tsx     # NEW: TanStack Table column definitions
│           ├── data-table.tsx  # NEW: Client component DataTable wrapper
│           └── [id]/
│               └── page.tsx    # NEW: Employer detail + activity log
└── components/
    ├── employer/
    │   ├── profile-card.tsx    # NEW: Anonymized candidate profile card
    │   ├── unlock-button.tsx   # NEW: "Unlock Profile" CTA (placeholder for Phase 6)
    │   └── approval-banner.tsx # NEW: Status banner for pending/rejected employers
    └── admin/
        └── employer-actions.tsx # NEW: Approve/reject employer buttons
```

### Pattern 1: Server-Side Anonymization via DAL DTOs

**What:** The Data Access Layer returns different DTOs based on the caller's role and status. The anonymized DTO literally does not contain PII fields -- they are never selected from the database.
**When to use:** Every data fetch for employer-facing profile views.
**Why:** This is the official Next.js data security pattern. Anonymization enforced at the data access layer means no component -- server or client -- can accidentally leak PII.

```typescript
// src/lib/dal/employer-profiles.ts
import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { bucketExperienceYears, anonymizeWorkHistory } from '@/lib/anonymize'

// Source: https://nextjs.org/docs/app/guides/data-security (DTO pattern)

/**
 * Anonymized profile for employer browsing.
 * PII fields (name, email, phone) are NEVER selected from the database.
 * Work history employer names are suppressed.
 * Experience is shown as ranges.
 */
export type AnonymizedProfileDTO = {
  id: string
  specializations: string[]
  technicalDomains: string[]
  experienceRange: string          // "5-10 years" not "7 years"
  educationSummary: string[]       // "JD, University" (institution ok, no candidate name)
  barAdmissions: string[]          // "California (Active)"
  workHistorySummary: {            // Employer names SUPPRESSED
    title: string                  // "Patent Attorney"
    type: string                   // "Law Firm" / "In-house" / "Government"
    durationRange: string          // "3-5 years"
  }[]
}

export const getAnonymizedProfiles = cache(async (filters?: {
  specialization?: string
  experienceRange?: string
  search?: string
  page?: number
  pageSize?: number
}) => {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 12

  // Query ONLY non-PII fields using Drizzle column exclusion
  const results = await db.query.profiles.findMany({
    where: (profiles, { eq }) => eq(profiles.status, 'active'),
    columns: {
      id: true,
      createdAt: true,
      // PII fields explicitly EXCLUDED:
      // name: false, email: false, phone: false
      // (using inclusion mode -- only listed fields are selected)
    },
    with: {
      profileSpecializations: {
        with: { specialization: { columns: { name: true } } },
      },
      profileTechnicalDomains: {
        with: { technicalDomain: { columns: { name: true } } },
      },
      education: {
        columns: { institution: true, degree: true, field: true, year: true },
      },
      barAdmissions: {
        columns: { jurisdiction: true, status: true, year: true },
      },
      workHistory: {
        columns: {
          title: true,
          startDate: true,
          endDate: true,
          // employer: false -- SUPPRESSED (not selected)
        },
      },
    },
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
  })

  // Transform to anonymized DTOs
  return results.map((profile): AnonymizedProfileDTO => ({
    id: profile.id,
    specializations: profile.profileSpecializations.map(ps => ps.specialization.name),
    technicalDomains: profile.profileTechnicalDomains.map(ptd => ptd.technicalDomain.name),
    experienceRange: bucketExperienceYears(profile.workHistory),
    educationSummary: profile.education.map(e => `${e.degree}, ${e.institution}`),
    barAdmissions: profile.barAdmissions.map(ba =>
      `${ba.jurisdiction}${ba.status ? ` (${ba.status})` : ''}`
    ),
    workHistorySummary: anonymizeWorkHistory(profile.workHistory),
  }))
})
```

### Pattern 2: Experience Range Bucketing (Pure Function)

**What:** Convert exact start/end dates to experience range buckets. Never expose exact years.
**When to use:** All employer-facing profile views.

```typescript
// src/lib/anonymize.ts
import 'server-only'

/**
 * Bucket total years of experience into a range string.
 * Ranges: "< 2 years", "2-5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years"
 */
export function bucketExperienceYears(
  workHistory: { startDate: string | null; endDate: string | null }[]
): string {
  let totalMonths = 0

  for (const wh of workHistory) {
    if (!wh.startDate) continue
    const start = new Date(wh.startDate)
    const end = wh.endDate ? new Date(wh.endDate) : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12
      + (end.getMonth() - start.getMonth())
    totalMonths += Math.max(0, months)
  }

  const years = totalMonths / 12

  if (years < 2) return '< 2 years'
  if (years < 5) return '2-5 years'
  if (years < 10) return '5-10 years'
  if (years < 15) return '10-15 years'
  if (years < 20) return '15-20 years'
  return '20+ years'
}

/**
 * Anonymize work history: suppress employer names, categorize by type,
 * bucket individual durations.
 */
export function anonymizeWorkHistory(
  workHistory: {
    title: string
    startDate: string | null
    endDate: string | null
  }[]
): { title: string; type: string; durationRange: string }[] {
  return workHistory.map(wh => ({
    title: wh.title,
    type: inferEmployerType(wh.title),
    durationRange: bucketDuration(wh.startDate, wh.endDate),
  }))
}

function inferEmployerType(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('partner') || lower.includes('associate') || lower.includes('counsel'))
    return 'Law Firm'
  if (lower.includes('in-house') || lower.includes('corporate'))
    return 'In-House'
  if (lower.includes('examiner') || lower.includes('government'))
    return 'Government'
  return 'Legal'
}

function bucketDuration(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'Unknown'
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  if (years < 1) return '< 1 year'
  if (years < 3) return '1-3 years'
  if (years < 5) return '3-5 years'
  if (years < 10) return '5-10 years'
  return '10+ years'
}
```

### Pattern 3: Employer Account Approval Schema

**What:** Extend the database with an employer-specific table for company information and approval status, tied to the existing users table.
**When to use:** All employer account management.

```typescript
// Addition to src/lib/db/schema.ts

export const employerStatusEnum = pgEnum('employer_status', [
  'pending', 'approved', 'rejected',
])

export const employerProfiles = pgTable('employer_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyWebsite: varchar('company_website', { length: 500 }),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  contactTitle: varchar('contact_title', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  status: employerStatusEnum('status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('employer_profiles_user_idx').on(table.userId),
  index('employer_profiles_status_idx').on(table.status),
])
```

**Design decision:** Separate `employerProfiles` table rather than adding columns to `users`, because:
1. Only employer users need these fields (candidates and admins do not)
2. Keeps the users table clean and role-agnostic
3. The employer profile has its own lifecycle (pending -> approved/rejected)
4. Makes it easy to query pending employers without filtering all users

### Pattern 4: Approval-Gated Employer Layout

**What:** The employer layout checks approval status and redirects unapproved employers to a "pending" or "rejected" page. Only approved employers can access browse pages.
**When to use:** The employer route group layout.

```typescript
// src/app/(authenticated)/employer/layout.tsx (UPDATED)
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    redirect('/login')
  }

  const employerProfile = await getEmployerProfile(user.id)

  // New employer with no profile yet -- they need to complete registration
  if (!employerProfile) {
    // Allow access to registration page only
    // (handled by individual page logic)
  }

  // Pending approval -- show pending page
  if (employerProfile?.status === 'pending') {
    // Redirect to pending page if not already there
    // (conditional redirect in layout -- see pitfall note)
  }

  // Rejected -- show rejection notice
  if (employerProfile?.status === 'rejected') {
    // Similar gating
  }

  return <div>{children}</div>
}
```

**Important note:** Due to the Next.js pitfall that layouts do not re-render on client-side navigation, the approval status check MUST also be performed at the page level in browse pages. The layout provides the first check; the page provides the secure check.

### Pattern 5: Browse Page with URL Search Params

**What:** Server component page reads search params for filtering/pagination, fetches anonymized data, renders card grid. Client components handle search input with debounce and filter dropdowns.
**When to use:** The /employer/browse page.

```typescript
// src/app/(authenticated)/employer/browse/page.tsx
import { Suspense } from 'react'
import { getAnonymizedProfiles } from '@/lib/dal/employer-profiles'
import { ProfileCard } from '@/components/employer/profile-card'
import { SearchInput } from './search'
import { FilterBar } from './filters'
import { Pagination } from './pagination'

type SearchParams = {
  q?: string
  specialization?: string
  experience?: string
  page?: string
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1

  const profiles = await getAnonymizedProfiles({
    search: params.q,
    specialization: params.specialization,
    experienceRange: params.experience,
    page,
    pageSize: 12,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Candidates</h1>
        <p className="text-muted-foreground">
          Discover qualified IP professionals
        </p>
      </div>

      <div className="flex gap-4">
        <SearchInput />
        <FilterBar />
      </div>

      <Suspense fallback={<ProfileGridSkeleton />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </Suspense>

      <Pagination currentPage={page} />
    </div>
  )
}
```

### Pattern 6: Admin Employer Management

**What:** Admin page for managing employer accounts -- table with pending/approved/rejected status, approve/reject actions, activity log.
**When to use:** /admin/employers route.

```typescript
// src/actions/employers.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

async function requireAdmin() {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return user
}

const ApproveEmployerSchema = z.object({
  employerProfileId: z.string().uuid(),
})

export async function approveEmployer(formData: FormData) {
  try {
    const admin = await requireAdmin()
    const parsed = ApproveEmployerSchema.safeParse({
      employerProfileId: formData.get('employerProfileId'),
    })
    if (!parsed.success) return { error: 'Invalid input' }

    await db
      .update(employerProfiles)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, parsed.data.employerProfileId))

    revalidatePath('/admin/employers')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    return { error: 'Failed to approve employer' }
  }
}
```

### Anti-Patterns to Avoid

- **Client-side field filtering for anonymization:** NEVER select all fields and then filter in the component. The API response / server component data must never contain PII for unauthorized viewers. If a field hits any component boundary, it could leak.
- **CSS hiding of PII fields:** `display: none` or conditional rendering in JSX is NOT anonymization. The data is still in the HTML/JSON payload and visible in browser dev tools.
- **Single profile query function with conditional field return:** Do NOT write one function that returns all fields and then strips some. Write two separate functions: one that NEVER selects PII (for employers), one that selects everything (for admin). This prevents accidental exposure through code changes.
- **Checking approval status only in the layout:** Layouts do not re-render on client-side navigation. Always re-check approval status in page components via the DAL.
- **Storing approval status in the session cookie:** The session cookie contains role, not approval status. Approval status must be checked from the database in the DAL because admins can change it at any time, and cookie-cached status would be stale.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search debouncing | Custom setTimeout/clearTimeout | `use-debounce` useDebouncedCallback | 1KB, SSR-safe, well-tested, handles edge cases (unmount, rapid changes) |
| Data table for admin employers | Custom table with sort/filter | @tanstack/react-table (already installed) | Already used for admin candidates -- consistent pattern |
| Experience range bucketing | Inline calculations in each component | Pure utility function in `lib/anonymize.ts` | Testable, reusable, centralized business logic |
| URL search param management | Manual URLSearchParams construction | `useSearchParams()` + `usePathname()` + `useRouter().replace()` | Next.js built-in hooks. Handles encoding, preserves other params |
| Form validation | Manual if/else | Zod schemas (already in stack) | Consistent with all other forms in the app |
| Loading skeletons | Custom pulse animations | shadcn/ui Skeleton component | Consistent with design system |
| Approval workflow state machine | Custom status transitions | Simple enum + server action guards | The workflow is linear (pending -> approved/rejected). No complex state machine needed |

**Key insight:** The anonymization logic is custom but the building blocks (Drizzle column selection, DTOs, server components) are all established patterns. The critical innovation is architectural: two completely separate data paths for admin vs employer, not one path with conditional filtering.

## Common Pitfalls

### Pitfall 1: Anonymization Bypass via Relational Query Defaults

**What goes wrong:** Using `db.query.profiles.findMany({ with: { workHistory: true } })` without specifying `columns` returns ALL columns of work history, including the employer name.
**Why it happens:** Drizzle's relational queries return all columns by default when using `with: { relation: true }`. The developer forgets that "true" means "all columns."
**How to avoid:** Always use explicit `columns` in the anonymized query path:
```typescript
workHistory: {
  columns: { title: true, startDate: true, endDate: true },
  // employer column is NOT listed -- never selected
}
```
**Warning signs:** Work history entries in the employer browse view showing firm names. Test by inspecting the network response / server component output.

### Pitfall 2: PII Leaking Through Type Inference

**What goes wrong:** A developer creates a TypeScript type from the full profile query and uses it for both admin and employer views. The employer component has access to PII fields even if it does not render them.
**Why it happens:** TypeScript types are derived from the query. If you query all fields and pass the result to a component, the component's props type includes PII.
**How to avoid:** Define explicit DTOs (like `AnonymizedProfileDTO`) with ONLY the safe fields. Never pass the raw Drizzle query result to employer-facing components.
**Warning signs:** Component props types that include `name`, `email`, or `phone` in employer-facing code.

### Pitfall 3: Employer Approval Status Cached in Layout

**What goes wrong:** Admin approves an employer, but the employer's layout still shows "pending" because the layout fetched the status and doesn't re-render on navigation.
**Why it happens:** Next.js layouts persist across client-side navigations and do not re-execute.
**How to avoid:** Check approval status in the page component (via DAL), not only in the layout. The layout can show a persistent UI shell, but the page must gate access.
**Warning signs:** Employer sees stale approval status until full page refresh.

### Pitfall 4: Exposing Profile UUID as Stable Identifier

**What goes wrong:** The anonymized profile card links to `/employer/browse/[id]` using the profile UUID. An employer could share this UUID externally, and it becomes a de facto identifier.
**Why it happens:** UUIDs are used as primary keys and appear in URLs.
**How to avoid:** This is acceptable for this phase. The UUID alone reveals nothing about the candidate. The concern becomes real only if UUIDs are guessable (they are not -- `uuid_generate_v4()` is random). For extra security, could use a secondary opaque identifier, but this adds complexity without clear benefit at this stage.
**Warning signs:** None -- this is an acceptable design trade-off.

### Pitfall 5: getTableColumns vs getColumns Version Mismatch

**What goes wrong:** Using `getColumns` (v1.0+) when the project uses drizzle-orm 0.45.1.
**Why it happens:** Drizzle docs now default to showing the v1.0 API. The project uses pre-1.0.
**How to avoid:** Use `getTableColumns` from `drizzle-orm` for `db.select()` queries. For `db.query` relational queries, use the `columns` option which works in both versions.
**Warning signs:** Import error: `getColumns is not exported from drizzle-orm`.

### Pitfall 6: Not Handling the "No Employer Profile Yet" State

**What goes wrong:** A user with role='employer' logs in for the first time but has no row in `employerProfiles` yet. The browse page crashes or shows empty because the DAL assumes an employer profile exists.
**Why it happens:** The user record is created during magic link authentication (Phase 1), but the employer profile is created during a separate registration step.
**How to avoid:** The DAL function `getEmployerProfile()` must handle `null` gracefully. The employer layout/page must detect missing profile and redirect to a registration/onboarding form.
**Warning signs:** 500 errors when a new employer user first logs in.

### Pitfall 7: Search on Anonymized Data is Limited

**What goes wrong:** Employer tries to search for "patent prosecution" but the search only works on fields that are visible to them.
**Why it happens:** The anonymized view excludes many text fields. Full-text search across suppressed fields would require different architecture.
**How to avoid:** Search should query specialization names, technical domain names, bar admission jurisdictions, and education fields -- all of which ARE included in the anonymized view. Do NOT search across name, email, phone, or employer names.
**Warning signs:** Search returns no results for terms that should match based on specializations.

## Code Examples

### Drizzle Column Exclusion in Relational Queries (v1 API)

```typescript
// Source: https://orm.drizzle.team/docs/rqb (v1 relational queries)
// The columns option works with both inclusion and exclusion mode.

// INCLUSION MODE (recommended for anonymization -- explicit whitelist):
const anonymized = await db.query.profiles.findMany({
  columns: {
    id: true,
    createdAt: true,
    // Only id and createdAt are selected. name, email, phone are NEVER fetched.
  },
  with: {
    workHistory: {
      columns: {
        title: true,
        startDate: true,
        endDate: true,
        // employer is NOT listed -- never fetched
      },
    },
  },
})

// EXCLUSION MODE (alternative -- explicit blacklist):
const anonymized2 = await db.query.profiles.findMany({
  columns: {
    name: false,
    email: false,
    phone: false,
    nameConfidence: false,
    emailConfidence: false,
    phoneConfidence: false,
  },
  with: {
    workHistory: {
      columns: {
        employer: false,
        description: false,
      },
    },
  },
})
```

### getTableColumns for db.select() Queries (v0.45.x)

```typescript
// Source: https://orm.drizzle.team/docs/goodies
// For pre-1.0 (0.45.x), use getTableColumns instead of getColumns
import { getTableColumns } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'

// Exclude PII fields from a flat select query
const { name, email, phone, nameConfidence, emailConfidence, phoneConfidence, ...safeColumns } =
  getTableColumns(profiles)

const anonymizedProfiles = await db.select(safeColumns).from(profiles)
```

### Employer Registration Server Action

```typescript
// src/actions/employers.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

const RegisterEmployerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  companyWebsite: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contactName: z.string().min(1, 'Contact name is required').max(255),
  contactTitle: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
})

export async function registerEmployer(formData: FormData) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    return { error: 'Unauthorized' }
  }

  const parsed = RegisterEmployerSchema.safeParse({
    companyName: formData.get('companyName'),
    companyWebsite: formData.get('companyWebsite'),
    contactName: formData.get('contactName'),
    contactTitle: formData.get('contactTitle'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return { error: Object.values(fieldErrors).flat()[0] ?? 'Invalid input' }
  }

  await db.insert(employerProfiles).values({
    userId: user.id,
    companyName: parsed.data.companyName,
    companyWebsite: parsed.data.companyWebsite || null,
    contactName: parsed.data.contactName,
    contactTitle: parsed.data.contactTitle || null,
    phone: parsed.data.phone || null,
  })

  revalidatePath('/employer')
  return { success: true }
}
```

### Search Client Component with Debounce

```typescript
// src/app/(authenticated)/employer/browse/search.tsx
'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Reset to page 1 on new search

    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    replace(`${pathname}?${params.toString()}`)
  }, 300)

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search specializations, jurisdictions..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
        className="pl-10"
      />
    </div>
  )
}
```

### Profile Card Component (Anonymized)

```tsx
// src/components/employer/profile-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import type { AnonymizedProfileDTO } from '@/lib/dal/employer-profiles'

export function ProfileCard({ profile }: { profile: AnonymizedProfileDTO }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">IP Professional</CardTitle>
        <p className="text-sm text-muted-foreground">
          {profile.experienceRange} experience
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Specializations */}
        <div className="flex flex-wrap gap-1">
          {profile.specializations.map((spec) => (
            <Badge key={spec} variant="secondary">
              {spec}
            </Badge>
          ))}
        </div>

        {/* Bar Admissions */}
        {profile.barAdmissions.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Licensed: {profile.barAdmissions.join(', ')}
          </p>
        )}

        {/* Education summary */}
        <p className="text-sm text-muted-foreground">
          {profile.educationSummary[0]}
          {profile.educationSummary.length > 1 &&
            ` +${profile.educationSummary.length - 1} more`}
        </p>

        {/* Unlock CTA */}
        <div className="mt-auto pt-3">
          <Link href={`/employer/browse/${profile.id}`}>
            <Button variant="outline" className="w-full">
              <Lock className="mr-2 size-4" />
              View Profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Admin Employer List Query

```typescript
// src/lib/dal/admin-employers.ts
import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { employerProfiles, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const getEmployerProfile = cache(async (userId: string) => {
  const [profile] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, userId))
    .limit(1)

  return profile ?? null
})

export const getAllEmployerProfiles = cache(async () => {
  return db
    .select({
      id: employerProfiles.id,
      companyName: employerProfiles.companyName,
      contactName: employerProfiles.contactName,
      contactTitle: employerProfiles.contactTitle,
      status: employerProfiles.status,
      createdAt: employerProfiles.createdAt,
      reviewedAt: employerProfiles.reviewedAt,
      userEmail: users.email,
    })
    .from(employerProfiles)
    .innerJoin(users, eq(employerProfiles.userId, users.id))
    .orderBy(employerProfiles.createdAt)
})
```

### Employer Relations Extension

```typescript
// Addition to src/lib/db/relations.ts

import { employerProfiles } from './schema'

export const employerProfilesRelations = relations(
  employerProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [employerProfiles.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [employerProfiles.reviewedBy],
      references: [users.id],
      // Note: This will need a relation name to avoid ambiguity
      // since there are two relations from employerProfiles to users
    }),
  })
)

export const usersRelations = relations(users, ({ one, many }) => ({
  employerProfile: one(employerProfiles, {
    fields: [users.id],
    references: [employerProfiles.userId],
  }),
  // ... existing relations if any
}))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side field filtering (CSS hide) | Server-side DTO pattern (DAL returns only safe fields) | Next.js 14+ (2024) | Anonymization must happen before data reaches any component. Official Next.js docs mandate this |
| Single "getProfile" with conditional returns | Two separate DAL functions (anonymized + full) | Best practice | Eliminates accidental PII exposure. Type system enforces separation |
| `getColumns()` in Drizzle | `getTableColumns()` (pre-1.0) | Drizzle 1.0.0-beta.1 | Project uses 0.45.1 -- must use `getTableColumns`. Relational query `columns` option works in both |
| `useFormState` | `useActionState` (React 19) | React 19 | Already adopted in prior phases |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Already adopted in prior phases |
| searchParams as sync prop | `searchParams` as Promise (must await) | Next.js 16 | `const params = await searchParams` -- already used in Phase 3 code |

**Deprecated/outdated:**
- `getColumns` from drizzle-orm: Only available in v1.0+. Use `getTableColumns` with 0.45.1.
- Client-side anonymization: Never acceptable for the business model. Server-side DTO is mandatory.

## Open Questions

1. **Employer onboarding flow: registration before or during first login?**
   - What we know: The magic link auth system creates a user with role='employer' on first login if auto-creation is enabled. But the employer profile (company info) needs a separate step.
   - What's unclear: Whether employers should be pre-invited by admin (admin creates the user, sends magic link) or self-register (landing page form creates user + requests magic link).
   - Recommendation: Support both paths. The employer can request a magic link from the login page with an email. If the user doesn't exist, auto-create with role='employer'. After first login, redirect to a registration form that creates the `employerProfiles` row. This keeps the auth flow simple and lets the onboarding flow collect company details.

2. **Drizzle v1 relational queries with `columns` option for nested relations**
   - What we know: The `columns` option is documented for v1 relational queries. It works at both the top level and in nested `with` clauses.
   - What's unclear: Whether the v1 `columns` option in nested relations (e.g., `workHistory: { columns: { employer: false } }`) works correctly in 0.45.1 or was added later.
   - Recommendation: Test this early in implementation. If `columns` in nested `with` doesn't work, fall back to selecting all columns and mapping/stripping in the DTO transformation function (still server-side, still safe, just less elegant at the query level).

3. **How should employer self-registration work with the magic link flow?**
   - What we know: Currently the magic link verify endpoint auto-creates users or verifies existing ones. The user role is set at creation time. But there's no UI for a new employer to choose their role.
   - What's unclear: Whether the login page should have a "Register as Employer" path or if employers are invited by admin.
   - Recommendation: Add a `/register/employer` page that collects email + company info, creates the user with role='employer', creates the employerProfile with status='pending', and sends a magic link. This separates employer registration from candidate login and gives admin a clear queue of pending employers.

4. **Activity tracking for admin employer view (ADMN-02)**
   - What we know: The requirement says "admin can view activity of approved employers." This implies tracking which profiles employers have viewed.
   - What's unclear: The exact scope of "activity" -- is it page views, search queries, unlock requests, or all three?
   - Recommendation: For this phase, track profile view events (employer viewed anonymized profile detail). Store as a simple `employer_activity_log` table. Expand in Phase 6 when unlock/payment events exist. Keep the schema flexible.

## Sources

### Primary (HIGH confidence)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) - DTO pattern, DAL for role-based field filtering, official recommendation against client-side filtering
- [Drizzle ORM Include/Exclude Columns](https://orm.drizzle.team/docs/guides/include-or-exclude-columns) - `getTableColumns` (pre-1.0), `columns` option in relational queries, conditional column selection
- [Drizzle ORM v1 Relational Queries](https://orm.drizzle.team/docs/rqb) - `columns` option, `with` clause column filtering
- [Drizzle ORM Goodies](https://orm.drizzle.team/docs/goodies) - `getTableColumns` utility function, confirmed pre-1.0 naming
- [Next.js Search and Pagination Pattern](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL search params, debounced search, server component pagination
- Existing codebase: src/lib/dal.ts, src/lib/db/schema.ts, src/actions/profiles.ts (established patterns)

### Secondary (MEDIUM confidence)
- [use-debounce npm](https://www.npmjs.com/package/use-debounce) - v10.1.0, 1KB, server-rendering safe
- [Next.js Data Access Layer Pattern (aysh.me)](https://aysh.me/blogs/data-access-layer-nextjs) - Community explanation of the DAL pattern
- [Building RBAC in Next.js (Medium)](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa) - Role-based access control patterns

### Tertiary (LOW confidence)
- Experience range bucketing: Based on common recruiting platform patterns. The specific bucket sizes (< 2, 2-5, 5-10, etc.) are a design decision that should be validated with stakeholders. No single authoritative source.
- Employer type inference from job title: Heuristic approach. May need refinement based on actual IP law job title patterns in the data.

## Metadata

**Confidence breakdown:**
- Server-side anonymization pattern: HIGH - Official Next.js documentation explicitly recommends the DTO/DAL pattern for this exact use case. Drizzle column selection verified in docs.
- Schema extension: HIGH - Standard Drizzle table definition pattern, consistent with existing codebase (profileStatusEnum, users table extension).
- Employer approval workflow: HIGH - Simple enum-based status with server action mutations. Follows the exact same pattern as profile approval in Phase 3.
- Browse UI (search/pagination): HIGH - Follows official Next.js learn tutorial pattern for search with URL params. Verified with Next.js 16.1.6 docs.
- Experience range bucketing: MEDIUM - Business logic is custom. Bucket sizes are reasonable but not validated against actual data distribution.
- Drizzle v1 `columns` option in nested relations: MEDIUM - Documented but not tested against 0.45.1. May need runtime validation.
- Activity tracking scope: LOW - Requirement says "view activity" but scope is ambiguous. Recommend starting simple.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- stack is stable, no rapidly changing APIs)
