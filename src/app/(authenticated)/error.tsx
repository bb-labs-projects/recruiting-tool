'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Authenticated route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-red-500" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            An error occurred while loading this page.
            {error.digest && (
              <span className="block mt-1 font-mono text-xs">
                Error code: {error.digest}
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
