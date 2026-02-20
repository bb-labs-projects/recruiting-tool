---
phase: 06-monetization
plan: 01
subsystem: payment-backend
tags: [stripe, checkout, webhooks, profile-unlock, idempotency, payment]
depends_on:
  requires: [05-01, 04-01]
  provides: [stripe-infrastructure, unlock-dal, webhook-handler, checkout-action, full-profile-dal]
  affects: [06-02, 06-03]
tech-stack:
  added: [stripe@20.3.1]
  patterns: [webhook-driven-fulfillment, event-deduplication, server-action-checkout]
key-files:
  created:
    - src/lib/stripe.ts
    - src/lib/dal/employer-unlocks.ts
    - src/actions/checkout.ts
    - src/app/api/webhooks/stripe/route.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/relations.ts
    - src/lib/dal/employer-profiles.ts
    - .env.example
    - package.json
decisions:
  - "APP_URL already existed in .env.example -- reused it for Stripe success/cancel URLs instead of adding NEXT_PUBLIC_URL"
metrics:
  duration: ~5 min
  completed: 2026-02-20
status: complete
---

# Phase 6 Plan 1: Stripe Payment Infrastructure and Profile Unlock Backend Summary

Stripe SDK with webhook-driven profile unlock fulfillment, checkout server action with double-charge prevention, and PII-gated full profile DAL.

## What Was Built

### Task 1: Database Schema, Relations, Stripe Client, and Environment Setup
- Installed `stripe@20.3.1` SDK
- Added three new tables to `src/lib/db/schema.ts`:
  - `stripeEvents` -- idempotency deduplication table with unique index on stripeEventId
  - `profileUnlocks` -- employer-to-profile unlock records with unique composite index on (employerUserId, profileId) to prevent double-charge
  - `profileViews` -- analytics tracking table with indexes on profileId, employerUserId, and viewedAt
- Updated `src/lib/db/relations.ts`:
  - Added `profileUnlocksRelations` and `profileViewsRelations` with user/profile one-to-one relations
  - Extended `profilesRelations` and `usersRelations` with `many(profileUnlocks)` and `many(profileViews)`
- Created `src/lib/stripe.ts` -- Stripe client singleton with `server-only` guard
- Updated `.env.example` with STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_AMOUNT

### Task 2: Unlock DAL, Full Profile DAL, Checkout Action, and Webhook Handler
- Created `src/lib/dal/employer-unlocks.ts`:
  - `isProfileUnlocked(employerUserId, profileId)` -- cache-wrapped boolean check
  - `getEmployerPurchases(employerUserId)` -- returns all unlocked profiles with specializations via batch join
- Added `getFullProfileById` to `src/lib/dal/employer-profiles.ts`:
  - New `FullProfileDTO` type with PII fields (name, email, phone) and full work history (employer, description)
  - Access gated by `isProfileUnlocked` check -- returns null if employer has not paid
  - Queries ALL profile columns and relations when unlock exists
  - Separate function (not a boolean flag on existing functions) per project decision [04-01-D2]
- Created `src/actions/checkout.ts`:
  - Server action with `'use server'` directive
  - Triple authorization: user role check, employer approval check, double-charge prevention via `isProfileUnlocked`
  - Creates Stripe Checkout Session with inline price_data and metadata (employerUserId, profileId, employerProfileId)
  - Redirects to Stripe Checkout URL on success
- Created `src/app/api/webhooks/stripe/route.ts`:
  - Reads raw body via `request.text()` (not `request.json()`) for signature verification
  - Uses `request.headers.get('stripe-signature')` (not `headers()` from next/headers)
  - Verifies Stripe signature via `stripe.webhooks.constructEvent()`
  - Event deduplication: checks `stripeEvents` table before processing, inserts BEFORE handling (catches concurrent duplicates via unique constraint)
  - Handles `checkout.session.completed`: verifies payment_status is 'paid', extracts metadata, inserts profileUnlock with `.onConflictDoNothing()`
  - Returns 200 on all acknowledged events, 400 on bad signatures, 500 on unexpected errors

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 06-01-D1 | Reused existing APP_URL env var for Stripe success/cancel URLs | APP_URL already existed in .env.example; adding NEXT_PUBLIC_URL would be redundant. Checkout action falls back through APP_URL -> NEXT_PUBLIC_URL -> localhost:3000 |

## Commits

| Hash | Message |
|------|---------|
| 1ad90df | feat(06-01): add Stripe infrastructure, unlock/event/view tables, and env config |
| 7677a26 | feat(06-01): add unlock DAL, full profile DAL, checkout action, and webhook handler |

## Next Phase Readiness

- Stripe payment pipeline is complete end-to-end: checkout action -> Stripe Checkout -> webhook -> profileUnlock record
- Frontend (06-02) can wire unlock buttons using `createCheckoutSession` server action
- Frontend can conditionally render full profiles using `getFullProfileById` (returns null if not unlocked)
- Purchase history available via `getEmployerPurchases` for employer dashboard
- User must add Stripe test keys to `.env` and run `npx drizzle-kit push` to apply new tables
- User must configure Stripe webhook endpoint (CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` or Dashboard)
