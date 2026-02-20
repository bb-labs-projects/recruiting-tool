'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { publishJobAction } from '@/actions/jobs'

export function PublishButton({ jobId }: { jobId: string }) {
  const [pending, setPending] = useState(false)

  async function handlePublish() {
    setPending(true)
    try {
      await publishJobAction(jobId)
    } finally {
      setPending(false)
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={handlePublish}>
      {pending ? 'Publishing...' : 'Publish'}
    </Button>
  )
}
