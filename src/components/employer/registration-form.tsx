'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  registerEmployer,
  type RegisterEmployerState,
} from '@/actions/employers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

/**
 * Client component form for employer registration.
 *
 * Uses React 19 useActionState to wire the form to the registerEmployer
 * server action. On success, redirects to the pending approval page.
 * Shows validation errors inline.
 */
export function RegistrationForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<
    RegisterEmployerState,
    FormData
  >(registerEmployer, undefined)

  useEffect(() => {
    if (state?.success) {
      router.push('/employer/pending')
    }
  }, [state?.success, router])

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme IP Law"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyWebsite">
              Company Website{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="companyWebsite"
              name="companyWebsite"
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactTitle">
              Contact Title{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="contactTitle"
              name="contactTitle"
              type="text"
              placeholder="Hiring Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
