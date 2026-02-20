---
phase: 06-monetization
plan: 02
subsystem: employer-payment-ui
tags: [stripe-checkout, profile-unlock, conditional-pii, purchase-history, view-tracking]
depends_on:
  requires: [06-01, 05-01, 04-01]
  provides: [unlock-button-ui, conditional-profile-display, purchase-history-page, profile-view-tracking]
  affects: [06-03]
tech-stack:
  added: []
  patterns: [useTransition-for-server-action-calls, conditional-pii-rendering, fire-and-forget-analytics]
key-files:
  created:
    - src/app/(authenticated)/employer/purchases/page.tsx
  modified:
    - src/components/employer/unlock-button.tsx
    - src/app/(authenticated)/employer/browse/[id]/page.tsx
    - src/app/(authenticated)/employer/nav.tsx
decisions: []
metrics:
  duration: ~4 min
  completed: 2026-02-20
status: complete
---

# Phase 6 Plan 2: Unlock Button, Conditional Profile Display, and Purchase History Summary

Functional unlock button wired to Stripe Checkout with loading state, conditional PII rendering on profile detail page, purchase history page with formatted currency, and employer nav updated with Purchases link.

## What Was Built

### Task 1: Wire Unlock Button and Conditional PII Display on Profile Detail Page
- Rewrote `src/components/employer/unlock-button.tsx` as a client component:
  - Uses `useTransition` for loading state and double-click prevention
  - Calls `createCheckoutSession(profileId)` server action on click
  - Shows Loader2 spinner and "Processing..." text while pending
  - When `isUnlocked={true}`, renders disabled "Profile Unlocked" outline button with Unlock icon
- Rewrote `src/app/(authenticated)/employer/browse/[id]/page.tsx` with conditional rendering:
  - Checks `isProfileUnlocked(user.id, id)` to determine view mode
  - **Unlocked view:** Displays candidate's actual name as page title, contact info section with email (mailto link) and phone (tel link), full work history with employer names and descriptions
  - **Anonymized view:** Preserved existing behavior -- "IP Professional" title, anonymized work history, unlock CTA section at bottom
  - Fire-and-forget profile view tracking: `db.insert(profileViews).values(...).catch(() => {})` -- non-blocking, silently ignores failures
  - Handles `?unlocked=pending` search param: shows blue info banner telling employer their unlock is being processed when webhook hasn't fired yet
  - Extracted `renderAnonymizedView` helper function for reuse in the unlocked-fallback path

### Task 2: Purchase History Page and Employer Navigation Update
- Created `src/app/(authenticated)/employer/purchases/page.tsx`:
  - Server component with standard approval gate (getUser, getEmployerProfile, redirect if not approved)
  - Fetches purchases via `getEmployerPurchases(user.id)` from employer-unlocks DAL
  - Displays each purchase as a Card with specialization badges, formatted currency (`$${amountPaid/100}`), date, and "View Profile" link
  - Empty state with Receipt icon guides employers to browse candidates
- Updated `src/app/(authenticated)/employer/nav.tsx`:
  - Added "Purchases" link with Receipt icon between Saved and end of nav
  - Nav now shows: Dashboard, Browse, Saved, Purchases

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

No new decisions were required. All patterns followed existing conventions from 06-01 and prior phases.

## Commits

| Hash | Message |
|------|---------|
| a239ae2 | feat(06-02): wire unlock button and conditional PII display on profile detail page |
| 37c6e80 | feat(06-02): add purchase history page and update employer nav with Purchases link |

## Next Phase Readiness

- Unlock flow is now end-to-end functional: employer clicks Unlock -> Stripe Checkout -> webhook records unlock -> page refresh shows full PII
- Purchase history available for employer self-service review of past payments
- Profile view tracking feeds admin analytics (profileViews table populated on every detail page load)
- Plan 06-03 (admin analytics dashboard) can use profileViews and profileUnlocks data for reporting
