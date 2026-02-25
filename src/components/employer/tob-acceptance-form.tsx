'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptTerms, type AcceptTermsState } from '@/actions/terms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export function TobAcceptanceForm() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [state, action, pending] = useActionState<AcceptTermsState, FormData>(
    acceptTerms,
    undefined
  )

  useEffect(() => {
    if (state?.success) {
      router.push('/employer/browse')
    }
  }, [state?.success, router])

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="accepted" value={checked ? 'true' : 'false'} />

          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-tob"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor="accept-tob" className="text-sm leading-relaxed">
              I have read and agree to the Terms of Business
            </Label>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={pending || !checked}
          >
            {pending ? 'Submitting...' : 'Accept Terms of Business'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
