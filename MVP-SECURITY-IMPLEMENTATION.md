# Critical MVP Security & Compliance Implementation

Implemented 8 tasks covering 5 critical security/compliance gaps identified in the Cromwell Chase blueprint.

---

## 1. Cloudflare Turnstile Anti-Bot Protection

**Purpose:** Prevent automated abuse of login and registration forms.

**New files:**
- `src/lib/turnstile.ts` -- server-side token verification with graceful degradation (returns `true` when env vars are missing, so dev/test environments work without configuration)
- `src/components/turnstile-widget.tsx` -- client component wrapping `@marsidev/react-turnstile`

**Modified files:**
- `src/components/auth/magic-link-form.tsx` -- Turnstile widget + hidden token input
- `src/components/employer/registration-form.tsx` -- same pattern
- `src/actions/auth.ts` -- verifies turnstile token before processing magic link
- `src/app/api/auth/magic-link/request/route.ts` -- verifies turnstile token
- `src/actions/employers.ts` -- verifies turnstile token in `registerEmployer`

**Env vars required:**
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` -- Cloudflare dashboard site key
- `TURNSTILE_SECRET_KEY` -- Cloudflare dashboard secret key

---

## 2. Terms of Business (ToB) Acceptance Gate

**Purpose:** Require employers to accept legal terms before browsing candidates.

**New files:**
- `src/lib/tob-constants.ts` -- current ToB version (`1.0`) and placeholder legal text
- `src/actions/terms.ts` -- `acceptTerms` server action (sets `tobAcceptedAt` + `tobVersion`)
- `src/components/employer/tob-acceptance-form.tsx` -- checkbox + submit form
- `src/app/(authenticated)/employer/terms/page.tsx` -- full ToB page with acceptance flow

**Modified files:**
- `src/app/(authenticated)/employer/browse/page.tsx` -- redirects to `/employer/terms` if ToB not accepted
- `src/app/(authenticated)/employer/saved/page.tsx` -- same redirect gate
- `src/app/(authenticated)/employer/page.tsx` -- shows ToB prompt banner on dashboard
- `src/app/admin/employers/[id]/page.tsx` -- displays ToB acceptance status and timestamp
- `src/app/admin/employers/columns.tsx` -- adds ToB status column
- `src/app/admin/employers/page.tsx` -- passes ToB data to table
- `src/lib/dal/admin-employers.ts` -- includes `tobAcceptedAt`, `tobVersion` in queries

**Schema changes:** `employer_profiles.tob_accepted_at`, `employer_profiles.tob_version`

---

## 3. Freemail Detection & Corporate Email Domain

**Purpose:** Flag employer registrations from consumer email providers (Gmail, Yahoo, etc.) for admin review.

**New files:**
- `src/lib/freemail-domains.ts` -- 30+ freemail domains, `isFreemailDomain()`, `extractDomain()`

**Modified files:**
- `src/actions/employers.ts` -- extracts email domain at registration, stores `corporateEmailDomain` and `isFreemailDomain`
- `src/lib/dal/admin-employers.ts` -- includes freemail fields in queries
- `src/app/admin/employers/[id]/page.tsx` -- shows email domain with amber "Freemail" warning badge
- `src/app/admin/employers/columns.tsx` -- adds domain column with freemail indicator
- `src/app/admin/employers/page.tsx` -- passes domain data to table

**Schema changes:** `employer_profiles.corporate_email_domain`, `employer_profiles.is_freemail_domain`

---

## 4. Trade Licence Upload

**Purpose:** Allow employers to upload trade licence documents for verification.

**New files:**
- `src/components/employer/trade-licence-upload.tsx` -- file upload component (PDF/JPG/PNG, 10MB max)
- `src/app/api/employer/trade-licence/upload/route.ts` -- uploads to Supabase `trade-licences` bucket
- `src/app/api/employer/trade-licence/signed-url/route.ts` -- generates signed download URL for admin
- `src/actions/employer-verification.ts` -- admin action to update verification notes
- `src/components/admin/verification-section.tsx` -- admin verification UI

**Modified files:**
- `src/components/employer/registration-form.tsx` -- optional trade licence upload section
- `src/app/admin/employers/[id]/page.tsx` -- displays trade licence document, download link, and verification notes textarea

**Schema changes:** `employer_profiles.trade_licence_storage_path`, `employer_profiles.trade_licence_filename`, `employer_profiles.trade_licence_uploaded_at`, `employer_profiles.verification_notes`

**Supabase setup required:** Create a `trade-licences` storage bucket in Supabase dashboard.

---

## 5. Domain-Based Candidate Suppression

**Purpose:** Prevent employers from seeing their own employees in browse results (anti-poaching compliance).

**Suppression rules:**
1. Candidates whose current employer (work history with no end date) fuzzy-matches the employer's company name
2. Candidates whose email domain matches one of the employer's registered corporate domains

**New files:**
- `src/lib/suppression.ts` -- `buildSuppressionConditions()` returning Drizzle SQL conditions
- `src/actions/employer-domains.ts` -- admin action to manage corporate domains

**Modified files:**
- `src/lib/dal/employer-profiles.ts` -- `getAnonymizedProfiles()` now accepts optional `employerUserId` and applies suppression
- `src/lib/matching/pre-filter.ts` -- applies suppression in job matching pipeline
- `src/lib/matching/run-matching.ts` -- passes employer context to pre-filter
- `src/app/(authenticated)/employer/browse/page.tsx` -- passes user ID to profile query
- `src/components/employer/registration-form.tsx` -- optional corporate domains input
- `src/app/admin/employers/[id]/page.tsx` -- displays/edits corporate domains

**Schema changes:** `employer_profiles.corporate_domains` (text array)

---

## 6. TOTP Multi-Factor Authentication (MFA)

**Purpose:** Optional TOTP-based MFA for any user account.

### Core (Session + Challenge Flow)

**New files:**
- `src/lib/auth/mfa.ts` -- TOTP generation/verification (via `otpauth`), AES-256-GCM secret encryption, recovery code generation/hashing
- `src/app/(public)/auth/mfa-challenge/page.tsx` -- MFA challenge page
- `src/components/auth/mfa-challenge-form.tsx` -- 6-digit code input + recovery code option
- `src/app/api/auth/mfa/verify/route.ts` -- verifies TOTP code, updates session JWT
- `src/app/api/auth/mfa/recovery/route.ts` -- verifies recovery code, marks as used

**Modified files:**
- `src/lib/auth/session.ts` -- `SessionPayload` extended with `mfaVerified: boolean`; backward-compatible (defaults to `true` for existing sessions)
- `src/proxy.ts` -- redirects to `/auth/mfa-challenge` when `mfaVerified === false`; `/auth/mfa-challenge` added to public routes
- `src/app/api/auth/magic-link/verify/route.ts` -- checks `user.mfaEnabled`; if true, sets `mfaVerified: false` in session and redirects to MFA challenge

### Setup + Recovery UI

**New files:**
- `src/app/(authenticated)/settings/mfa/page.tsx` -- MFA settings page
- `src/components/settings/mfa-setup-form.tsx` -- QR code display, verification step, recovery code display
- `src/app/api/auth/mfa/setup/route.ts` -- generates TOTP secret + QR code data URL
- `src/app/api/auth/mfa/confirm-setup/route.ts` -- verifies first code, enables MFA, returns recovery codes
- `src/actions/mfa.ts` -- `disableMfa` action (requires TOTP verification)

**Modified files:**
- `src/lib/dal.ts` -- `getUser()` now includes `mfaEnabled` in select

**Schema changes:** `users.mfa_secret`, `users.mfa_enabled`, `users.mfa_verified_at`, `mfa_recovery_codes` table

**Env vars required:**
- `MFA_ENCRYPTION_KEY` -- 32-byte hex string for AES-256-GCM (generate with `openssl rand -hex 32`)

---

## Database Migration

All schema changes are in a single Drizzle migration: `drizzle/0003_living_sersi.sql`

The migration has already been applied to the production database. It includes:
- `mfa_recovery_codes` table creation
- 9 new columns on `employer_profiles`
- 3 new columns on `users`
- Foreign key constraint and index on `mfa_recovery_codes`

---

## New Environment Variables Summary

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Cloudflare Turnstile site key (graceful degradation if missing) |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile secret key |
| `MFA_ENCRYPTION_KEY` | Required for MFA | 32-byte hex for AES-256-GCM encryption of TOTP secrets |

---

## New npm Dependencies

| Package | Type | Purpose |
|---|---|---|
| `@marsidev/react-turnstile` | production | Cloudflare Turnstile React component |
| `otpauth` | production | TOTP generation and verification |
| `qrcode` | production | QR code generation for MFA setup |
| `@types/qrcode` | dev | TypeScript types for qrcode |
