# Phase 6: Monetization - Research

**Researched:** 2026-02-20
**Domain:** Stripe Checkout Sessions, webhook-driven payment fulfillment, Next.js 16 integration
**Confidence:** HIGH

## Summary

Phase 6 adds Stripe-powered per-profile unlock payments for employers and an admin analytics dashboard. The core flow is: employer clicks "Unlock Profile" on an anonymized candidate, gets redirected to Stripe Checkout, pays, and the webhook handler records the unlock in a `profile_unlocks` table. The existing DAL then uses unlock records to determine whether to return full PII or anonymized data.

The standard approach is Stripe Checkout Sessions with `mode: 'payment'` for one-time charges, using `price_data` for inline pricing (no pre-created Price objects needed). Webhook-driven fulfillment via `checkout.session.completed` is mandatory -- client-side redirects alone must never grant access. Idempotency is achieved by storing processed Stripe event IDs in a `stripe_events` table with a unique constraint, preventing double-processing on webhook retries.

The existing codebase already has the placeholder `UnlockButton` component (disabled), the profile detail page with the unlock CTA section, and the column-inclusion-mode DAL pattern that strictly controls PII access. The research confirms this architecture is sound and identifies the exact integration points.

**Primary recommendation:** Use Stripe Checkout Sessions (`mode: 'payment'`, inline `price_data`) with a webhook route handler at `/api/webhooks/stripe` that verifies signatures via `stripe.webhooks.constructEvent()`, deduplicates via `stripe_events` table, and inserts into `profile_unlocks`. Modify the existing DAL to check unlock status and return full PII columns when unlocked.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.3.1 | Stripe Node.js SDK (server-side) | Official SDK, TypeScript types, API version 2026-01-28.clover |
| next (existing) | 16.1.6 | App Router route handlers for webhook endpoint | Already in stack |
| drizzle-orm (existing) | ^0.45.1 | Schema for profile_unlocks, stripe_events, analytics tables | Already in stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod (existing) | ^4.3.6 | Validate server action inputs for checkout creation | Already in stack |
| lucide-react (existing) | ^0.575.0 | Unlock/lock icons, analytics chart icons | Already in stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout Sessions (hosted) | Stripe Elements (embedded) | Checkout Sessions is simpler, handles PCI compliance entirely, less custom UI but perfectly adequate for single-item unlock |
| price_data (inline) | Pre-created Price objects in Stripe Dashboard | price_data avoids dashboard management, allows dynamic pricing later, simpler for single product |
| Client-side @stripe/stripe-js | Server-side redirect to Checkout URL | Server-side redirect via server action is simpler; no need for client-side Stripe.js library at all |

**Installation:**
```bash
npm install stripe
```

**Environment variables needed:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_AMOUNT=9900          # Amount in cents ($99.00)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Only if using client-side Stripe.js (not needed for Checkout redirect)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    api/
      webhooks/
        stripe/
          route.ts          # Webhook handler (POST only, no auth)
    (authenticated)/
      employer/
        browse/
          [id]/
            page.tsx        # MODIFIED: conditionally show unlocked profile
        purchases/
          page.tsx          # NEW: employer purchase history
    admin/
      analytics/
        page.tsx            # NEW: admin analytics dashboard
  lib/
    stripe.ts               # Stripe client singleton
    dal/
      employer-profiles.ts  # MODIFIED: add getFullProfileById (for unlocked)
      employer-unlocks.ts   # NEW: unlock check, purchase history queries
      admin-analytics.ts    # NEW: analytics aggregate queries
  actions/
    checkout.ts             # NEW: createCheckoutSession server action
  lib/db/
    schema.ts               # MODIFIED: add profileUnlocks, stripeEvents, profileViews tables
    relations.ts            # MODIFIED: add new relations
  components/
    employer/
      unlock-button.tsx     # MODIFIED: wire to checkout action
```

### Pattern 1: Server Action for Checkout Session Creation
**What:** Create Stripe Checkout Session in a server action, then redirect to Stripe-hosted checkout page.
**When to use:** When employer clicks "Unlock Profile" button.
**Example:**
```typescript
// src/actions/checkout.ts
'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { isProfileUnlocked } from '@/lib/dal/employer-unlocks'
import { stripe } from '@/lib/stripe'

export async function createCheckoutSession(profileId: string) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    throw new Error('Unauthorized')
  }

  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    throw new Error('Employer not approved')
  }

  // Prevent double-charge: check if already unlocked
  const alreadyUnlocked = await isProfileUnlocked(user.id, profileId)
  if (alreadyUnlocked) {
    redirect(`/employer/browse/${profileId}`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Profile Unlock',
            description: 'Full access to candidate contact details and complete profile',
          },
          unit_amount: parseInt(process.env.STRIPE_PRICE_AMOUNT || '9900', 10),
        },
        quantity: 1,
      },
    ],
    metadata: {
      employerUserId: user.id,
      profileId: profileId,
      employerProfileId: employerProfile.id,
    },
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_URL}/employer/browse/${profileId}?unlocked=pending`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/employer/browse/${profileId}`,
  })

  redirect(session.url!)
}
```

### Pattern 2: Webhook Route Handler with Signature Verification and Idempotency
**What:** Next.js App Router route handler that receives Stripe webhooks, verifies signatures, deduplicates events, and fulfills unlocks.
**When to use:** Stripe sends `checkout.session.completed` event after successful payment.
**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { stripeEvents, profileUnlocks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const body = await request.text()  // Raw body, NOT JSON parsed
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency: check if event already processed
  const [existing] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, event.id))
    .limit(1)

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Record event BEFORE processing (prevents race conditions on retries)
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
    })
  } catch {
    // Unique constraint violation = concurrent duplicate
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.payment_status === 'paid' && session.metadata) {
      const { employerUserId, profileId } = session.metadata
      if (employerUserId && profileId) {
        await db.insert(profileUnlocks).values({
          employerUserId,
          profileId,
          stripeSessionId: session.id,
          amountPaid: session.amount_total ?? 0,
          currency: session.currency ?? 'usd',
        }).onConflictDoNothing()  // Prevent duplicate unlock rows
      }
    }
  }

  return NextResponse.json({ received: true })
}
```

### Pattern 3: DAL Modification for Conditional PII Access
**What:** Add a new DAL function that returns full profile data (including PII) only when the employer has an unlock record. Keep the existing anonymized DAL function unchanged.
**When to use:** Profile detail page checks unlock status and calls the appropriate DAL function.
**Example:**
```typescript
// src/lib/dal/employer-profiles.ts -- NEW function added alongside existing
export const getFullProfileById = cache(
  async (profileId: string, employerUserId: string): Promise<FullProfileDTO | null> => {
    // First verify unlock exists
    const [unlock] = await db
      .select({ id: profileUnlocks.id })
      .from(profileUnlocks)
      .where(
        and(
          eq(profileUnlocks.employerUserId, employerUserId),
          eq(profileUnlocks.profileId, profileId)
        )
      )
      .limit(1)

    if (!unlock) return null

    // Now fetch full profile WITH PII columns
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, profileId), eq(profiles.status, 'active')),
      columns: {
        id: true,
        name: true,        // PII: only selected for unlocked profiles
        email: true,        // PII: only selected for unlocked profiles
        phone: true,        // PII: only selected for unlocked profiles
        createdAt: true,
      },
      with: {
        // ... same relations as anonymized, but workHistory includes employer
        workHistory: {
          columns: {
            title: true,
            employer: true,     // PII: employer name included for unlocked
            startDate: true,
            endDate: true,
            description: true,  // Full description included for unlocked
          },
        },
        // ... education, barAdmissions, specializations, technicalDomains same
      },
    })

    return profile ? transformToFullDTO(profile) : null
  }
)
```

### Pattern 4: Stripe Client Singleton
**What:** Single Stripe instance shared across the application.
**When to use:** Every file that needs Stripe SDK access imports from this module.
**Example:**
```typescript
// src/lib/stripe.ts
import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})
```

### Anti-Patterns to Avoid
- **Granting access on redirect:** NEVER unlock a profile based on the success_url redirect. Only the webhook can grant access. The success page should show a "processing" state until the webhook has fired.
- **Checking payment client-side:** NEVER send a Stripe session ID to the client and have it verify payment. All verification is server-side via webhook.
- **Single DAL function with conditional PII:** NEVER add an `includeFullDetails` boolean parameter to the existing anonymized DAL function. Keep two separate functions (`getAnonymizedProfileById` and `getFullProfileById`) to prevent accidental PII leakage.
- **Trusting event.type without signature:** NEVER process webhook events without verifying the signature first. The `constructEvent` call MUST come before any event handling.
- **JSON parsing the webhook body:** NEVER use `await request.json()` for the webhook route. Must use `await request.text()` to get the raw body for signature verification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form / card input | Custom payment form with card fields | Stripe Checkout Sessions (hosted page) | PCI compliance, fraud protection, 3D Secure, localization all handled by Stripe |
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Handles timing-safe comparison, signature versioning, tolerance windows |
| Idempotency key generation | UUID-based custom idempotency | Stripe event ID (`event.id`) stored in DB with unique constraint | Stripe guarantees event ID uniqueness; storing it is simpler and more reliable |
| Currency formatting | Manual `(amount / 100).toFixed(2)` everywhere | Helper function `formatCents(amount: number): string` | Consistent formatting, handles edge cases, single source of truth |
| Retry logic for webhooks | Custom retry queue | Stripe's built-in retry (3 days, exponential backoff) | Stripe retries automatically if you return non-2xx; no custom retry needed |

**Key insight:** Stripe Checkout handles the entire payment UI, PCI compliance, 3D Secure authentication, and receipt emails. The only custom code needed is: (1) creating the Checkout Session with metadata, (2) handling the webhook to record the unlock, and (3) checking unlock status in the DAL.

## Common Pitfalls

### Pitfall 1: Webhook Body Parsing
**What goes wrong:** Using `await request.json()` instead of `await request.text()` in the webhook route handler causes signature verification to fail every time.
**Why it happens:** `constructEvent` needs the exact raw bytes Stripe sent. JSON parsing and re-stringifying changes whitespace/ordering.
**How to avoid:** Always use `const body = await request.text()` in the webhook route handler. Never import body-parsing middleware.
**Warning signs:** "Webhook signature verification failed" errors in logs.

### Pitfall 2: Race Condition on Double-Click
**What goes wrong:** Employer double-clicks "Unlock Profile" and two Checkout Sessions are created, potentially leading to double charges.
**Why it happens:** No client-side debouncing or server-side deduplication on session creation.
**How to avoid:** (1) Disable the button after first click with loading state. (2) Check `isProfileUnlocked` in the server action before creating a session. (3) The `profileUnlocks` table has a unique constraint on `(employer_user_id, profile_id)` so even if two webhooks fire, only one unlock is recorded.
**Warning signs:** Multiple Checkout Sessions for the same employer+profile in Stripe Dashboard.

### Pitfall 3: Webhook Handler Timeout
**What goes wrong:** Webhook handler does too much work (sending emails, complex queries) and times out. Stripe sees no 2xx response and retries, causing duplicate processing.
**Why it happens:** Stripe expects a 2xx response quickly (within seconds).
**How to avoid:** Keep the webhook handler fast: verify signature, check idempotency, insert into DB, return 200. Move any slow operations (emails, notifications) to after the response or to a separate queue.
**Warning signs:** Stripe Dashboard shows webhook failures with timeout errors.

### Pitfall 4: Missing Metadata in Webhook
**What goes wrong:** The `checkout.session.completed` event arrives but `session.metadata` is empty or missing expected keys.
**Why it happens:** Metadata was not set when creating the Checkout Session, or was set on `payment_intent_data` instead of the session itself.
**How to avoid:** Set metadata directly on the session (not on `payment_intent_data`). Session metadata is automatically included in webhook events without needing expansion.
**Warning signs:** Webhook handler logs show `undefined` for `metadata.employerUserId` or `metadata.profileId`.

### Pitfall 5: Granting Access Before Webhook
**What goes wrong:** Employer is redirected to success_url and immediately sees full profile, but payment hasn't actually been confirmed.
**Why it happens:** Developer checks URL params (e.g., `?unlocked=true`) instead of database unlock record.
**How to avoid:** The profile detail page must ALWAYS check the `profile_unlocks` table. The success_url can show a "processing payment..." message, then revalidate/refresh to check the real state. Never trust URL parameters for access control.
**Warning signs:** Employer sees full profile but no unlock record exists in the database.

### Pitfall 6: Forgetting `onConflictDoNothing` on Unlock Insert
**What goes wrong:** Stripe retries the webhook, the event ID passes dedup (if using event-first approach), but the `profile_unlocks` insert fails with a unique constraint violation, causing a 500 error to Stripe.
**Why it happens:** The unique constraint on `(employer_user_id, profile_id)` is correct for preventing duplicates, but the insert must handle the conflict gracefully.
**How to avoid:** Use `.onConflictDoNothing()` on the unlock insert, or wrap in try/catch that ignores constraint violations.
**Warning signs:** 500 errors in webhook handler logs on retry events.

### Pitfall 7: Next.js 16 Async Headers
**What goes wrong:** Using `headers()` from `next/headers` without `await` in a route handler.
**Why it happens:** In Next.js 16, `headers()` returns a Promise (unlike older versions).
**How to avoid:** For webhook route handlers, use `request.headers.get('stripe-signature')` directly from the Request object instead of the `headers()` function. This avoids the async issue entirely.
**Warning signs:** TypeScript errors about Promise being used as Headers object.

## Code Examples

### Database Schema for profile_unlocks and stripe_events
```typescript
// Source: Verified against Drizzle ORM ^0.45.1 pg-core types and existing schema patterns
import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'

// Stripe event deduplication table
export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: varchar('stripe_event_id', { length: 255 }).unique().notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('stripe_events_event_id_idx').on(table.stripeEventId),
])

// Profile unlock records (which employer unlocked which candidate)
export const profileUnlocks = pgTable('profile_unlocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).notNull(),
  amountPaid: integer('amount_paid').notNull(),  // In cents
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Unique constraint: one unlock per employer per profile (prevents double charges)
  uniqueIndex('profile_unlocks_employer_profile_idx')
    .on(table.employerUserId, table.profileId),
  index('profile_unlocks_employer_idx').on(table.employerUserId),
  index('profile_unlocks_profile_idx').on(table.profileId),
])

// Profile view tracking (for analytics)
export const profileViews = pgTable('profile_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('profile_views_profile_idx').on(table.profileId),
  index('profile_views_employer_idx').on(table.employerUserId),
  index('profile_views_viewed_at_idx').on(table.viewedAt),
])
```

### Stripe Client Singleton
```typescript
// src/lib/stripe.ts
// Source: Stripe Node.js SDK v20 official pattern
import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})
```

### Unlock Check DAL Function
```typescript
// src/lib/dal/employer-unlocks.ts
import 'server-only'
import { cache } from 'react'
import { db } from '@/lib/db'
import { profileUnlocks } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export const isProfileUnlocked = cache(
  async (employerUserId: string, profileId: string): Promise<boolean> => {
    const [unlock] = await db
      .select({ id: profileUnlocks.id })
      .from(profileUnlocks)
      .where(
        and(
          eq(profileUnlocks.employerUserId, employerUserId),
          eq(profileUnlocks.profileId, profileId)
        )
      )
      .limit(1)
    return !!unlock
  }
)

export const getEmployerPurchases = cache(
  async (employerUserId: string) => {
    return db
      .select({
        profileId: profileUnlocks.profileId,
        amountPaid: profileUnlocks.amountPaid,
        currency: profileUnlocks.currency,
        unlockedAt: profileUnlocks.unlockedAt,
      })
      .from(profileUnlocks)
      .where(eq(profileUnlocks.employerUserId, employerUserId))
      .orderBy(desc(profileUnlocks.unlockedAt))
  }
)
```

### Admin Analytics Aggregate Queries (Drizzle)
```typescript
// src/lib/dal/admin-analytics.ts
import 'server-only'
import { cache } from 'react'
import { db } from '@/lib/db'
import { profileUnlocks, profileViews, profiles } from '@/lib/db/schema'
import { sql, count, sum } from 'drizzle-orm'

export const getAnalyticsSummary = cache(async () => {
  // Total revenue
  const [revenue] = await db
    .select({
      totalRevenue: sum(profileUnlocks.amountPaid),
      totalUnlocks: count(),
    })
    .from(profileUnlocks)

  // Total profile views
  const [views] = await db
    .select({ totalViews: count() })
    .from(profileViews)

  // Total active profiles
  const [activeProfiles] = await db
    .select({ total: count() })
    .from(profiles)
    .where(sql`${profiles.status} = 'active'`)

  // Conversion rate: unlocks / views
  const totalViews = Number(views?.totalViews ?? 0)
  const totalUnlocks = Number(revenue?.totalUnlocks ?? 0)
  const conversionRate = totalViews > 0
    ? ((totalUnlocks / totalViews) * 100).toFixed(1)
    : '0.0'

  return {
    totalRevenue: Number(revenue?.totalRevenue ?? 0),
    totalUnlocks,
    totalViews,
    activeProfiles: Number(activeProfiles?.total ?? 0),
    conversionRate,
  }
})
```

### Wiring UnlockButton to Checkout
```typescript
// src/components/employer/unlock-button.tsx (MODIFIED)
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Loader2 } from 'lucide-react'
import { createCheckoutSession } from '@/actions/checkout'

export function UnlockButton({
  profileId,
  isUnlocked = false,
}: {
  profileId: string
  isUnlocked?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (isUnlocked) {
    return (
      <Button variant="outline" size="lg" disabled>
        <Unlock className="size-4" />
        Profile Unlocked
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="lg"
      disabled={isPending}
      onClick={() => {
        startTransition(() => createCheckoutSession(profileId))
      }}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Lock className="size-4" />
      )}
      {isPending ? 'Processing...' : 'Unlock Full Profile'}
    </Button>
  )
}
```

### Profile Detail Page - Conditional PII Display
```typescript
// Pattern for profile detail page (src/app/(authenticated)/employer/browse/[id]/page.tsx)
// Check unlock status and fetch appropriate data
const unlocked = await isProfileUnlocked(user.id, id)

if (unlocked) {
  const fullProfile = await getFullProfileById(id, user.id)
  // Render full profile with name, email, phone, employer names
} else {
  const profile = await getAnonymizedProfileById(id)
  // Render anonymized profile with unlock CTA (existing behavior)
}
```

### Recording Profile Views (for Analytics)
```typescript
// In the profile detail page, record a view (fire-and-forget, don't block render)
import { db } from '@/lib/db'
import { profileViews } from '@/lib/db/schema'

// Record the view without awaiting (non-blocking)
db.insert(profileViews).values({
  employerUserId: user.id,
  profileId: id,
}).catch(() => {}) // Silently ignore failures
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | Stripe Checkout Sessions API | 2019+ (Charges deprecated) | Use Checkout Sessions, not direct charges |
| Custom payment forms | Stripe Checkout (hosted) | 2020+ (recommended) | No PCI compliance burden on our side |
| `bodyParser: false` config export | App Router default (no body parsing) | Next.js 13+ App Router | No config needed; `request.text()` works out of the box |
| `headers()` synchronous | `headers()` async (returns Promise) | Next.js 15+ | Must `await headers()` in Next.js 16, but webhook handler can use `request.headers.get()` directly |
| `params` synchronous | `params` async (returns Promise) | Next.js 15+ | Must `await params` in page components (already done in codebase) |
| stripe-node v14-17 | stripe-node v20.3.1 | 2025 | API version 2026-01-28.clover, new TypeScript types |

**Deprecated/outdated:**
- Stripe Charges API: Replaced by Payment Intents / Checkout Sessions
- `req.body` raw buffer in Pages Router webhook: App Router uses `request.text()` instead
- Manual `config = { api: { bodyParser: false } }`: Not needed in App Router

## Open Questions

1. **Profile unlock price:**
   - What we know: The env var `STRIPE_PRICE_AMOUNT` stores the price in cents. Example: 9900 = $99.00.
   - What's unclear: The exact price per unlock hasn't been specified in requirements.
   - Recommendation: Use env var for price, defaulting to a reasonable amount. Easy to change without code changes.

2. **Profile view tracking granularity:**
   - What we know: ADMN-03 requires "profile views" in analytics.
   - What's unclear: Should we track every page load (including refreshes by same user), or deduplicate per employer-per-profile-per-day?
   - Recommendation: Track every view (simple insert) -- deduplicate at query time for analytics if needed. This gives maximum flexibility.

3. **Webhook endpoint security beyond signature:**
   - What we know: Stripe signature verification prevents forged webhooks.
   - What's unclear: Whether to also restrict by Stripe IP ranges.
   - Recommendation: Signature verification alone is sufficient per Stripe documentation. IP restriction is not recommended as Stripe IPs change.

4. **Success page UX while webhook is processing:**
   - What we know: Webhook may arrive seconds after redirect.
   - What's unclear: How to handle the brief gap between redirect and webhook processing.
   - Recommendation: Show "Payment received, profile unlocking..." with auto-refresh or polling. The `?unlocked=pending` URL param triggers this state. Profile detail page always checks DB for actual unlock status.

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout Sessions API Reference](https://docs.stripe.com/api/checkout/sessions/create?lang=node) - Session creation parameters, price_data inline pattern
- [Stripe Webhook Signature Verification](https://docs.stripe.com/webhooks/signature) - constructEvent method, raw body requirement
- [Stripe Checkout Fulfillment Guide](https://docs.stripe.com/checkout/fulfillment) - checkout.session.completed event, payment_status values (paid/unpaid/no_payment_required), fulfillment best practices
- [Stripe Webhooks Best Practices](https://docs.stripe.com/webhooks) - Idempotency, event deduplication, response patterns, retry behavior
- [Stripe Node.js SDK v20.3.1](https://github.com/stripe/stripe-node/releases) - Latest version, API version 2026-01-28.clover
- [Stripe Metadata Documentation](https://docs.stripe.com/metadata) - Metadata available in webhook events without expansion

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 15 Complete 2025 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - Server action pattern for checkout, webhook route handler pattern
- [Next.js App Router + Stripe Webhook Signature](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) - request.text() for raw body in App Router
- [Next.js 16 Route Handlers](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases) - Async params, route handler patterns
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - integer for cents, aggregate functions
- [Drizzle ORM Select/Aggregation](https://orm.drizzle.team/docs/select) - count, sum, groupBy patterns

### Tertiary (LOW confidence)
- [Stripe Webhook Event Deduplication Pattern](https://www.duncanmackenzie.net/blog/handling-duplicate-stripe-events/) - Community pattern for storing event IDs, confirmed by multiple sources
- [Storing Money with Drizzle ORM](https://wanago.io/2024/11/04/api-nestjs-drizzle-orm-postgresql-money/) - Integer cents pattern (well-established, but blog source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe SDK v20.3.1 verified via npm/GitHub releases, API version confirmed
- Architecture: HIGH - Checkout Sessions + webhook fulfillment is the officially recommended Stripe pattern; codebase patterns (DAL, server actions, route handlers) are well-established in this project
- Pitfalls: HIGH - Raw body requirement, idempotency patterns, and async headers are all documented in official sources
- Database schema: HIGH - Follows existing codebase patterns (uuid PKs, timestamp with timezone, index naming conventions); money-as-integer-cents is industry standard
- Admin analytics: MEDIUM - Drizzle aggregate queries verified via docs, but dashboard layout is discretionary

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (Stripe SDK moves fast, but core Checkout Sessions API is stable)
