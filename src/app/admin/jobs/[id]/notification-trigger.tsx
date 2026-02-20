'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { triggerNotificationsAction } from '@/actions/jobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  jobId: string
  unnotifiedCount: number
}

export function NotificationTrigger({ jobId, unnotifiedCount }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (unnotifiedCount === 0 && !successMsg) return null

  async function handleSend() {
    setSending(true)
    setError(null)
    setSuccessMsg(null)

    const result = await triggerNotificationsAction(jobId)

    setSending(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccessMsg('Notifications sent successfully.')
      router.refresh()
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          {successMsg ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMsg}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {unnotifiedCount} match{unnotifiedCount !== 1 ? 'es' : ''} pending
              notification
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        {unnotifiedCount > 0 && !successMsg && (
          <Button onClick={handleSend} disabled={sending} size="sm">
            {sending ? 'Sending...' : `Send Notifications (${unnotifiedCount} pending)`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
