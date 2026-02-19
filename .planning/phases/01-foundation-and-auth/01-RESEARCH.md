# Phase 1: Foundation and Auth - Research

**Researched:** 2026-02-19
**Domain:** Next.js 16 App Router, Drizzle ORM, Neon PostgreSQL, Magic Link Auth, Resend Email
**Confidence:** HIGH

## Summary

This phase covers project scaffolding and implementing magic link authentication with role-based routing. The stack is locked: Next.js (App Router) + Drizzle ORM + Neon PostgreSQL + Resend + Tailwind CSS + shadcn/ui.

The latest stable Next.js is **16.1.6** (not 15 as originally stated in project docs). Next.js 16 introduced a breaking change: `middleware.ts` is now `proxy.ts`. All authentication middleware patterns must use the `proxy.ts` file convention. The official Next.js authentication guide recommends a defense-in-depth approach: proxy for optimistic checks (cookie-based), a Data Access Layer (DAL) for secure checks (database-backed), and authorization in Server Components and Server Actions. This maps cleanly to the magic link spec.

Drizzle ORM v0.45.1 with Neon's serverless HTTP driver is the correct pairing for Vercel deployment. Schema definitions use the `pgTable()` function from `drizzle-orm/pg-core`, with `uuid().defaultRandom()` for primary keys and `drizzle-kit` for migrations. Relations v2 uses `defineRelations()` with `r.one()` and `r.many()`.

**Primary recommendation:** Use Next.js 16.1.x with `proxy.ts` for route protection, database-backed sessions with jose-encrypted cookies for session management, Drizzle ORM neon-http driver for database access, and a Data Access Layer pattern that centralizes all auth checks.

## Standard Stack

The established libraries and tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | Full-stack React framework (App Router) | Latest stable; includes proxy.ts, Server Actions, React 19 |
| react / react-dom | 19.2.4 | UI library | Required by Next.js 16; includes useActionState |
| typescript | 5.9.3 | Type safety | Required for Drizzle schema type inference |
| drizzle-orm | 0.45.1 | Type-safe ORM | SQL-like API, excellent PostgreSQL support, schema-as-code |
| drizzle-kit | 0.31.9 | Migration CLI | Generate/push/migrate schema changes |
| @neondatabase/serverless | 1.0.2 | Neon PostgreSQL driver | HTTP-based serverless driver for Vercel |
| resend | 6.9.2 | Transactional email API | Simple API, React email templates, good DX |
| tailwindcss | 4.2.0 | Utility CSS framework | v4: CSS-first config, smaller output |
| zod | 4.3.6 | Schema validation | Form validation, API input validation |
| jose | 6.1.3 | JWT/JWS/JWE library | Edge-compatible, Web Crypto API, session encryption |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/postcss | (bundled) | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 with Next.js |
| server-only | 0.0.1 | Prevent server code in client bundles | Import in DAL, session lib, server actions |
| @react-email/components | 1.0.8 | React-based email templates | Build magic link email template |
| dotenv | latest | Environment variable loading | Local development only |

### CLI Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `npx shadcn@latest init` | Initialize shadcn/ui | Project setup, creates components/ui directory |
| `npx shadcn@latest add [component]` | Add individual components | Install Button, Input, Card, Form, etc. |
| `npx drizzle-kit generate` | Generate SQL migrations | After schema changes |
| `npx drizzle-kit push` | Push schema directly | Development only |
| `npx drizzle-kit migrate` | Apply migrations | Production deployment |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose (stateless JWT) | iron-session | iron-session is simpler but less control; jose recommended by Next.js official docs |
| In-memory rate limiting | @upstash/ratelimit + @upstash/redis | Upstash is production-grade but requires external Redis; in-memory is fine for single-instance Vercel deployment |
| Custom magic link auth | Auth.js / NextAuth v5 | Auth.js has magic link support but spec requires custom token handling, SHA-256 hashing, specific rate limiting -- custom is correct here |
| neon-http driver | postgres.js (node-postgres) | postgres.js is traditional TCP; neon-http is HTTP-based, better for serverless/Vercel |

### Installation

```bash
# Create Next.js project
npx create-next-app@latest recruiting-tool --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth and session
npm install jose server-only zod

# Email
npm install resend @react-email/components

# shadcn/ui (run after project creation)
npx shadcn@latest init
npx shadcn@latest add button input card label form toast
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (public)/              # Public routes (no auth required)
│   │   ├── layout.tsx         # Public layout (centered, minimal)
│   │   ├── login/
│   │   │   └── page.tsx       # Magic link request form
│   │   └── auth/
│   │       └── verify/
│   │           └── page.tsx   # Magic link verification page
│   ├── (authenticated)/       # Shared auth check layout
│   │   ├── layout.tsx         # Verifies session, provides user context
│   │   ├── candidate/         # Candidate area
│   │   │   ├── layout.tsx     # Candidate-specific layout
│   │   │   └── page.tsx       # Candidate dashboard
│   │   └── employer/          # Employer area
│   │       ├── layout.tsx     # Employer-specific layout
│   │       └── page.tsx       # Employer dashboard
│   ├── admin/                 # Admin area (NOT in route group -- explicit /admin path)
│   │   ├── layout.tsx         # Admin layout with sidebar
│   │   └── page.tsx           # Admin dashboard
│   ├── api/
│   │   └── auth/
│   │       ├── magic-link/
│   │       │   ├── request/
│   │       │   │   └── route.ts   # POST: request magic link
│   │       │   └── verify/
│   │       │       └── route.ts   # POST: verify token, create session
│   │       ├── logout/
│   │       │   └── route.ts       # POST: destroy session
│   │       └── me/
│   │           └── route.ts       # GET: current user
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Landing / redirect
├── components/
│   ├── ui/                    # shadcn/ui components (auto-generated)
│   ├── auth/
│   │   ├── magic-link-form.tsx    # Email input form
│   │   ├── magic-link-verify.tsx  # Token verification UI
│   │   └── logout-button.tsx      # Logout action
│   └── layout/
│       ├── header.tsx
│       └── sidebar.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client initialization
│   │   ├── schema.ts          # All table definitions
│   │   └── relations.ts       # Drizzle relations definitions
│   ├── auth/
│   │   ├── session.ts         # Session create/verify/delete (jose + cookies)
│   │   ├── magic-link.ts      # Token generation, hashing, verification
│   │   ├── rate-limit.ts      # Rate limiting logic
│   │   └── constants.ts       # Auth configuration constants
│   ├── dal.ts                 # Data Access Layer (verifySession, getUser)
│   ├── email/
│   │   └── magic-link-email.tsx   # React email template
│   └── utils.ts               # Shared utilities
├── actions/
│   └── auth.ts                # Server actions for auth forms
├── drizzle/                   # Generated migration files
├── drizzle.config.ts          # Drizzle Kit configuration
└── proxy.ts                   # Route protection (was middleware.ts)
```

### Pattern 1: Defense-in-Depth Authentication

**What:** Three-layer auth: proxy (optimistic), DAL (secure), component-level checks
**When to use:** Every authenticated route and action
**Why:** CVE-2025-29927 proved proxy-only auth is bypassable. Next.js official docs mandate this pattern.

```typescript
// Source: https://nextjs.org/docs/app/guides/authentication

// Layer 1: proxy.ts - Optimistic check (cookie existence only)
import { NextResponse, NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/session'

const publicRoutes = ['/login', '/auth/verify']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))

  const cookie = request.cookies.get('session')?.value
  const session = await decrypt(cookie)

  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublicRoute && session?.userId) {
    // Redirect authenticated users based on role
    const redirectPath = session.role === 'admin' ? '/admin'
      : session.role === 'employer' ? '/employer'
      : '/candidate'
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // Role-based route protection
  if (path.startsWith('/admin') && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

```typescript
// Layer 2: lib/dal.ts - Secure database check
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const payload = await decrypt(cookie)

  if (!payload?.sessionId) {
    redirect('/login')
  }

  // Verify session exists in database and is not expired
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, payload.sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )

  if (!session) {
    redirect('/login')
  }

  return { userId: session.userId, sessionId: session.id }
})

export const getUser = cache(async () => {
  const session = await verifySession()

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, session.userId))

  return user ?? null
})
```

```typescript
// Layer 3: Component-level check
// app/admin/page.tsx
import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    redirect('/login')
  }
  return <div>Admin Dashboard for {user.email}</div>
}
```

### Pattern 2: Database-Backed Sessions with Encrypted Cookie

**What:** Session stored in DB, encrypted session ID stored in HTTP-only cookie via jose
**When to use:** All session management
**Why:** Spec requires HTTP-only cookies. DB sessions allow server-side invalidation (logout). jose is Edge-compatible.

```typescript
// Source: https://nextjs.org/docs/app/guides/authentication (Database Sessions section)

// lib/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

interface SessionPayload {
  sessionId: string
  userId: string
  role: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined): Promise<SessionPayload | null> {
  if (!session) return null
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(sessionId: string, userId: string, role: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ sessionId, userId, role, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'strict',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
```

### Pattern 3: Magic Link Token Flow

**What:** Generate token -> hash -> store -> email -> verify -> create session
**When to use:** Authentication flow
**Why:** Spec requires crypto.randomBytes(32), SHA-256 hash storage, 10-min expiry, single-use

```typescript
// lib/auth/magic-link.ts
import 'server-only'
import { randomBytes, createHash } from 'crypto'

export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
```

### Pattern 4: Server Actions for Auth Forms

**What:** Use Next.js Server Actions with useActionState for form handling
**When to use:** Login form, any auth-related form submission
**Why:** Official Next.js pattern. Server-side validation, progressive enhancement, secure.

```typescript
// actions/auth.ts
'use server'

import { z } from 'zod'

const RequestMagicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export type MagicLinkState = {
  success?: boolean
  error?: string
} | undefined

export async function requestMagicLink(
  prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const validated = RequestMagicLinkSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors.email?.[0] }
  }

  // Rate limit check, token generation, email sending...
  // Always return success to prevent email enumeration
  return { success: true }
}
```

```tsx
// components/auth/magic-link-form.tsx
'use client'

import { useActionState } from 'react'
import { requestMagicLink } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(requestMagicLink, undefined)

  if (state?.success) {
    return <p>Check your email for a login link.</p>
  }

  return (
    <form action={action}>
      <Input name="email" type="email" placeholder="you@example.com" required />
      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  )
}
```

### Pattern 5: Email Prefetch Protection (Two-Step Verify)

**What:** Magic link landing page shows "Confirm login" button instead of auto-verifying
**When to use:** Magic link verification page
**Why:** Email providers like Outlook pre-fetch URLs, which would consume the one-time token before the user clicks

```
Flow:
1. User clicks magic link in email -> GET /auth/verify?token=abc123
2. Page renders "Click to confirm login" button (does NOT auto-verify)
3. User clicks button -> POST /api/auth/magic-link/verify with token
4. Server validates token, creates session, redirects
```

This is explicitly called out in the spec (section 6: Edge Cases). The verify page should be a client component that renders a confirmation UI, not a server component that auto-consumes the token.

### Anti-Patterns to Avoid

- **Proxy-only auth:** Never rely solely on proxy.ts for security. CVE-2025-29927 showed proxy can be bypassed. Always verify in DAL.
- **Layout auth checks:** Layouts do NOT re-render on navigation in Next.js. Never put auth checks in layout.tsx alone -- use page-level or DAL checks.
- **Client-side role checks:** Never trust client-side role checks for security. The proxy and DAL both check roles server-side.
- **Storing raw tokens:** Never store the raw magic link token in the database. Store only the SHA-256 hash.
- **GET-based token consumption:** Never consume the magic link token on a GET request. Use POST to prevent email prefetch issues.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom crypto code | jose library | Web Crypto API compatible, Edge-ready, handles all JWS/JWE edge cases |
| Form validation | Manual if/else chains | Zod schemas | Type inference, composable, works with useActionState pattern |
| Email templates | Raw HTML strings | @react-email/components | React components, preview in browser, type-safe props |
| UI components | Custom buttons/inputs/cards | shadcn/ui | Accessible, themed, copy-paste ownership, Tailwind-native |
| Session cookie handling | Manual Set-Cookie headers | Next.js cookies() API | Handles encoding, parsing, secure defaults |
| Database schema types | Raw SQL files | Drizzle pgTable() definitions | Type-safe, generates migrations, powers relational queries |

**Key insight:** The magic link flow itself IS custom (per spec requirements), but every building block should use established libraries. The custom code is the orchestration, not the cryptography or infrastructure.

## Common Pitfalls

### Pitfall 1: Using middleware.ts Instead of proxy.ts

**What goes wrong:** Next.js 16 deprecated `middleware.ts` and renamed it to `proxy.ts`. Using `middleware.ts` will still work but is deprecated and will be removed.
**Why it happens:** Most tutorials and training data reference `middleware.ts`. Next.js 16 was released recently.
**How to avoid:** Use `proxy.ts` at the project root (or `src/proxy.ts`). Export a function named `proxy`, not `middleware`.
**Warning signs:** Deprecation warnings in console during development.

### Pitfall 2: Auth Checks in Layouts Only

**What goes wrong:** User navigates between routes without auth being re-checked because layouts don't re-render on client-side navigation (Partial Rendering).
**Why it happens:** It seems logical to put auth in the shared layout.
**How to avoid:** Put auth checks in page components or the DAL (called from page components). Layouts can fetch user data for display but should not be the security boundary.
**Warning signs:** Auth works on first load but not after client-side navigation.

### Pitfall 3: Not Handling Email Prefetch for Magic Links

**What goes wrong:** Outlook/Gmail security scanners pre-fetch the magic link URL, consuming the one-time token before the user clicks.
**Why it happens:** Spec mentions this but it's easy to skip. Developers assume GET = safe.
**How to avoid:** The verify page should render a "Confirm" button. Token consumption happens on POST only.
**Warning signs:** Users report "Token already used" errors immediately after receiving the email.

### Pitfall 4: Leaking Session Secret to Client

**What goes wrong:** Session encryption key accidentally imported in client component.
**Why it happens:** Import chains can pull server-only code into client bundles.
**How to avoid:** Add `import 'server-only'` at the top of session.ts, dal.ts, and any server-only module.
**Warning signs:** Build errors about Node.js crypto in client bundle (good -- means the guard is working).

### Pitfall 5: SameSite=Lax vs Strict for Magic Links

**What goes wrong:** With SameSite=Strict, cookies are not sent on cross-origin navigations. When user clicks magic link in email (cross-origin), the session cookie from a previous login won't be sent.
**Why it happens:** Spec says SameSite=Strict, but this can cause issues with the magic link flow itself.
**How to avoid:** Use SameSite=Strict for the session cookie (spec requirement). The magic link verify endpoint creates a NEW session, so the lack of existing cookie on the inbound click is fine -- the verify page POSTs to the API which sets the new cookie on the response.
**Warning signs:** None if implemented correctly. Just be aware the magic link click itself is cross-origin.

### Pitfall 6: Tailwind v4 Configuration Differences

**What goes wrong:** Using `tailwind.config.js` with Tailwind v4, which uses CSS-first configuration.
**Why it happens:** Most tutorials show v3 configuration.
**How to avoid:** Use `@import "tailwindcss"` in CSS file. Config goes in CSS, not JavaScript. PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss`.
**Warning signs:** Tailwind classes not applying, config file being ignored.

### Pitfall 7: Drizzle neon-http vs neon-websockets Driver Confusion

**What goes wrong:** Using WebSocket driver in serverless environment where HTTP is more efficient, or trying to use interactive transactions with HTTP driver.
**Why it happens:** Two drivers with similar names, unclear when to use which.
**How to avoid:** Use `drizzle-orm/neon-http` for Next.js on Vercel. HTTP driver handles single queries and non-interactive transactions perfectly. Only use WebSocket driver if you need interactive transactions (we don't for auth).
**Warning signs:** Slow cold starts, connection timeouts in serverless.

### Pitfall 8: Proxy Runs on Every Route Including Prefetches

**What goes wrong:** Heavy auth logic in proxy slows down all navigation.
**Why it happens:** Proxy runs on every matched route, including prefetched routes.
**How to avoid:** Only read and decrypt the cookie in proxy (fast, no DB call). Do database verification in the DAL, not in proxy.
**Warning signs:** Slow page navigation, high latency on all routes.

## Code Examples

### Database Schema (Drizzle ORM)

```typescript
// lib/db/schema.ts
// Source: Drizzle ORM docs + magic link spec

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Role enum
export const userRoleEnum = pgEnum('user_role', ['candidate', 'employer', 'admin'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: userRoleEnum('role').notNull().default('candidate'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
])

// Magic link tokens
export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  redirectPath: text('redirect_path').default('/'),
}, (table) => [
  index('magic_link_tokens_hash_idx').on(table.tokenHash),
  index('magic_link_tokens_expires_idx').on(table.expiresAt),
  index('magic_link_tokens_user_idx').on(table.userId),
])

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => [
  index('sessions_token_idx').on(table.tokenHash),
  index('sessions_user_idx').on(table.userId),
])
```

### Drizzle Client Initialization

```typescript
// lib/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new

import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

### Drizzle Configuration

```typescript
// drizzle.config.ts
// Source: https://orm.drizzle.team/docs/get-started/neon-new

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### Resend Email Sending

```typescript
// lib/email/magic-link-email.tsx
// Source: https://resend.com/docs/send-with-nextjs

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMagicLinkEmail(email: string, token: string) {
  const magicLinkUrl = `${process.env.APP_URL}/auth/verify?token=${token}`

  const { data, error } = await resend.emails.send({
    from: `${process.env.APP_NAME} <${process.env.EMAIL_FROM}>`,
    to: [email],
    subject: `Sign in to ${process.env.APP_NAME}`,
    html: `
      <h2>Sign in to ${process.env.APP_NAME}</h2>
      <p>Click the link below to sign in. This link expires in 10 minutes.</p>
      <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:6px;">
        Sign In
      </a>
      <p style="color:#666;font-size:14px;margin-top:16px;">
        If you didn't request this email, you can safely ignore it.
      </p>
    `,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data
}
```

### Rate Limiting (In-Memory for Single Instance)

```typescript
// lib/auth/rate-limit.ts

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 5

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_REQUESTS - record.count }
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute
```

### Environment Variables

```env
# .env.local

# Application
APP_NAME="IP Lawyer Recruiting"
APP_URL="http://localhost:3000"

# Database (Neon)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"

# Auth
SESSION_SECRET="generate-with-openssl-rand-base64-32"
MAGIC_LINK_EXPIRY_MINUTES=10
MAGIC_LINK_RATE_LIMIT_PER_HOUR=5
SESSION_EXPIRY_DAYS=7

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16.0 (2025) | File renamed; function export named `proxy` not `middleware` |
| `tailwind.config.js` | CSS-first config with `@import "tailwindcss"` | Tailwind v4 (2025) | No JS config file; PostCSS plugin is `@tailwindcss/postcss` |
| `serial()` for auto-increment IDs | `integer().generatedAlwaysAsIdentity()` or `uuid().defaultRandom()` | Drizzle ORM 0.29+ / PostgreSQL best practices | Identity columns preferred over serial |
| Drizzle `relations()` function | `defineRelations()` with `r.one()` / `r.many()` | Drizzle Relations v2 (0.40+) | New API, more explicit, supports `.through()` for junction tables |
| `useFormState` hook | `useActionState` hook | React 19 | Renamed hook for Server Action form state management |
| jsonwebtoken npm package | jose npm package | Ongoing | jose uses Web Crypto API, works in Edge Runtime and Node.js |
| Next.js Edge Runtime only for middleware | Node.js runtime stable for proxy | Next.js 15.5+ | Proxy now defaults to Node.js runtime; no Edge limitation |

**Deprecated/outdated:**
- `middleware.ts` file convention: Deprecated in Next.js 16, renamed to `proxy.ts`
- `tailwind.config.js` / `tailwind.config.ts`: Replaced by CSS-first configuration in Tailwind v4
- `useFormState`: Renamed to `useActionState` in React 19
- `serial()` in Drizzle: Still works but `generatedAlwaysAsIdentity()` is recommended
- Drizzle Relations v1 (`relations()` function): Superseded by `defineRelations()` in v2

## Open Questions

Things that could not be fully resolved:

1. **Drizzle `inet` column type availability**
   - What we know: The spec calls for storing IP addresses in `INET` type columns. Drizzle docs list `inet()` as a type but examples are sparse.
   - What's unclear: Whether `inet()` is fully supported in the latest Drizzle version or if `text()` is more practical.
   - Recommendation: Use `text()` for ip_address columns. IP addresses stored as strings are sufficient for logging purposes and avoid potential driver compatibility issues. This is what the code examples above use.

2. **In-memory rate limiting durability on Vercel**
   - What we know: Vercel serverless functions are ephemeral. In-memory Map-based rate limiting resets when the function cold-starts on a new instance.
   - What's unclear: How often Vercel recycles function instances in practice.
   - Recommendation: Start with database-backed rate limiting (count recent tokens per email in the magic_link_tokens table using a WHERE clause) rather than in-memory. This is durable across function invocations. If performance becomes an issue, add Upstash Redis later.

3. **Exact `create-next-app` prompts in v16.1.x**
   - What we know: `create-next-app@latest` will scaffold a Next.js 16 project with Tailwind v4.
   - What's unclear: Exact prompts and default options may have changed from v15.
   - Recommendation: Run `create-next-app` and accept defaults for App Router, TypeScript, Tailwind, ESLint, src/ directory.

4. **shadcn/ui Tailwind v4 compatibility details**
   - What we know: shadcn/ui supports both Tailwind v3 and v4. The CLI handles configuration.
   - What's unclear: Whether all components work identically with v4 CSS-first config.
   - Recommendation: Run `npx shadcn@latest init` after project creation; it detects and configures for the installed Tailwind version.

## Sources

### Primary (HIGH confidence)
- [Next.js Official Auth Guide](https://nextjs.org/docs/app/guides/authentication) - Defense-in-depth, DAL pattern, session management, proxy usage (doc version 16.1.6, updated 2026-02-16)
- [Next.js proxy.ts File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - Renamed from middleware.ts in v16 (doc version 16.1.6, updated 2026-02-16)
- [Drizzle ORM - PostgreSQL Setup with Neon](https://orm.drizzle.team/docs/get-started/neon-new) - neon-http driver, schema definition, drizzle.config.ts
- [Drizzle ORM - Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration) - pgTable, column types, enums, constraints
- [Drizzle ORM - Column Types](https://orm.drizzle.team/docs/column-types/pg) - uuid, varchar, timestamp, boolean, indexes
- [Drizzle ORM - Indexes and Constraints](https://orm.drizzle.team/docs/indexes-constraints) - Foreign keys, unique, composite primary keys
- [Drizzle ORM - Relations v2](https://orm.drizzle.team/docs/relations-v2) - defineRelations, r.one(), r.many(), .through()
- [Drizzle ORM - Neon Connection](https://orm.drizzle.team/docs/connect-neon) - neon-http vs neon-websockets drivers
- [Resend + Next.js](https://resend.com/docs/send-with-nextjs) - Route handler email sending, React templates
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - CLI init, component installation
- npm registry (verified 2026-02-19): next@16.1.6, drizzle-orm@0.45.1, drizzle-kit@0.31.9, resend@6.9.2, @neondatabase/serverless@1.0.2, jose@6.1.3, zod@4.3.6, tailwindcss@4.2.0, typescript@5.9.3, react@19.2.4

### Secondary (MEDIUM confidence)
- [WorkOS - Next.js App Router Auth Guide 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - CVE-2025-29927 context, defense-in-depth rationale
- [Next.js 16.1 Blog Post](https://nextjs.org/blog/next-16-1) - Latest stable release details
- [Tailwind CSS v4 Announcement](https://tailwindcss.com/blog/tailwindcss-v4) - CSS-first config, PostCSS changes
- [In-memory Rate Limiter in Next.js (freeCodeCamp)](https://www.freecodecamp.org/news/how-to-build-an-in-memory-rate-limiter-in-nextjs/) - Map-based rate limiting pattern
- [Email prefetch breaks magic links (Obie Fernandez)](https://obie.medium.com/prefetching-breaks-magic-link-password-less-login-systems-unless-you-take-precautions-a4c011a3e165) - Two-step verification rationale

### Tertiary (LOW confidence)
- [Rate-limiting Server Actions (Next.js Weekly)](https://nextjsweekly.com/blog/rate-limiting-server-actions) - Server Action rate limiting patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry on 2026-02-19; documentation fetched from official sources
- Architecture: HIGH - Patterns from official Next.js 16.1.6 documentation (updated 2026-02-16); proxy.ts convention verified
- Pitfalls: HIGH - CVE-2025-29927, proxy rename, Tailwind v4 changes all confirmed in official docs
- Database schema: HIGH - Drizzle column types, indexes, constraints all verified from official Drizzle docs
- Rate limiting: MEDIUM - In-memory approach well-documented but Vercel serverless durability uncertain; database-backed alternative recommended

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (30 days -- stack is stable, no major releases expected)
