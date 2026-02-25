'use client'

import { useState, useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'
import {
  updateVerificationNotes,
  type VerificationNotesState,
} from '@/actions/employer-verification'

interface VerificationSectionProps {
  employerProfileId: string
  tradeLicenceStoragePath?: string | null
  tradeLicenceFilename?: string | null
  verificationNotes?: string | null
}

export function VerificationSection({
  employerProfileId,
  tradeLicenceStoragePath,
  tradeLicenceFilename,
  verificationNotes,
}: VerificationSectionProps) {
  const [downloading, setDownloading] = useState(false)
  const [state, formAction, pending] = useActionState<
    VerificationNotesState,
    FormData
  >(updateVerificationNotes, undefined)

  async function handleDownload() {
    if (!tradeLicenceStoragePath) return

    setDownloading(true)
    try {
      const res = await fetch(
        `/api/employer/trade-licence/signed-url?path=${encodeURIComponent(tradeLicenceStoragePath)}`,
      )
      const data = await res.json()
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch {
      // silent fail
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {tradeLicenceStoragePath && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="size-4 mr-1" />
          {downloading ? 'Loading...' : `Download ${tradeLicenceFilename ?? 'Trade Licence'}`}
        </Button>
      )}

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="employerProfileId" value={employerProfileId} />
        <Label htmlFor="verificationNotes">Verification Notes</Label>
        <Textarea
          id="verificationNotes"
          name="verificationNotes"
          defaultValue={verificationNotes ?? ''}
          placeholder="Add notes about this employer's verification status..."
          rows={3}
        />
        {state && 'error' in state && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && 'success' in state && state.success && (
          <p className="text-sm text-teal-600">Notes saved.</p>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving...' : 'Save Notes'}
        </Button>
      </form>
    </div>
  )
}
