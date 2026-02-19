---
phase: 01-foundation-and-auth
plan: 01
subsystem: foundation
tags: [nextjs, tailwind, shadcn, drizzle, postgresql, scaffolding]
depends_on: []
provides:
  - "Running Next.js 16.1.6 application with App Router"
  - "Tailwind v4 CSS-first configuration"
  - "shadcn/ui component library (button, input, card, label)"
  - "Drizzle ORM schema for users, magicLinkTokens, sessions"
  - "Database migration SQL ready for deployment"
  - "Environment variable template"
affects:
  - "01-02: Auth implementation depends on schema and db client"
  - "All subsequent plans depend on the running Next.js app"
tech_stack:
  added:
    - "next@16.1.6"
    - "react@19.2.3"
    - "drizzle-orm@0.45.1"
    - "drizzle-kit@0.31.9"
    - "@neondatabase/serverless@1.0.2"
    - "jose@6.1.3"
    - "zod@4.3.6"
    - "resend@6.9.2"
    - "@react-email/components@1.0.8"
    - "server-only@0.0.1"
    - "tailwindcss@4"
    - "shadcn@3.8.5"
  patterns:
    - "Tailwind v4 CSS-first config (no tailwind.config.ts)"
    - "shadcn/ui new-york style with CSS variables"
    - "Drizzle ORM pgTable schema-as-code"
    - "UUID primary keys with defaultRandom()"
    - "neon-http driver for serverless PostgreSQL"
key_files:
  created:
    - "package.json"
    - "tsconfig.json"
    - "next.config.ts"
    - "postcss.config.mjs"
    - "eslint.config.mjs"
    - "components.json"
    - ".gitignore"
    - ".env.example"
    - "src/app/globals.css"
    - "src/app/layout.tsx"
    - "src/app/page.tsx"
    - "src/lib/utils.ts"
    - "src/lib/db/schema.ts"
    - "src/lib/db/index.ts"
    - "drizzle.config.ts"
    - "drizzle/0000_curly_stark_industries.sql"
    - "src/components/ui/button.tsx"
    - "src/components/ui/input.tsx"
    - "src/components/ui/card.tsx"
    - "src/components/ui/label.tsx"
  modified: []
decisions:
  - id: "01-01-D1"
    decision: "Used create-next-app fallback (scaffold to temp dir, copy over)"
    reason: "Project root had existing .git, .planning, .claude directories"
  - id: "01-01-D2"
    decision: "Added .env.example exception to .gitignore"
    reason: "Default .gitignore had .env* which would exclude the template file"
  - id: "01-01-D3"
    decision: "text() for IP address columns (not inet)"
    reason: "Per research recommendation - avoids driver compatibility issues"
metrics:
  duration: "~11 minutes"
  completed: "2026-02-19"
---

# Phase 1 Plan 1: Scaffold Next.js Project and Database Schema Summary

Next.js 16.1.6 app with Tailwind v4 CSS-first config, shadcn/ui components, Drizzle ORM schema for auth tables (users, magicLinkTokens, sessions), and generated migration SQL ready for Neon PostgreSQL.

## What Was Done

### Task 1: Scaffold Next.js project and install all dependencies
- Scaffolded Next.js 16.1.6 via `create-next-app@latest` into temp directory, copied to project root (preserving .git, .planning, .claude)
- Installed core dependencies: drizzle-orm, @neondatabase/serverless, jose, server-only, zod, resend, @react-email/components
- Installed dev dependencies: drizzle-kit, dotenv
- Verified Tailwind v4 CSS-first configuration (no tailwind.config.ts, uses `@import "tailwindcss"`)
- Initialized shadcn/ui with defaults, added button, input, card, label components
- Created `.env.example` with all Phase 1 environment variables
- Created `.env.local` as user-fillable copy
- Added `.env.example` exception to `.gitignore`
- **Commit:** `31bd76e`

### Task 2: Create database schema and Drizzle configuration
- Created `src/lib/db/schema.ts` with 3 tables and 1 enum:
  - `userRoleEnum`: candidate, employer, admin
  - `users`: UUID PK, email (unique + indexed), role, emailVerified, isActive, timestamps
  - `magicLinkTokens`: UUID PK, FK to users (cascade), tokenHash (unique + indexed), expiresAt (indexed), userId (indexed), IP/UA tracking
  - `sessions`: UUID PK, FK to users (cascade), tokenHash (unique + indexed), userId (indexed), timestamps, IP/UA tracking
- Created `src/lib/db/index.ts` with Drizzle client using neon-http driver
- Created `drizzle.config.ts` at project root
- Generated migration SQL via `drizzle-kit generate` -- validated schema compiles correctly
- **Commit:** `43134da`

## Verification Results

| Check | Result |
|-------|--------|
| `npm run dev` starts on localhost:3000 | PASS |
| `npx tsc --noEmit` zero type errors | PASS |
| `./drizzle/` contains migration SQL | PASS |
| Generated SQL has CREATE TABLE for all 3 tables | PASS |
| Generated SQL has CREATE TYPE for user_role | PASS |
| `src/components/ui/` has button, input, card, label | PASS |
| `.env.example` lists all required vars | PASS |
| No `tailwind.config.ts` exists | PASS |
| Schema exports users, magicLinkTokens, sessions, userRoleEnum | PASS |
| db/index.ts exports db | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Scaffold fallback procedure used** -- Project root was non-empty, so scaffolded to `tmp-scaffold/` and copied files, preserving `.git`, `.planning`, `.claude`
2. **Added .env.example exception to .gitignore** -- Default Next.js `.gitignore` has `.env*` which would block committing the env template
3. **text() for IP address columns** -- Used `text()` instead of `inet()` per research recommendation to avoid driver compatibility issues

## Next Phase Readiness

### Required before Plan 01-02 (Auth Implementation):
- User must create a Neon PostgreSQL project and set `DATABASE_URL` in `.env.local`
- User must run `npx drizzle-kit push` or `npx drizzle-kit migrate` to apply schema
- User must set `SESSION_SECRET` (generate with `openssl rand -base64 32`)
- User must configure Resend API key and email address

### What's ready:
- All npm packages installed and TypeScript compiling
- Database schema defined and migration SQL generated
- shadcn/ui components available for auth forms
- Dev server running on localhost:3000
