'use client'

import { useState } from 'react'
import { createJobForEmployerAction } from '@/actions/jobs'
import { JobForm } from '@/components/jobs/job-form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ActionState } from '@/actions/jobs'

type Employer = {
  userId: string
  companyName: string
  userEmail: string
}

export function AdminJobCreateForm({
  employers,
}: {
  employers: Employer[]
}) {
  const [selectedEmployerUserId, setSelectedEmployerUserId] = useState('')

  async function wrappedAction(
    prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> {
    if (!selectedEmployerUserId) {
      return { error: 'Please select an employer' }
    }
    formData.set('employerUserId', selectedEmployerUserId)
    return createJobForEmployerAction(prevState, formData)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Employer</Label>
        <Select
          value={selectedEmployerUserId}
          onValueChange={setSelectedEmployerUserId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an employer..." />
          </SelectTrigger>
          <SelectContent>
            {employers.map((emp) => (
              <SelectItem key={emp.userId} value={emp.userId}>
                {emp.companyName} ({emp.userEmail})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <JobForm mode="create" action={wrappedAction} redirectTo="/admin/jobs" />

    </div>
  )
}
