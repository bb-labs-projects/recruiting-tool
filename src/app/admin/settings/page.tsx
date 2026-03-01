'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Settings, Palette, Shield } from 'lucide-react'

type Theme = 'cromwell' | 'blackgold'

export default function AdminSettingsPage() {
  const [theme, setTheme] = useState<Theme>('cromwell')
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Read current theme from the html data-theme attribute
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'blackgold') {
      setTheme('blackgold')
    } else {
      setTheme('cromwell')
    }
    setLoaded(true)
  }, [])

  function handleThemeChange(newTheme: Theme) {
    if (newTheme === theme) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/settings/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: newTheme }),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || 'Failed to update theme')
          return
        }

        setTheme(newTheme)
        // Apply theme immediately to DOM
        document.documentElement.setAttribute('data-theme', newTheme)
        toast.success(`Theme switched to ${newTheme === 'cromwell' ? 'Cromwell Chase' : 'Black & Gold'}`)
      } catch {
        toast.error('Failed to update theme')
      }
    })
  }

  if (!loaded) return null

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="size-5" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage application appearance and security settings.
        </p>
      </div>

      {/* Theme Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Palette className="size-4" />
          Theme
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Cromwell Chase Theme Card */}
          <button
            onClick={() => handleThemeChange('cromwell')}
            disabled={isPending}
            className={`relative rounded-lg border-2 p-4 text-left transition-all ${
              theme === 'cromwell'
                ? 'border-[#2EBFD4] ring-2 ring-[#2EBFD4]/20'
                : 'border-border hover:border-[#2EBFD4]/40'
            } ${isPending ? 'opacity-60' : ''}`}
          >
            {theme === 'cromwell' && (
              <span className="absolute top-2 right-2 rounded-full bg-[#2EBFD4] px-2 py-0.5 text-[10px] font-medium text-white">
                Active
              </span>
            )}
            <div className="mb-3 flex gap-2">
              <div className="h-8 w-8 rounded" style={{ background: '#2EBFD4' }} />
              <div className="h-8 w-8 rounded" style={{ background: '#F4F4F4' }} />
              <div className="h-8 w-8 rounded border" style={{ background: '#ffffff' }} />
            </div>
            <p className="text-sm font-medium">Cromwell Chase</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Teal accents with light, clean feel
            </p>
          </button>

          {/* Black & Gold Theme Card */}
          <button
            onClick={() => handleThemeChange('blackgold')}
            disabled={isPending}
            className={`relative rounded-lg border-2 p-4 text-left transition-all ${
              theme === 'blackgold'
                ? 'border-[oklch(0.78_0.14_75)] ring-2 ring-[oklch(0.78_0.14_75)]/20'
                : 'border-border hover:border-[oklch(0.78_0.14_75)]/40'
            } ${isPending ? 'opacity-60' : ''}`}
          >
            {theme === 'blackgold' && (
              <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: 'oklch(0.78 0.14 75)' }}>
                Active
              </span>
            )}
            <div className="mb-3 flex gap-2">
              <div className="h-8 w-8 rounded" style={{ background: 'oklch(0.78 0.14 75)' }} />
              <div className="h-8 w-8 rounded" style={{ background: 'oklch(0.12 0.01 260)' }} />
              <div className="h-8 w-8 rounded border" style={{ background: '#ffffff' }} />
            </div>
            <p className="text-sm font-medium">Black & Gold</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gold accents with dark blue-black sidebar
            </p>
          </button>
        </div>
      </section>

      {/* Security Section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Shield className="size-4" />
          Security
        </h2>
        <Link
          href="/admin/users"
          className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-accent transition-colors"
        >
          <Shield className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Multi-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">
              Manage MFA settings for your account
            </p>
          </div>
        </Link>
      </section>
    </div>
  )
}
