# Phase 5: Search and Discovery - Research

**Researched:** 2026-02-20
**Domain:** PostgreSQL full-text search, pg_trgm, Drizzle ORM query building, saved profiles, Next.js URL-driven filtering
**Confidence:** HIGH

## Summary

Phase 5 enhances the existing employer browse experience (Phase 4) with PostgreSQL full-text search, structured junction table filters, save/favorite functionality, and improved pagination. The existing codebase already has a functional browse page with basic search input, specialization/experience dropdowns, profile cards, and pagination -- all driven by URL search params.

The core technical challenge is transitioning the DAL's `getAnonymizedProfiles` function from Drizzle's relational query API (`db.query.profiles.findMany`) to the select/join builder (`db.select().from()`) to support advanced filtering via `EXISTS` subqueries on junction tables (specializations, technical domains, bar admissions). This is necessary because Drizzle's relational query API does not support filtering parent rows based on related table conditions. For free-text search, PostgreSQL's `ILIKE` with `pg_trgm` GIN indexes is the right approach for this scale (<1000 candidates) -- simpler than `tsvector`/`tsquery` and sufficient for fuzzy matching across specialization names, jurisdictions, and technical domains.

A new `saved_profiles` junction table links employer users to candidate profiles, with a server action for toggling and optimistic UI on the client. The URL-driven filter pattern already established in Phase 4 (using `useSearchParams` + `use-debounce`) extends naturally to additional filter dimensions.

**Primary recommendation:** Use `ILIKE` with `pg_trgm` GIN indexes for text search (simpler, sufficient at this scale), `EXISTS` subqueries for junction table filtering, and a new `saved_profiles` table with server actions for favorites.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Query building with `sql`, `exists`, `and`, `ilike` | Already in project, supports raw SQL for search |
| next | 16.1.6 | Server components with `searchParams` as Promise | Already in project, URL-driven filtering |
| use-debounce | 10.1.0 | Debounced search input | Already used in `search.tsx` |
| zod | 4.3.6 | Search param validation on server | Already in project |
| lucide-react | 0.575.0 | Icons (Heart, BookmarkPlus, etc.) | Already in project |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui components | various | Checkbox, Badge, Button, Select | Filter controls, save button |
| @neondatabase/serverless | 1.0.2 | Neon PostgreSQL driver | Database connection |

### PostgreSQL Extensions (new, server-side only)
| Extension | Purpose | How to Enable |
|-----------|---------|---------------|
| pg_trgm | Trigram-based fuzzy text matching, GIN index for ILIKE | `CREATE EXTENSION IF NOT EXISTS pg_trgm;` via custom migration |

### No New Dependencies Needed

The existing stack is sufficient. Do NOT add:
- `nuqs` -- the project already uses `useSearchParams` + `use-debounce` consistently; adding nuqs would create two patterns
- `Elasticsearch` / `Meilisearch` -- overkill for <1000 candidates
- `@tanstack/react-query` -- server components handle data fetching; no client-side cache needed

## Architecture Patterns

### Recommended Changes to Project Structure
```
src/
  lib/
    db/
      schema.ts              # ADD: savedProfiles table
      relations.ts           # ADD: savedProfiles relations
    dal/
      employer-profiles.ts   # REWRITE: getAnonymizedProfiles with select/join builder
      employer-saved.ts      # NEW: saved profiles DAL functions
  actions/
    saved-profiles.ts        # NEW: toggleSaveProfile server action
  app/
    (authenticated)/
      employer/
        browse/
          page.tsx            # ENHANCE: add more filter params, saved indicator
          search.tsx          # KEEP: already works well
          filters.tsx         # ENHANCE: add location, technical domain, patent bar filters
          saved-button.tsx    # NEW: client component for save/unsave with optimistic UI
        saved/
          page.tsx            # NEW: saved profiles list page
```

### Pattern 1: Dynamic WHERE with EXISTS Subqueries for Junction Table Filtering

**What:** Build dynamic SQL WHERE clauses using Drizzle's `and()`, `exists()`, and `sql` operators to filter profiles based on related junction table data.

**When to use:** When the user selects structured filters (specialization, technical domain, patent bar jurisdiction).

**Why not relational queries:** The existing `db.query.profiles.findMany()` (relational API) cannot filter parent rows by child conditions. It can only filter the loaded children. We need `db.select().from(profiles)` with `EXISTS` subqueries.

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row
import { eq, and, exists, sql, ilike, count } from 'drizzle-orm';
import {
  profiles, profileSpecializations, specializations,
  profileTechnicalDomains, technicalDomains, barAdmissions,
} from '@/lib/db/schema';

async function getFilteredProfiles(filters: {
  search?: string;
  specializations?: string[];
  technicalDomains?: string[];
  patentBar?: boolean;
  experienceRange?: string;
  location?: string;
  page?: number;
  pageSize?: number;
}) {
  const conditions: SQL[] = [eq(profiles.status, 'active')];

  // Specialization filter: EXISTS subquery on junction table
  if (filters.specializations?.length) {
    const specSubquery = db
      .select({ id: sql`1` })
      .from(profileSpecializations)
      .innerJoin(
        specializations,
        eq(profileSpecializations.specializationId, specializations.id)
      )
      .where(
        and(
          eq(profileSpecializations.profileId, profiles.id),
          inArray(specializations.name, filters.specializations)
        )
      );
    conditions.push(exists(specSubquery));
  }

  // Technical domain filter: EXISTS subquery on junction table
  if (filters.technicalDomains?.length) {
    const techSubquery = db
      .select({ id: sql`1` })
      .from(profileTechnicalDomains)
      .innerJoin(
        technicalDomains,
        eq(profileTechnicalDomains.technicalDomainId, technicalDomains.id)
      )
      .where(
        and(
          eq(profileTechnicalDomains.profileId, profiles.id),
          inArray(technicalDomains.name, filters.technicalDomains)
        )
      );
    conditions.push(exists(techSubquery));
  }

  // Patent bar filter: EXISTS on bar admissions with USPTO
  if (filters.patentBar) {
    const barSubquery = db
      .select({ id: sql`1` })
      .from(barAdmissions)
      .where(
        and(
          eq(barAdmissions.profileId, profiles.id),
          ilike(barAdmissions.jurisdiction, '%USPTO%')
        )
      );
    conditions.push(exists(barSubquery));
  }

  // Location filter via bar admission jurisdiction (ILIKE with pg_trgm)
  if (filters.location) {
    const locationSubquery = db
      .select({ id: sql`1` })
      .from(barAdmissions)
      .where(
        and(
          eq(barAdmissions.profileId, profiles.id),
          ilike(barAdmissions.jurisdiction, `%${filters.location}%`)
        )
      );
    conditions.push(exists(locationSubquery));
  }

  // Free-text search across related tables (ILIKE with pg_trgm)
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    const searchSubquery = sql`(
      EXISTS (
        SELECT 1 FROM profile_specializations ps
        JOIN specializations s ON ps.specialization_id = s.id
        WHERE ps.profile_id = ${profiles.id}
        AND s.name ILIKE ${searchTerm}
      )
      OR EXISTS (
        SELECT 1 FROM profile_technical_domains ptd
        JOIN technical_domains td ON ptd.technical_domain_id = td.id
        WHERE ptd.profile_id = ${profiles.id}
        AND td.name ILIKE ${searchTerm}
      )
      OR EXISTS (
        SELECT 1 FROM bar_admissions ba
        WHERE ba.profile_id = ${profiles.id}
        AND ba.jurisdiction ILIKE ${searchTerm}
      )
      OR EXISTS (
        SELECT 1 FROM education e
        WHERE e.profile_id = ${profiles.id}
        AND (e.institution ILIKE ${searchTerm} OR e.degree ILIKE ${searchTerm} OR e.field ILIKE ${searchTerm})
      )
    )`;
    conditions.push(searchSubquery);
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;

  // Main query -- ONLY non-PII columns (inclusion mode)
  const results = await db
    .select({
      id: profiles.id,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(and(...conditions))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .orderBy(desc(profiles.createdAt));

  // Count query with same conditions
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(profiles)
    .where(and(...conditions));

  // Then load related data for matched profile IDs only
  // (separate queries to maintain anonymization pattern)
  const profileIds = results.map(r => r.id);
  // ... load specializations, technicalDomains, education, etc.

  return { profiles: /* transformed DTOs */, total };
}
```

### Pattern 2: Two-Query Strategy for Anonymized Profiles

**What:** First query filters/paginates profile IDs. Second query loads related data for those IDs using the relational API with column inclusion mode.

**When to use:** When the filter query needs `EXISTS` subqueries (select builder) but the data loading needs to maintain the anonymization column whitelist pattern.

**Why:** The select builder gives us filtering power, but the relational query API (`db.query.profiles.findMany`) is cleaner for loading nested related data with column inclusion. Combining both in a two-step approach keeps the code maintainable and the anonymization pattern intact.

**Example:**
```typescript
// Step 1: Filter and paginate (select builder)
const matchedIds = await db
  .select({ id: profiles.id })
  .from(profiles)
  .where(and(...conditions))
  .limit(pageSize)
  .offset(offset)
  .orderBy(desc(profiles.createdAt));

// Step 2: Load full anonymized data for matched IDs (relational query)
const results = await db.query.profiles.findMany({
  where: (profiles, { inArray }) =>
    inArray(profiles.id, matchedIds.map(r => r.id)),
  columns: {
    id: true,
    createdAt: true,
    // PII fields excluded by inclusion mode
  },
  with: {
    profileSpecializations: { with: { specialization: { columns: { name: true } } } },
    profileTechnicalDomains: { with: { technicalDomain: { columns: { name: true } } } },
    education: { columns: { institution: true, degree: true, field: true, year: true } },
    barAdmissions: { columns: { jurisdiction: true, status: true, year: true } },
    workHistory: { columns: { title: true, startDate: true, endDate: true } },
  },
});
```

### Pattern 3: Saved Profiles Table Schema

**What:** Junction table linking employer users to candidate profiles for save/favorite functionality.

**Example:**
```typescript
// Schema definition
export const savedProfiles = pgTable('saved_profiles', {
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.employerUserId, table.profileId] }),
  index('saved_profiles_employer_idx').on(table.employerUserId),
  index('saved_profiles_profile_idx').on(table.profileId),
]);
```

### Pattern 4: Server Action for Toggle Save with Optimistic UI

**What:** Server action that inserts or deletes from `saved_profiles`, paired with `useOptimistic` on the client.

**Example (server action):**
```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { savedProfiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUser } from '@/lib/dal'

export async function toggleSaveProfile(profileId: string) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    return { error: 'Unauthorized' }
  }

  // Check if already saved
  const [existing] = await db
    .select()
    .from(savedProfiles)
    .where(
      and(
        eq(savedProfiles.employerUserId, user.id),
        eq(savedProfiles.profileId, profileId)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .delete(savedProfiles)
      .where(
        and(
          eq(savedProfiles.employerUserId, user.id),
          eq(savedProfiles.profileId, profileId)
        )
      )
  } else {
    await db.insert(savedProfiles).values({
      employerUserId: user.id,
      profileId,
    })
  }

  revalidatePath('/employer/browse')
  revalidatePath('/employer/saved')
  return { success: true, saved: !existing }
}
```

**Example (client component with optimistic UI):**
```typescript
'use client'
import { useOptimistic, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleSaveProfile } from '@/actions/saved-profiles'

export function SaveButton({
  profileId,
  initialSaved,
}: {
  profileId: string
  initialSaved: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved)

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          setOptimisticSaved(!optimisticSaved)
          await toggleSaveProfile(profileId)
        })
      }}
    >
      <Heart
        className={`size-5 ${optimisticSaved ? 'fill-red-500 text-red-500' : ''}`}
      />
    </Button>
  )
}
```

### Pattern 5: URL-Driven Multi-Filter State

**What:** All filter state lives in URL search params. Server component reads params, queries DB, renders results. Client components update URL params.

**When to use:** For all search/filter interactions on the browse page.

**Current pattern (already works):** The existing `search.tsx` and `filters.tsx` already use `useSearchParams` + `useRouter.replace()`. Extend this to additional filter dimensions by adding more URL params.

**URL param scheme:**
```
/employer/browse?q=patent&spec=Patent+Prosecution&spec=Trademark&tech=Biotechnology&patent_bar=true&exp=5-10&page=2
```

Note: For multi-value filters (e.g., multiple specializations), use repeated params: `spec=A&spec=B`. Parse with `searchParams.getAll('spec')` on the client and `params.spec` as `string | string[]` on the server.

### Anti-Patterns to Avoid
- **Client-side filtering:** Never fetch all profiles and filter in the browser. Always filter in SQL on the server.
- **N+1 queries in the card grid:** Do not load related data per-card. Load all related data for the page in batch.
- **Exposing PII in search:** The free-text search must NEVER match against `profiles.name`, `profiles.email`, `profiles.phone`, or `work_history.employer`. Only match against non-PII fields (specialization names, jurisdiction names, technical domain names, education fields).
- **Using tsvector for this scale:** Full `tsvector`/`tsquery` with generated columns is over-engineered for <1000 candidates. `ILIKE` with `pg_trgm` GIN indexes is simpler and sufficient.
- **Storing saved state in React state only:** Save status must persist in the database. Use server actions, not local state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text search | Custom regex or JS-side filtering | PostgreSQL `ILIKE` + `pg_trgm` GIN index | Handles fuzzy matching, accent-insensitive, index-accelerated |
| URL search param management | Custom URLSearchParams wrapper | Existing `useSearchParams` + `useRouter.replace()` pattern | Already established in codebase, consistent |
| Debounced search | Custom setTimeout debounce | `use-debounce` library (already installed) | Already used in `search.tsx` |
| Optimistic UI for save | Custom state management | React 19 `useOptimistic` hook | Built into React, works with server actions |
| Pagination | Custom cursor logic | Offset/limit with URL page param | Already implemented in Phase 4, sufficient for <1000 records |
| Filter validation | Manual param checking | Zod schema for search params | Already used throughout codebase |

**Key insight:** PostgreSQL with `pg_trgm` provides production-quality fuzzy text search at this scale. The main engineering effort is in the query builder pattern, not search infrastructure.

## Common Pitfalls

### Pitfall 1: PII Leakage Through Search Matching
**What goes wrong:** Free-text search accidentally matches against PII fields (name, email, phone, employer name).
**Why it happens:** Developer adds search across all text columns without considering anonymization.
**How to avoid:** Search ONLY matches against non-PII fields: specialization names, technical domain names, bar admission jurisdictions, education institution/degree/field. Never use `profiles.name`, `profiles.email`, `profiles.phone`, or `workHistory.employer` in search conditions.
**Warning signs:** Any `ILIKE` or `to_tsvector` referencing the `profiles` table's PII columns directly.

### Pitfall 2: Drizzle Relational API Cannot Filter Parent by Child
**What goes wrong:** Developer tries to use `db.query.profiles.findMany({ where: ... })` to filter profiles that have a specific specialization.
**Why it happens:** The relational query API's `where` on nested `with` only filters which children are loaded, not which parents are returned.
**How to avoid:** Use the select builder (`db.select().from(profiles).where(exists(...))`) for filtering, then optionally use the relational API for data loading on the matched IDs.
**Warning signs:** Using `db.query.profiles.findMany` with `with: { profileSpecializations: { where: ... } }` and expecting it to exclude profiles without matching specializations.

### Pitfall 3: SQL Injection in ILIKE Patterns
**What goes wrong:** User input containing `%` or `_` characters produces unexpected ILIKE matches.
**Why it happens:** `%` and `_` are ILIKE wildcards. If user types "100% effort", the `%` acts as a wildcard.
**How to avoid:** Escape `%` and `_` in user input before wrapping with `%...%`:
```typescript
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
const searchTerm = `%${escapeIlike(userInput)}%`;
```
**Warning signs:** Search results that seem too broad or include unexpected matches.

### Pitfall 4: pg_trgm Extension Not Enabled
**What goes wrong:** ILIKE queries work but are slow because GIN index creation fails silently.
**Why it happens:** pg_trgm must be explicitly enabled via `CREATE EXTENSION`. Neon supports it but doesn't enable it by default.
**How to avoid:** Create a custom Drizzle migration that enables the extension before creating GIN indexes:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specializations_name_trgm
  ON specializations USING GIN (name gin_trgm_ops);
```
**Warning signs:** Slow ILIKE queries on text columns, missing GIN indexes.

### Pitfall 5: Count Query Diverges from Filter Query
**What goes wrong:** The total count shown to the user doesn't match the actual number of filtered results.
**Why it happens:** The count query uses different WHERE conditions than the results query.
**How to avoid:** Extract the WHERE conditions into a shared variable and use it in both queries:
```typescript
const whereConditions = and(...conditions);
const results = await db.select().from(profiles).where(whereConditions).limit(pageSize).offset(offset);
const [{ value: total }] = await db.select({ value: count() }).from(profiles).where(whereConditions);
```
**Warning signs:** "Showing 0 of 5 results" or pagination showing more pages than results exist.

### Pitfall 6: Multi-Value URL Params Parsed as String Instead of Array
**What goes wrong:** When multiple specializations are selected, only the first one is used in the filter.
**Why it happens:** Next.js `searchParams` returns `string | string[] | undefined`. If only one value, it's a string; if multiple, it's an array. Code assumes it's always one or the other.
**How to avoid:** Normalize params to always be an array:
```typescript
function toArray(param: string | string[] | undefined): string[] {
  if (!param) return [];
  return Array.isArray(param) ? param : [param];
}
```
**Warning signs:** Selecting multiple filters but results only reflect one.

## Code Examples

### Enabling pg_trgm via Custom Drizzle Migration

```bash
# Generate empty migration file
npx drizzle-kit generate --custom --name=enable-pg-trgm
```

```sql
-- drizzle/XXXX_enable-pg-trgm.sql
-- Source: https://neon.com/docs/extensions/pg_trgm

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for ILIKE search acceleration
CREATE INDEX IF NOT EXISTS idx_specializations_name_trgm
  ON specializations USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_technical_domains_name_trgm
  ON technical_domains USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bar_admissions_jurisdiction_trgm
  ON bar_admissions USING GIN (jurisdiction gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_education_institution_trgm
  ON education USING GIN (institution gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_education_field_trgm
  ON education USING GIN (field gin_trgm_ops);
```

### Dynamic Filter Builder (DAL Function)

```typescript
// Source: https://orm.drizzle.team/docs/data-querying
// Source: https://orm.drizzle.team/docs/operators

import { eq, and, exists, ilike, inArray, count, desc, sql, type SQL } from 'drizzle-orm';

export type SearchFilters = {
  search?: string;
  specializations?: string[];
  technicalDomains?: string[];
  patentBar?: boolean;
  experienceRange?: string;
  location?: string;
  page?: number;
  pageSize?: number;
};

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

function buildFilterConditions(filters: SearchFilters): SQL[] {
  const conditions: SQL[] = [eq(profiles.status, 'active')];

  if (filters.specializations?.length) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(profileSpecializations)
          .innerJoin(specializations, eq(profileSpecializations.specializationId, specializations.id))
          .where(and(
            eq(profileSpecializations.profileId, profiles.id),
            inArray(specializations.name, filters.specializations)
          ))
      )
    );
  }

  if (filters.technicalDomains?.length) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(profileTechnicalDomains)
          .innerJoin(technicalDomains, eq(profileTechnicalDomains.technicalDomainId, technicalDomains.id))
          .where(and(
            eq(profileTechnicalDomains.profileId, profiles.id),
            inArray(technicalDomains.name, filters.technicalDomains)
          ))
      )
    );
  }

  if (filters.patentBar) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(barAdmissions)
          .where(and(
            eq(barAdmissions.profileId, profiles.id),
            ilike(barAdmissions.jurisdiction, '%USPTO%')
          ))
      )
    );
  }

  if (filters.location) {
    conditions.push(
      exists(
        db.select({ id: sql`1` })
          .from(barAdmissions)
          .where(and(
            eq(barAdmissions.profileId, profiles.id),
            ilike(barAdmissions.jurisdiction, `%${escapeIlike(filters.location)}%`)
          ))
      )
    );
  }

  if (filters.search) {
    const term = `%${escapeIlike(filters.search)}%`;
    // Search across non-PII fields only
    conditions.push(sql`(
      EXISTS (SELECT 1 FROM profile_specializations ps JOIN specializations s ON ps.specialization_id = s.id WHERE ps.profile_id = ${profiles.id} AND s.name ILIKE ${term})
      OR EXISTS (SELECT 1 FROM profile_technical_domains ptd JOIN technical_domains td ON ptd.technical_domain_id = td.id WHERE ptd.profile_id = ${profiles.id} AND td.name ILIKE ${term})
      OR EXISTS (SELECT 1 FROM bar_admissions ba WHERE ba.profile_id = ${profiles.id} AND ba.jurisdiction ILIKE ${term})
      OR EXISTS (SELECT 1 FROM education e WHERE e.profile_id = ${profiles.id} AND (e.institution ILIKE ${term} OR e.degree ILIKE ${term} OR e.field ILIKE ${term}))
    )`);
  }

  return conditions;
}
```

### Saved Profiles Schema Addition

```typescript
// Source: standard junction table pattern

export const savedProfiles = pgTable('saved_profiles', {
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.employerUserId, table.profileId] }),
  index('saved_profiles_employer_idx').on(table.employerUserId),
  index('saved_profiles_profile_idx').on(table.profileId),
]);
```

### Loading Saved Status for Profile Cards (Batch)

```typescript
// Load which profiles on the current page are saved by the current employer
export async function getSavedProfileIds(
  employerUserId: string,
  profileIds: string[]
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();

  const saved = await db
    .select({ profileId: savedProfiles.profileId })
    .from(savedProfiles)
    .where(
      and(
        eq(savedProfiles.employerUserId, employerUserId),
        inArray(savedProfiles.profileId, profileIds)
      )
    );

  return new Set(saved.map(s => s.profileId));
}
```

### Multi-Value Filter Component (Checkbox Group)

```typescript
'use client'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'

const SPECIALIZATIONS = [
  'Patent Prosecution', 'Trademark', 'Copyright',
  'Trade Secrets', 'IP Litigation', 'Licensing',
];

export function SpecializationFilter() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const selected = searchParams.getAll('spec')

  function toggleSpec(spec: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page') // Reset to page 1

    const current = params.getAll('spec')
    if (current.includes(spec)) {
      // Remove this spec
      params.delete('spec')
      current.filter(s => s !== spec).forEach(s => params.append('spec', s))
    } else {
      params.append('spec', spec)
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Specializations</p>
      {SPECIALIZATIONS.map((spec) => (
        <label key={spec} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(spec)}
            onCheckedChange={() => toggleSpec(spec)}
          />
          {spec}
        </label>
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tsvector generated columns | ILIKE + pg_trgm for small datasets | N/A (scale-dependent) | Simpler implementation, same performance at <1000 rows |
| Client-side filtering | Server-side SQL filtering via URL params | Next.js App Router (2023+) | Better SEO, shareable URLs, no client state |
| React Query for data fetching | Server Components with `cache()` | React 19 / Next.js 15+ | Eliminates client-side fetching layer |
| Custom optimistic state | React 19 `useOptimistic` hook | React 19 (2024) | Built-in, works with server actions |

**When to upgrade to tsvector/tsquery:** If the candidate pool grows beyond ~5000 candidates or if relevance ranking becomes important, switch from ILIKE to proper tsvector full-text search with weighted columns. The generated column pattern documented by Drizzle makes this straightforward when the time comes.

## Open Questions

1. **Experience range filtering approach**
   - What we know: Experience is computed from work history dates (via `bucketExperienceYears()`), not stored as a column. Filtering by experience range in SQL requires computing it per-profile.
   - What's unclear: Whether to add a computed/cached `experience_years` column or compute in a CTE/subquery.
   - Recommendation: Use a raw SQL subquery that computes total experience from `work_history` dates and filters by range. For <1000 profiles this is fast enough without a materialized column. If performance becomes an issue later, add a trigger-maintained `total_experience_months` integer column on `profiles`.

2. **Location filter semantics**
   - What we know: The schema has `bar_admissions.jurisdiction` which contains strings like "California", "USPTO", "New York".
   - What's unclear: Whether "location" means bar admission jurisdiction, work history location (not in schema), or candidate physical location (not in schema).
   - Recommendation: For Phase 5, filter on `bar_admissions.jurisdiction` via ILIKE. This is the closest proxy for location in the current schema. Add a note in the UI that this filters by bar admission jurisdiction.

3. **Multi-select vs single-select for filters**
   - What we know: The existing `filters.tsx` uses single-select dropdowns. The requirements mention combining multiple filters.
   - What's unclear: Whether users should be able to select MULTIPLE specializations (show profiles with ANY of selected) or just one at a time.
   - Recommendation: Support multi-select for specializations and technical domains (checkboxes or multi-select dropdown). Use ANY/OR semantics: profile matches if it has at least one of the selected specializations. Single-select for experience range and patent bar (boolean toggle).

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - PostgreSQL Full-Text Search Guide](https://orm.drizzle.team/docs/guides/postgresql-full-text-search) - GIN index with sql``, tsvector patterns
- [Drizzle ORM - Full-Text Search with Generated Columns](https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns) - customType for tsvector, generatedAlwaysAs
- [Drizzle ORM - Magic sql`` Operator](https://orm.drizzle.team/docs/sql) - sql template literal, sql.raw(), parameterization
- [Drizzle ORM - Filters/Operators](https://orm.drizzle.team/docs/operators) - exists, inArray, ilike, and, or
- [Drizzle ORM - Select Parent Rows with Related Children](https://orm.drizzle.team/docs/guides/select-parent-rows-with-at-least-one-related-child-row) - EXISTS subquery pattern
- [Drizzle ORM - Conditional Filters](https://orm.drizzle.team/docs/guides/conditional-filters-in-query) - Dynamic WHERE construction
- [Drizzle ORM - Count Rows](https://orm.drizzle.team/docs/guides/count-rows) - count() with filters
- [Drizzle ORM - Custom Migrations](https://orm.drizzle.team/docs/kit-custom-migrations) - drizzle-kit generate --custom
- [Drizzle ORM - Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) - .using('gin', ...) syntax
- [Neon Docs - pg_trgm Extension](https://neon.com/docs/extensions/pg_trgm) - Enabling pg_trgm on Neon, GIN index creation

### Secondary (MEDIUM confidence)
- [Drizzle ORM - Data Querying](https://orm.drizzle.team/docs/data-querying) - Dynamic filter accumulation pattern
- [Next.js - Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL-driven search pattern
- [Aurora Scharff - Managing Advanced Search Param Filtering](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) - URL filter patterns

### Tertiary (LOW confidence)
- [nuqs](https://nuqs.dev) - Type-safe URL state library (evaluated but not recommended for this project due to existing pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns verified against official docs
- Architecture (EXISTS subqueries): HIGH - Verified against official Drizzle docs with code examples
- Architecture (pg_trgm + ILIKE): HIGH - Verified against Neon docs, well-established PostgreSQL pattern
- Saved profiles pattern: HIGH - Standard junction table pattern, server action + useOptimistic verified
- Pitfalls: HIGH - Based on code review of existing DAL and Drizzle API behavior
- Experience range filtering: MEDIUM - Approach is sound but needs validation at implementation time

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable stack, unlikely to change)
