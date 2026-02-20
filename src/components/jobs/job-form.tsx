'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionState } from '@/actions/jobs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const SPECIALIZATIONS = [
  'Patent Prosecution',
  'Patent Litigation',
  'Trademark',
  'Copyright',
  'Trade Secrets',
  'IP Litigation',
  'Licensing/Technology Transfer',
]

const BAR_ADMISSIONS = [
  'USPTO',
  'California',
  'New York',
  'Texas',
  'Illinois',
  'DC',
  'Other',
]

const TECHNICAL_DOMAINS = [
  'Electrical Engineering',
  'Mechanical Engineering',
  'Computer Science',
  'Chemistry',
  'Biology/Biotech',
  'Pharmaceutical',
  'Materials Science',
]

export type JobFormData = {
  id: string
  title: string
  description: string | null
  requiredSpecializations: string[]
  preferredSpecializations: string[]
  minimumExperience: number | null
  preferredLocation: string | null
  requiredBar: string[]
  requiredTechnicalDomains: string[]
}

type JobFormProps = {
  mode: 'create' | 'edit'
  initialData?: JobFormData
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  redirectTo?: string
}

export function JobForm({ mode, initialData, action, redirectTo }: JobFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, undefined)

  const [requiredSpecs, setRequiredSpecs] = useState<string[]>(
    initialData?.requiredSpecializations ?? []
  )
  const [preferredSpecs, setPreferredSpecs] = useState<string[]>(
    initialData?.preferredSpecializations ?? []
  )
  const [requiredBar, setRequiredBar] = useState<string[]>(
    initialData?.requiredBar ?? []
  )
  const [requiredTechDomains, setRequiredTechDomains] = useState<string[]>(
    initialData?.requiredTechnicalDomains ?? []
  )

  const basePath = redirectTo ?? '/employer/jobs'

  useEffect(() => {
    if (state?.success && state.jobId) {
      router.push(`${basePath}/${state.jobId}`)
    } else if (state?.success && mode === 'edit' && initialData?.id) {
      router.push(`${basePath}/${initialData.id}`)
    }
  }, [state, router, mode, initialData?.id, basePath])

  function toggleValue(
    current: string[],
    value: string,
    setter: (vals: string[]) => void
  ) {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value))
    } else {
      setter([...current, value])
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-6">
          {mode === 'edit' && initialData && (
            <input type="hidden" name="jobId" value={initialData.id} />
          )}

          {state?.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={255}
              defaultValue={initialData?.title ?? ''}
              placeholder="e.g. Senior Patent Attorney"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={initialData?.description ?? ''}
              placeholder="Describe the role, responsibilities, and ideal candidate..."
            />
          </div>

          {/* Required Specializations */}
          <div className="space-y-2">
            <Label>Required Specializations</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPECIALIZATIONS.map((spec) => (
                <label
                  key={spec}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={requiredSpecs.includes(spec)}
                    onCheckedChange={() =>
                      toggleValue(requiredSpecs, spec, setRequiredSpecs)
                    }
                  />
                  {spec}
                </label>
              ))}
            </div>
            {requiredSpecs.map((spec) => (
              <input
                key={spec}
                type="hidden"
                name="requiredSpecializations"
                value={spec}
              />
            ))}
          </div>

          {/* Preferred Specializations */}
          <div className="space-y-2">
            <Label>Preferred Specializations (optional)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPECIALIZATIONS.map((spec) => (
                <label
                  key={spec}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={preferredSpecs.includes(spec)}
                    onCheckedChange={() =>
                      toggleValue(preferredSpecs, spec, setPreferredSpecs)
                    }
                  />
                  {spec}
                </label>
              ))}
            </div>
            {preferredSpecs.map((spec) => (
              <input
                key={spec}
                type="hidden"
                name="preferredSpecializations"
                value={spec}
              />
            ))}
          </div>

          {/* Minimum Experience */}
          <div className="space-y-2">
            <Label htmlFor="minimumExperience">
              Minimum Experience (years, optional)
            </Label>
            <Input
              id="minimumExperience"
              name="minimumExperience"
              type="number"
              min="0"
              className="w-32"
              defaultValue={initialData?.minimumExperience ?? ''}
              placeholder="0"
            />
          </div>

          {/* Preferred Location */}
          <div className="space-y-2">
            <Label htmlFor="preferredLocation">
              Preferred Location (optional)
            </Label>
            <Input
              id="preferredLocation"
              name="preferredLocation"
              maxLength={255}
              defaultValue={initialData?.preferredLocation ?? ''}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          {/* Required Bar Admissions */}
          <div className="space-y-2">
            <Label>Required Bar Admissions (optional)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BAR_ADMISSIONS.map((bar) => (
                <label
                  key={bar}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={requiredBar.includes(bar)}
                    onCheckedChange={() =>
                      toggleValue(requiredBar, bar, setRequiredBar)
                    }
                  />
                  {bar}
                </label>
              ))}
            </div>
            {requiredBar.map((bar) => (
              <input
                key={bar}
                type="hidden"
                name="requiredBar"
                value={bar}
              />
            ))}
          </div>

          {/* Required Technical Domains */}
          <div className="space-y-2">
            <Label>Required Technical Domains (optional)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TECHNICAL_DOMAINS.map((domain) => (
                <label
                  key={domain}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={requiredTechDomains.includes(domain)}
                    onCheckedChange={() =>
                      toggleValue(
                        requiredTechDomains,
                        domain,
                        setRequiredTechDomains
                      )
                    }
                  />
                  {domain}
                </label>
              ))}
            </div>
            {requiredTechDomains.map((domain) => (
              <input
                key={domain}
                type="hidden"
                name="requiredTechnicalDomains"
                value={domain}
              />
            ))}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={pending}>
            {pending
              ? mode === 'edit'
                ? 'Updating...'
                : 'Creating...'
              : mode === 'edit'
                ? 'Update Job'
                : 'Create Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
