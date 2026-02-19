'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/**
 * Logout button component.
 *
 * POSTs to /api/auth/logout to destroy the session, then redirects
 * to the login page. Shows loading state while the request is in flight.
 */
export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      // If logout fails, still try to redirect -- the session may
      // already be invalid and the proxy will redirect to /login anyway
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
