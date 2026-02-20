# Phase 3: Admin Review and Profile Management - Research

**Researched:** 2026-02-20
**Domain:** Admin review UI, profile CRUD, PDF viewing, data tables, inline editing, schema extension
**Confidence:** HIGH

## Summary

This phase builds the admin-facing profile review and management system. The admin needs to: (1) see a review queue of parsed profiles sorted by confidence, (2) view parsed data side-by-side with the original PDF CV, (3) approve/reject profiles, (4) edit any field on any profile at any time, and (5) browse all profiles in a searchable, sortable, filterable list.

The standard approach is: extend the database schema with a profile status field and rejection notes, use the shadcn/ui Resizable component (built on react-resizable-panels) for the side-by-side PDF/data layout, embed the PDF via iframe (Vercel Blob now supports inline content-disposition and has removed the X-Frame-Options DENY header), use TanStack Table with shadcn/ui Table for the searchable/sortable candidate list, implement server actions for all mutations with revalidatePath for cache busting, and define Drizzle v1 relations for efficient nested data queries.

The key technical decision is PDF viewing: an iframe is sufficient here because the admin only needs to visually reference the original CV while editing fields -- no annotation, text selection, or programmatic page control is needed. This avoids the complexity of react-pdf (worker configuration, SSR issues, dynamic imports) for a use case that does not require it.

**Primary recommendation:** Use iframe for PDF viewing, shadcn/ui Resizable for side-by-side layout, TanStack Table for the candidate list, Drizzle v1 relational queries (db.query with relations()) for nested data fetching, and server actions with revalidatePath for all profile mutations.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Data table with sorting, filtering, pagination | De facto standard for headless React tables. shadcn/ui data table is built on it |
| react-resizable-panels | (via shadcn/ui) | Resizable side-by-side panel layout | Underlying library for shadcn/ui Resizable component. Keyboard accessible, well maintained |
| drizzle-orm | ^0.45.1 (installed) | Relational queries for nested profile data | Already in stack. v1 relations() API with db.query for eager loading related tables |
| zod | ^4.3.6 (installed) | Server action input validation | Already in stack. Standard for form validation in Next.js server actions |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Table | (installed via CLI) | Table UI primitives | Render the data table markup (thead, tbody, tr, td) |
| shadcn/ui Badge | (installed via CLI) | Status indicators (pending, active, rejected) and confidence badges | Profile status and field confidence display |
| shadcn/ui Tabs | (installed via CLI) | Organize profile sections (overview, education, work, etc.) | Profile detail view organization |
| shadcn/ui Dialog | (installed via CLI) | Confirmation dialogs (approve, reject with notes) | Destructive action confirmation |
| shadcn/ui Resizable | (installed via CLI) | Side-by-side PDF + data panel | Review page layout |
| shadcn/ui Select | (installed via CLI) | Dropdown for status filters, confidence selectors | Filter controls and inline edits for enum fields |
| shadcn/ui Textarea | (installed via CLI) | Rejection notes, description editing | Multi-line text input for rejection reason and work history descriptions |
| shadcn/ui Separator | (installed via CLI) | Visual section dividers | Between profile sections |
| lucide-react | ^0.575.0 (installed) | Icons for actions, status indicators | Already in stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| iframe PDF viewer | react-pdf (wojtekmaj, v10.3.0) | react-pdf gives programmatic control (page navigation, zoom, text selection) but requires PDF.js worker setup, dynamic import with ssr:false, and adds ~500KB. iframe is zero-config and sufficient for visual reference during review |
| TanStack Table | Plain HTML table with manual sort/filter | TanStack adds ~15KB but provides built-in column sorting, filtering, pagination, and row selection. Manual implementation is error-prone for these features |
| Drizzle v1 relations (db.query) | Raw SQL joins via db.select().from().leftJoin() | Relational queries auto-aggregate nested data. Manual joins require hand-mapping flat results to nested structures. Relations v1 is stable in 0.45.1 |
| Server actions + revalidatePath | API route handlers + client fetch | Server actions are the Next.js 16 recommended pattern for mutations. They integrate with useActionState for pending states and work with progressive enhancement |

**Installation:**
```bash
npx shadcn@latest add table badge tabs dialog select textarea separator resizable
npm install @tanstack/react-table
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Extended with profileStatusEnum, rejectionNotes
│   │   └── relations.ts        # NEW: Drizzle v1 relations definitions
│   ├── dal.ts                  # Existing DAL, extended with profile queries
│   └── actions/
│       └── profiles.ts         # NEW: Server actions for profile CRUD
├── app/
│   └── admin/
│       ├── candidates/
│       │   ├── page.tsx        # Candidate list (server component, data fetching)
│       │   ├── columns.tsx     # TanStack Table column definitions
│       │   ├── data-table.tsx  # Client component: DataTable wrapper
│       │   └── [id]/
│       │       ├── page.tsx    # Profile detail/review (server component)
│       │       └── review/
│       │           └── page.tsx # Side-by-side review with PDF
│       └── layout.tsx          # Existing admin layout (unchanged)
└── components/
    ├── ui/                     # shadcn/ui primitives (table, badge, etc.)
    └── admin/
        ├── profile-form.tsx    # Reusable profile edit form (client component)
        ├── confidence-badge.tsx # Confidence level badge (high/medium/low)
        ├── status-badge.tsx    # Profile status badge (pending/active/rejected)
        ├── review-panel.tsx    # Side-by-side review layout
        └── pdf-viewer.tsx      # iframe PDF wrapper component
```

### Pattern 1: Drizzle v1 Relations for Nested Profile Data
**What:** Define relations between profiles and all child tables (education, work history, specializations, etc.) so that db.query.profiles.findMany({ with: {...} }) returns fully nested objects in a single SQL query.
**When to use:** Every profile fetch (list, detail, review)
**Example:**
```typescript
// src/lib/db/relations.ts
// Source: https://orm.drizzle.team/docs/relations
import { relations } from 'drizzle-orm'
import {
  profiles,
  cvUploads,
  education,
  workHistory,
  barAdmissions,
  profileSpecializations,
  profileTechnicalDomains,
  specializations,
  technicalDomains,
} from './schema'

export const profilesRelations = relations(profiles, ({ many }) => ({
  education: many(education),
  workHistory: many(workHistory),
  barAdmissions: many(barAdmissions),
  profileSpecializations: many(profileSpecializations),
  profileTechnicalDomains: many(profileTechnicalDomains),
}))

export const educationRelations = relations(education, ({ one }) => ({
  profile: one(profiles, {
    fields: [education.profileId],
    references: [profiles.id],
  }),
}))

export const workHistoryRelations = relations(workHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [workHistory.profileId],
    references: [profiles.id],
  }),
}))

export const barAdmissionsRelations = relations(barAdmissions, ({ one }) => ({
  profile: one(profiles, {
    fields: [barAdmissions.profileId],
    references: [profiles.id],
  }),
}))

export const profileSpecializationsRelations = relations(
  profileSpecializations,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileSpecializations.profileId],
      references: [profiles.id],
    }),
    specialization: one(specializations, {
      fields: [profileSpecializations.specializationId],
      references: [specializations.id],
    }),
  })
)

export const profileTechnicalDomainsRelations = relations(
  profileTechnicalDomains,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileTechnicalDomains.profileId],
      references: [profiles.id],
    }),
    technicalDomain: one(technicalDomains, {
      fields: [profileTechnicalDomains.technicalDomainId],
      references: [technicalDomains.id],
    }),
  })
)

export const cvUploadsRelations = relations(cvUploads, ({ one }) => ({
  profile: one(profiles, {
    fields: [cvUploads.profileId],
    references: [profiles.id],
  }),
}))
```

**DB initialization must include relations:**
```typescript
// src/lib/db/index.ts (updated)
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import * as relations from './relations'

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: { ...schema, ...relations },
})
```

**Querying a profile with all nested data:**
```typescript
const profile = await db.query.profiles.findFirst({
  where: (profiles, { eq }) => eq(profiles.id, profileId),
  with: {
    education: true,
    workHistory: {
      orderBy: (wh, { desc }) => [desc(wh.startDate)],
    },
    barAdmissions: true,
    profileSpecializations: {
      with: {
        specialization: true,
      },
    },
    profileTechnicalDomains: {
      with: {
        technicalDomain: true,
      },
    },
  },
})
```

### Pattern 2: Schema Extension for Profile Status
**What:** Add status, rejectionNotes, and reviewedAt fields to the profiles table, plus a new pgEnum for profile status.
**When to use:** Core schema change required before any review functionality.
**Example:**
```typescript
// Addition to src/lib/db/schema.ts
export const profileStatusEnum = pgEnum('profile_status', [
  'pending_review', 'active', 'rejected',
])

// Updated profiles table (add these columns)
// status: profileStatusEnum('status').notNull().default('pending_review'),
// rejectionNotes: text('rejection_notes'),
// reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
// reviewedBy: uuid('reviewed_by').references(() => users.id),
```

**Migration strategy:** Add new columns with defaults so existing data is valid:
- `status` defaults to `'pending_review'` (all existing parsed profiles need review)
- `rejectionNotes` is nullable (only populated on rejection)
- `reviewedAt` is nullable (set when approved/rejected)
- `reviewedBy` is nullable (set when approved/rejected)

### Pattern 3: Server Actions for Profile Mutations
**What:** Use Next.js server actions (functions marked with 'use server') for all profile mutations. Call revalidatePath after mutations to refresh the UI.
**When to use:** All write operations: approve, reject, edit profile fields, add/remove related data.
**Example:**
```typescript
// src/lib/actions/profiles.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

const ApproveProfileSchema = z.object({
  profileId: z.string().uuid(),
})

export async function approveProfile(formData: FormData) {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const parsed = ApproveProfileSchema.safeParse({
    profileId: formData.get('profileId'),
  })

  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  await db
    .update(profiles)
    .set({
      status: 'active',
      reviewedAt: new Date(),
      reviewedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, parsed.data.profileId))

  revalidatePath('/admin/candidates')
  revalidatePath(`/admin/candidates/${parsed.data.profileId}`)
}

const RejectProfileSchema = z.object({
  profileId: z.string().uuid(),
  rejectionNotes: z.string().min(1, 'Rejection reason is required'),
})

export async function rejectProfile(formData: FormData) {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const parsed = RejectProfileSchema.safeParse({
    profileId: formData.get('profileId'),
    rejectionNotes: formData.get('rejectionNotes'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await db
    .update(profiles)
    .set({
      status: 'rejected',
      rejectionNotes: parsed.data.rejectionNotes,
      reviewedAt: new Date(),
      reviewedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, parsed.data.profileId))

  revalidatePath('/admin/candidates')
  revalidatePath(`/admin/candidates/${parsed.data.profileId}`)
}
```

### Pattern 4: Side-by-Side Review with Resizable Panels
**What:** Use shadcn/ui Resizable component to create a split view: PDF on the left, editable profile data on the right.
**When to use:** The profile review page (/admin/candidates/[id]/review).
**Example:**
```tsx
// Source: https://ui.shadcn.com/docs/components/radix/resizable
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export function ReviewPanel({
  pdfUrl,
  children,
}: {
  pdfUrl: string
  children: React.ReactNode
}) {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-[calc(100vh-8rem)]"
    >
      <ResizablePanel defaultSize={50} minSize={30}>
        <iframe
          src={pdfUrl}
          className="h-full w-full border-0"
          title="Original CV"
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-y-auto p-6">
          {children}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
```

### Pattern 5: TanStack Table for Candidate List
**What:** Use TanStack Table with shadcn/ui Table primitives for a searchable, sortable, filterable candidate list with status badges.
**When to use:** The /admin/candidates page.
**Example:**
```typescript
// columns.tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

type CandidateRow = {
  id: string
  name: string
  email: string | null
  status: 'pending_review' | 'active' | 'rejected'
  specializations: string[]
  lowestConfidence: 'high' | 'medium' | 'low'
  createdAt: string
}

export const columns: ColumnDef<CandidateRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <a href={`/admin/candidates/${row.original.id}`} className="font-medium hover:underline">
        {row.getValue('name')}
      </a>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    filterFn: 'equals',
  },
  {
    accessorKey: 'lowestConfidence',
    header: 'Attention',
    cell: ({ row }) => <ConfidenceBadge level={row.getValue('lowestConfidence')} />,
    sortingFn: (rowA, rowB) => {
      const order = { low: 0, medium: 1, high: 2 }
      return order[rowA.getValue('lowestConfidence') as keyof typeof order] -
             order[rowB.getValue('lowestConfidence') as keyof typeof order]
    },
  },
  {
    accessorKey: 'specializations',
    header: 'Specializations',
    cell: ({ row }) => (row.getValue('specializations') as string[]).join(', '),
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: 'Added',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
  },
]
```

### Pattern 6: Inline Editing for Profile Fields
**What:** Click-to-edit pattern for individual fields. Display as text by default, switch to input on click, save on blur/Enter, cancel on Escape. Uses server actions for persistence.
**When to use:** All editable profile fields (name, email, phone, education entries, work history entries, etc.).
**Example:**
```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { updateProfileField } from '@/lib/actions/profiles'

export function InlineEditField({
  profileId,
  fieldName,
  value,
  confidence,
}: {
  profileId: string
  fieldName: string
  value: string
  confidence: 'high' | 'medium' | 'low'
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    if (currentValue === value) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('profileId', profileId)
      formData.set('fieldName', fieldName)
      formData.set('value', currentValue)
      await updateProfileField(formData)
      setIsEditing(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setCurrentValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        autoFocus
        className="h-8"
      />
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted"
    >
      <span>{value || '(empty)'}</span>
      <ConfidenceBadge level={confidence} />
    </button>
  )
}
```

### Anti-Patterns to Avoid
- **Fetching profile data in client components:** Fetch all profile data server-side in the page component, pass it as props. Client components are for interactivity only (editing, sorting).
- **Using a single monolithic form for the entire profile:** The profile has many sections (contact, education array, work history array, specializations, etc.). Use separate forms or server actions per section/field to avoid losing edits when one section fails.
- **Polling for data updates after mutations:** Use revalidatePath in server actions instead. Polling was needed for the async CV parsing in Phase 2, but Phase 3 mutations are synchronous -- the server action completes the database write and revalidates.
- **Building custom table sorting/filtering from scratch:** TanStack Table handles column sorting, filtering, pagination, and row selection. Do not hand-roll these features.
- **Fetching nested profile data with multiple sequential queries:** Use Drizzle relational queries (db.query with `with`) to get all related data in a single SQL query, not N+1 queries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable, filterable data table | Custom sort/filter state management | @tanstack/react-table with shadcn/ui Table | Handles column sorting, multi-column filtering, pagination, row selection, column visibility. Tested at scale |
| Resizable split panels | CSS flexbox with drag handles | shadcn/ui Resizable (react-resizable-panels) | Keyboard accessible, handles min/max sizes, persists panel sizes, proper resize event handling |
| PDF viewing | react-pdf or custom PDF.js integration | iframe with Vercel Blob URL | Zero dependencies, zero configuration. Vercel Blob now serves PDFs with inline content-disposition and no X-Frame-Options restrictions |
| Form validation | Manual if/else checks on form data | Zod schemas in server actions | Type-safe validation with automatic error messages. Already in stack |
| Data table pagination | Custom offset/limit state | TanStack Table getPaginationRowModel | Built-in page size, page index, can-go-next/previous logic |
| Confidence indicators | Custom CSS class logic | Reusable ConfidenceBadge component with shadcn/ui Badge | Consistent styling across all confidence displays (high=green, medium=amber, low=red) |

**Key insight:** This phase is UI-heavy but data-light. The main complexity is in the interaction patterns (inline editing, side-by-side layout, table with multiple features), not in the data operations. Use established UI libraries for the complex interactions, keep the data layer simple with Drizzle relational queries and server actions.

## Common Pitfalls

### Pitfall 1: N+1 Queries When Loading Profile Lists
**What goes wrong:** Loading 50 profiles, then for each profile separately loading education, specializations, work history, etc.
**Why it happens:** Using `db.select().from(profiles)` followed by loops that query related tables.
**How to avoid:** Define Drizzle v1 relations and use `db.query.profiles.findMany({ with: {...} })`. Drizzle generates a single SQL query with lateral joins.
**Warning signs:** Slow candidate list page load, multiple sequential database queries in server logs.

### Pitfall 2: Stale Data After Server Action Mutations
**What goes wrong:** Admin edits a field, saves, but the page still shows old data.
**Why it happens:** Next.js caches server component renders. Without explicit revalidation, the cache serves stale data.
**How to avoid:** Call `revalidatePath('/admin/candidates')` and `revalidatePath('/admin/candidates/[id]')` in every server action that mutates profile data. In Next.js 16, you can also use `refresh()` from `next/cache` for same-page updates.
**Warning signs:** Data only updates after hard refresh, not after form submission.

### Pitfall 3: Lost Edits on Array Items (Education, Work History)
**What goes wrong:** Admin adds a new education entry, but the save only updates the wrong row, or duplicates entries.
**Why it happens:** Array items without stable IDs -- using array index as key. When items are reordered or deleted, React reconciliation mismatches.
**How to avoid:** Always use the database UUID as the key for array items. For new (unsaved) items, generate a temporary client-side ID. Server action receives the specific item ID to update.
**Warning signs:** Editing one education entry changes a different one; deleting an item removes the wrong one.

### Pitfall 4: Drizzle v1 Relations Not Found at Runtime
**What goes wrong:** `db.query.profiles` is undefined, or `with` option is ignored.
**Why it happens:** Relations are defined but not passed to the `drizzle()` initialization. The db instance must receive both schema tables AND relation definitions.
**How to avoid:** Update `src/lib/db/index.ts` to spread both `schema` and `relations` into the config: `drizzle(url, { schema: { ...schema, ...relations } })`.
**Warning signs:** TypeScript may not catch this -- it manifests as runtime errors or empty `with` results.

### Pitfall 5: Vercel Blob PDF URL Expiry for Private Blobs
**What goes wrong:** PDF iframe shows a 403 or blank page after some time.
**Why it happens:** The current codebase uses `access: 'public'` for blob uploads (visible in cv-upload/page.tsx), so this is not currently an issue. However, if blobs are changed to private, the download URL from `put()` will expire.
**How to avoid:** Keep using public access for CVs (they are admin-only pages anyway, access is controlled at the route level). If private access is needed later, create an API route that proxies the PDF content with fresh signed URLs.
**Warning signs:** PDFs load initially but fail after time passes.

### Pitfall 6: Junction Table Data Shape in UI
**What goes wrong:** The specializations and technical domains come through as junction records `{ profileId, specializationId, confidence, specialization: { id, name } }` rather than flat `{ name, confidence }`.
**Why it happens:** Drizzle relational queries return the junction table structure, not a flattened version.
**How to avoid:** Map the junction results to a flat shape in the server component before passing to client components. Example: `profile.profileSpecializations.map(ps => ({ name: ps.specialization.name, confidence: ps.confidence }))`.
**Warning signs:** TypeScript errors about wrong shape, or UI displaying "[object Object]".

## Code Examples

### Review Queue Query (sorted by lowest confidence first)
```typescript
// Source: Drizzle v1 relational queries + SQL extras
// Profiles needing review, sorted by those with low-confidence fields first
import { sql, eq } from 'drizzle-orm'

// Approach: query profiles with status pending_review,
// compute a "min confidence" score for sorting
const pendingProfiles = await db.query.profiles.findMany({
  where: (profiles, { eq }) => eq(profiles.status, 'pending_review'),
  with: {
    education: true,
    workHistory: true,
    barAdmissions: true,
    profileSpecializations: {
      with: { specialization: true },
    },
    profileTechnicalDomains: {
      with: { technicalDomain: true },
    },
  },
  orderBy: (profiles, { asc }) => [asc(profiles.createdAt)],
})

// Sort in application code by lowest confidence across all fields
// (confidence enum: low=0, medium=1, high=2)
const confidenceRank = { low: 0, medium: 1, high: 2 }

function getLowestConfidence(profile: typeof pendingProfiles[0]): number {
  const confidences = [
    confidenceRank[profile.nameConfidence],
    confidenceRank[profile.emailConfidence],
    confidenceRank[profile.phoneConfidence],
    ...profile.education.map(e => confidenceRank[e.confidence]),
    ...profile.workHistory.map(w => confidenceRank[w.confidence]),
    ...profile.barAdmissions.map(b => confidenceRank[b.confidence]),
    ...profile.profileSpecializations.map(s => confidenceRank[s.confidence]),
    ...profile.profileTechnicalDomains.map(t => confidenceRank[t.confidence]),
  ]
  return Math.min(...confidences)
}

const sorted = pendingProfiles.sort(
  (a, b) => getLowestConfidence(a) - getLowestConfidence(b)
)
```

### Candidate List Query with Search and Status Filter
```typescript
// Server component data fetching for /admin/candidates/page.tsx
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { ilike, eq, or, and, sql } from 'drizzle-orm'

type SearchParams = {
  search?: string
  status?: 'pending_review' | 'active' | 'rejected'
  page?: string
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = 20

  // Build where conditions
  const conditions = []
  if (params.status) {
    conditions.push(eq(profiles.status, params.status))
  }
  if (params.search) {
    conditions.push(
      or(
        ilike(profiles.name, `%${params.search}%`),
        ilike(profiles.email, `%${params.search}%`),
      )
    )
  }

  const where = conditions.length > 0
    ? and(...conditions)
    : undefined

  const allProfiles = await db.query.profiles.findMany({
    where: where ? () => where : undefined,
    with: {
      profileSpecializations: {
        with: { specialization: true },
      },
    },
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
  })

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(profiles)
    .where(where)

  return (
    <DataTable
      columns={columns}
      data={allProfiles}
      pageCount={Math.ceil(count / pageSize)}
    />
  )
}
```

### Server Action: Update Individual Profile Field
```typescript
// src/lib/actions/profiles.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

// Allowlist of editable top-level profile fields
const EDITABLE_FIELDS = ['name', 'email', 'phone'] as const

const UpdateFieldSchema = z.object({
  profileId: z.string().uuid(),
  fieldName: z.enum(EDITABLE_FIELDS),
  value: z.string(),
})

export async function updateProfileField(formData: FormData) {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const parsed = UpdateFieldSchema.safeParse({
    profileId: formData.get('profileId'),
    fieldName: formData.get('fieldName'),
    value: formData.get('value'),
  })

  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { profileId, fieldName, value } = parsed.data

  await db
    .update(profiles)
    .set({
      [fieldName]: value,
      // When admin manually edits a field, set confidence to 'high'
      // since it's now human-verified
      [`${fieldName}Confidence`]: 'high',
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profileId))

  revalidatePath(`/admin/candidates/${profileId}`)
  revalidatePath('/admin/candidates')
}
```

### Server Action: Update Education Entry
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { education } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

const UpdateEducationSchema = z.object({
  educationId: z.string().uuid(),
  profileId: z.string().uuid(),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  year: z.string().optional(),
})

export async function updateEducation(formData: FormData) {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const parsed = UpdateEducationSchema.safeParse({
    educationId: formData.get('educationId'),
    profileId: formData.get('profileId'),
    institution: formData.get('institution'),
    degree: formData.get('degree'),
    field: formData.get('field'),
    year: formData.get('year'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await db
    .update(education)
    .set({
      institution: parsed.data.institution,
      degree: parsed.data.degree,
      field: parsed.data.field,
      year: parsed.data.year || null,
      confidence: 'high', // human-verified
    })
    .where(
      and(
        eq(education.id, parsed.data.educationId),
        eq(education.profileId, parsed.data.profileId),
      )
    )

  revalidatePath(`/admin/candidates/${parsed.data.profileId}`)
}
```

### PDF Viewer Component (iframe)
```tsx
// src/components/admin/pdf-viewer.tsx
// Source: Vercel Blob docs - PDFs now served with inline content-disposition
// and X-Frame-Options removed (github.com/vercel/storage/issues/591 - resolved)
export function PdfViewer({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  return (
    <iframe
      src={url}
      className={className ?? 'h-full w-full border-0'}
      title="CV Document"
    />
  )
}
```

### shadcn/ui Component Installation
```bash
# All components needed for Phase 3
npx shadcn@latest add table badge tabs dialog select textarea separator resizable
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drizzle v1 relations() + db.query | Drizzle v2 defineRelations() + db.query (beta) | 1.0.0-beta.1 (late 2025) | v2 has cleaner syntax and through() for junction tables. BUT: v2 is beta-only, requires drizzle-orm@beta. Project uses 0.45.1 stable. Use v1. |
| useFormState (React 18) | useActionState (React 19) | React 19 stable | useFormState is renamed to useActionState. The project uses React 19.2.3 -- use useActionState |
| revalidatePath only | revalidatePath + refresh() | Next.js 16 | refresh() from next/cache re-renders the current page. revalidatePath revalidates specific paths. Both are useful |
| middleware.ts auth checks | proxy.ts auth checks | Next.js 16.1.6 | Project already uses proxy.ts per [01-02-D1] decision |
| react-pdf v8 | react-pdf v10.3.0 | 2025 | v9 switched PDF.js worker to .mjs, v10 is current. Not needed for this phase (iframe is sufficient) |

**Deprecated/outdated:**
- `useFormState`: Renamed to `useActionState` in React 19. The project should use `useActionState`.
- `middleware.ts`: Deprecated in Next.js 16.1.6, replaced by `proxy.ts` (already handled in Phase 1).
- Drizzle v2 `defineRelations()`: Only available in drizzle-orm@beta (1.0.0-beta.1+). Do NOT use with 0.45.1 stable.

## Open Questions

1. **Vercel Blob public URLs for iframe embedding**
   - What we know: The cv-upload page uses `access: 'public'` for blob uploads. Public blob URLs work in iframes (X-Frame-Options issue resolved). The admin layout enforces auth.
   - What's unclear: Whether the deployed app has additional Vercel deployment protection headers that might block iframe embedding on preview deployments.
   - Recommendation: Test iframe embedding in development first. If preview deployment protection blocks it, disable Vercel Authentication for the blob CDN domain or use a proxy route handler.

2. **Drizzle v1 db.query vs db._query naming in 0.45.1**
   - What we know: In drizzle-orm 1.0.0-beta.1+, the v1 API was moved to `db._query` to make room for the v2 API at `db.query`. In 0.45.1 (pre-beta), the relational query API should still be at `db.query`.
   - What's unclear: The official docs now label the v1 docs as showing `db._query`, which is the post-beta naming. The 0.45.1 version predates this rename.
   - Recommendation: Use `db.query` for the 0.45.1 stable version. If TypeScript shows errors, fall back to explicit `db.select().from()` with left joins. Validate at runtime during development.

3. **Client-side vs server-side table filtering**
   - What we know: For <100 profiles, client-side filtering via TanStack Table is fast and simpler. For 100+ profiles, server-side filtering with URL search params is more scalable.
   - What's unclear: Expected data volume at launch (95 initial CVs, but could grow).
   - Recommendation: Start with server-side filtering (URL search params passed to Drizzle where clause) since the pattern is already needed for pagination. TanStack Table handles the UI; data fetching is server-side.

4. **Managing specializations and technical domains during inline editing**
   - What we know: Specializations and technical domains are many-to-many via junction tables with lookup tables. Adding a new specialization requires either finding an existing lookup record or creating a new one.
   - What's unclear: Whether the admin should pick from existing specializations (dropdown/combobox) or type freeform text (creating new lookup entries).
   - Recommendation: Use a combobox pattern (shadcn/ui Combobox or a custom autocomplete) that searches existing specializations but allows creating new ones on the fly. This prevents typo-duplicates while staying flexible.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM v1 Relations](https://orm.drizzle.team/docs/relations) - Complete v1 relations() API with one(), many(), fields/references
- [Drizzle ORM v1 Relational Queries](https://orm.drizzle.team/docs/rqb) - db.query findMany/findFirst with where, orderBy, limit, with()
- [Drizzle Relations v1 to v2 Migration](https://orm.drizzle.team/docs/relations-v1-v2) - Confirms v2 is beta only (1.0.0-beta.1+)
- [Next.js 16.1.6 Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) - Server actions, revalidatePath, useActionState, refresh()
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/radix/resizable) - Installation and API for side-by-side panels
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table integration guide
- [Vercel Blob X-Frame-Options Fix](https://github.com/vercel/storage/issues/591) - Confirmed resolved: PDFs can now be embedded in iframes

### Secondary (MEDIUM confidence)
- [react-pdf npm](https://www.npmjs.com/package/react-pdf) - v10.3.0, React 19 compatible (peer deps confirmed)
- [@tanstack/react-table npm](https://www.npmjs.com/package/@tanstack/react-table) - v8.21.3 latest stable
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - v4.6.4, underlying lib for shadcn/ui Resizable
- [React useActionState](https://react.dev/reference/react/useActionState) - Official React 19 hook docs

### Tertiary (LOW confidence)
- Various WebSearch results on inline editing patterns for shadcn/ui - Confirmed general approach, specific implementation crafted from component primitives

## Metadata

**Confidence breakdown:**
- Schema extension: HIGH - Standard ALTER TABLE with new enum and nullable columns. Well-understood Drizzle pattern.
- PDF viewing (iframe): HIGH - Vercel Blob iframe issue confirmed resolved. Public blob URLs work with inline content-disposition.
- Inline editing: HIGH - Standard React pattern (useState for edit mode, useTransition for pending, server action for persistence). shadcn/ui Input/Select primitives are solid.
- Server actions + revalidation: HIGH - Verified against Next.js 16.1.6 official docs. useActionState confirmed for React 19.
- TanStack Table integration: HIGH - shadcn/ui data table guide provides complete working example with sorting, filtering, pagination.
- Drizzle v1 relational queries: MEDIUM - API is stable in 0.45.1, but the db.query vs db._query naming needs runtime validation. Relations definition pattern is well-documented.
- Resizable panels: HIGH - shadcn/ui Resizable is a thin wrapper over react-resizable-panels, well-documented with examples.
- Search/filter/sort patterns: MEDIUM - Server-side approach is standard, but the exact Drizzle query pattern for combining ilike search with enum filters needs testing with the v1 callback-based where syntax.

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days - stable technologies, no rapidly changing APIs)
