import { test, expect } from '@playwright/test'
import { injectSessionCookie } from './helpers/session'

test.describe('Public pages (no auth)', () => {
  test('root / redirects unauthenticated user to /login', async ({ page }) => {
    const response = await page.goto('/')
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })

  test('login page renders with sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Sign In')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toHaveText('Send Login Link')
  })

  test('login form has correct email input attributes', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    await expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
  })

  test('verify page without token shows Invalid Link', async ({ page }) => {
    await page.goto('/auth/verify')
    await expect(page.locator('text=Invalid Link')).toBeVisible()
    await expect(page.locator('text=No token found')).toBeVisible()
    await expect(page.locator('text=Request New Link')).toBeVisible()
  })

  test('verify page with token shows Confirm Sign In button', async ({ page }) => {
    await page.goto('/auth/verify?token=test-token-123')
    await expect(page.locator('text=Confirm Sign In')).toBeVisible()
    await expect(page.locator('text=Confirm Login')).toBeVisible()
  })

  test('verify page confirm with invalid token shows error', async ({ page }) => {
    await page.goto('/auth/verify?token=invalid-token')
    await page.locator('text=Confirm Login').click()

    // Should show Verifying... then error (API will fail without DB)
    await expect(page.locator('text=Sign In Failed')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Request New Link')).toBeVisible()
  })

  test('verify page Request New Link navigates to /login', async ({ page }) => {
    await page.goto('/auth/verify')
    await page.locator('text=Request New Link').click()
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })
})

test.describe('Proxy: unauthenticated route protection', () => {
  test('/candidate redirects unauthenticated to /login', async ({ page }) => {
    await page.goto('/candidate')
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })

  test('/employer redirects unauthenticated to /login', async ({ page }) => {
    await page.goto('/employer')
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })

  test('/admin redirects unauthenticated to /login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('**/login')
    expect(page.url()).toContain('/login')
  })
})

test.describe('Proxy: authenticated user on public routes', () => {
  test('candidate on /login gets redirected to /candidate', async ({ context, page }) => {
    await injectSessionCookie(context, 'candidate')
    await page.goto('/login')
    await page.waitForURL('**/candidate', { timeout: 10000 })
    expect(page.url()).toContain('/candidate')
  })

  test('employer on /login gets redirected to /employer', async ({ context, page }) => {
    await injectSessionCookie(context, 'employer')
    await page.goto('/login')
    await page.waitForURL('**/employer', { timeout: 10000 })
    expect(page.url()).toContain('/employer')
  })

  test('admin on /login gets redirected to /admin', async ({ context, page }) => {
    await injectSessionCookie(context, 'admin')
    await page.goto('/login')
    await page.waitForURL('**/admin', { timeout: 10000 })
    expect(page.url()).toContain('/admin')
  })

  test('candidate on / gets redirected to /candidate', async ({ context, page }) => {
    await injectSessionCookie(context, 'candidate')
    await page.goto('/')
    await page.waitForURL('**/candidate', { timeout: 10000 })
    expect(page.url()).toContain('/candidate')
  })
})

test.describe('Proxy: role-based route isolation', () => {
  test('candidate cannot access /admin - redirected to /candidate', async ({ context, page }) => {
    await injectSessionCookie(context, 'candidate')
    await page.goto('/admin')
    await page.waitForURL('**/candidate', { timeout: 10000 })
    expect(page.url()).toContain('/candidate')
  })

  test('employer cannot access /admin - redirected to /employer', async ({ context, page }) => {
    await injectSessionCookie(context, 'employer')
    await page.goto('/admin')
    await page.waitForURL('**/employer', { timeout: 10000 })
    expect(page.url()).toContain('/employer')
  })

  test('candidate cannot access /employer - redirected to /candidate', async ({ context, page }) => {
    await injectSessionCookie(context, 'candidate')
    await page.goto('/employer')
    await page.waitForURL('**/candidate', { timeout: 10000 })
    expect(page.url()).toContain('/candidate')
  })

  test('employer cannot access /candidate - redirected to /employer', async ({ context, page }) => {
    await injectSessionCookie(context, 'employer')
    await page.goto('/candidate')
    await page.waitForURL('**/employer', { timeout: 10000 })
    expect(page.url()).toContain('/employer')
  })

  test('admin CAN access /admin', async ({ context, page }) => {
    await injectSessionCookie(context, 'admin')
    await page.goto('/admin')
    // Admin should stay on /admin (not be redirected)
    // Page may error due to no DB, but URL should remain /admin
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/admin')
  })
})
