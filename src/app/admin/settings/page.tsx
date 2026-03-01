'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Settings, Palette, Shield, Check } from 'lucide-react'

type Theme = 'cromwell' | 'blackgold'

const themes: {
  id: Theme
  name: string
  description: string
  brand: string
  sidebar: string
  sidebarAccent: string
  accent: string
  bg: string
}[] = [
  {
    id: 'cromwell',
    name: 'Cromwell Chase',
    description: 'Teal brand accents, dark teal sidebar, clean and modern',
    brand: '#2EBFD4',
    sidebar: '#1a2a33',
    sidebarAccent: '#243840',
    accent: '#2EBFD4',
    bg: '#fafafa',
  },
  {
    id: 'blackgold',
    name: 'Black & Gold',
    description: 'Gold accents, dark blue-black sidebar, warm and premium',
    brand: '#d4a745',
    sidebar: '#141428',
    sidebarAccent: '#1c1c38',
    accent: '#d4a745',
    bg: '#fafafa',
  },
]

function ThemePreview({
  theme,
  isActive,
}: {
  theme: (typeof themes)[number]
  isActive: boolean
}) {
  return (
    <div
      className="relative overflow-hidden rounded-md border"
      style={{ borderColor: isActive ? theme.brand : 'var(--border)' }}
    >
      {/* Mini mockup of the admin layout */}
      <div className="flex h-32">
        {/* Mini sidebar */}
        <div
          className="flex w-14 shrink-0 flex-col p-2"
          style={{ background: theme.sidebar }}
        >
          {/* Logo area */}
          <div
            className="mb-2 h-2 w-8 rounded-sm"
            style={{ background: theme.brand, opacity: 0.8 }}
          />
          {/* Nav items */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div
              className="h-1.5 w-full rounded-sm"
              style={{ background: theme.sidebarAccent }}
            />
            <div
              className="h-1.5 w-9 rounded-sm"
              style={{ background: theme.brand, opacity: 0.6 }}
            />
            <div
              className="h-1.5 w-full rounded-sm"
              style={{ background: theme.sidebarAccent }}
            />
            <div
              className="h-1.5 w-8 rounded-sm"
              style={{ background: theme.sidebarAccent }}
            />
          </div>
        </div>

        {/* Mini content area */}
        <div
          className="flex flex-1 flex-col p-2.5"
          style={{ background: theme.bg }}
        >
          {/* Header bar */}
          <div className="mb-2 flex items-center gap-1.5">
            <div className="h-1.5 w-12 rounded-sm bg-gray-300" />
            <div className="flex-1" />
            <div className="h-3 w-3 rounded-full bg-gray-200" />
          </div>
          {/* Content blocks */}
          <div className="flex gap-2 mb-2">
            <div className="h-8 flex-1 rounded bg-white border border-gray-100" />
            <div className="h-8 flex-1 rounded bg-white border border-gray-100" />
          </div>
          {/* Button accent */}
          <div className="flex gap-2">
            <div
              className="h-4 w-14 rounded-sm"
              style={{ background: theme.brand }}
            />
            <div className="h-4 w-10 rounded-sm bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>('cromwell')
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'blackgold') {
      setTheme('blackgold')
    } else {
      setTheme('cromwell')
    }
    setLoaded(true)
  }, [])

  function handleThemeChange(newTheme: Theme) {
    if (newTheme === theme || isPending) return

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
        document.documentElement.setAttribute('data-theme', newTheme)
        // Refresh server components so layouts re-render (logo swap, etc.)
        router.refresh()
        toast.success(
          `Switched to ${newTheme === 'cromwell' ? 'Cromwell Chase' : 'Black & Gold'}`
        )
      } catch {
        toast.error('Failed to update theme')
      }
    })
  }

  if (!loaded) {
    return (
      <div className="max-w-2xl animate-pulse">
        <div className="h-6 w-32 rounded bg-muted mb-2" />
        <div className="h-4 w-64 rounded bg-muted mb-8" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 rounded-lg bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="size-5" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage application appearance and security.
        </p>
      </div>

      {/* Theme Section */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Palette className="size-4" />
          Theme
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {themes.map((t) => {
            const isActive = theme === t.id

            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                disabled={isPending}
                className={`group relative rounded-lg border-2 p-3 text-left transition-all ${
                  isActive
                    ? 'border-brand ring-2 ring-brand/20'
                    : 'border-border hover:border-brand/40'
                } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                    <Check className="size-3 text-brand-foreground" />
                  </span>
                )}

                {/* Mini preview */}
                <ThemePreview theme={t} isActive={isActive} />

                {/* Color swatches */}
                <div className="mt-3 flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: t.brand }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: t.sidebar }}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: t.bg }}
                  />
                </div>

                {/* Label */}
                <p className="mt-2 text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {t.description}
                </p>
              </button>
            )
          })}
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
