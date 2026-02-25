'use client'

import { useState } from 'react'
import { createJobAction, updateJobAction } from '@/actions/jobs'
import { JobForm, type JobFormData } from '@/components/jobs/job-form'
import { JobAdUpload } from '@/components/jobs/job-ad-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, PenLine } from 'lucide-react'

type Mode = 'choose' | 'upload' | 'manual' | 'review'

export function NewJobContent() {
  const [mode, setMode] = useState<Mode>('choose')
  const [parsedData, setParsedData] = useState<JobFormData | null>(null)

  function handleParsed(data: JobFormData) {
    setParsedData(data)
    setMode('review')
  }

  if (mode === 'choose') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => setMode('upload')}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Upload Job Ad</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a PDF or DOCX and we will extract the job details automatically
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              Upload File
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => setMode('manual')}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
            <PenLine className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Fill Manually</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter job details and requirements directly into the form
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              Start Typing
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === 'upload') {
    return (
      <div className="space-y-4">
        <JobAdUpload onParsed={handleParsed} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('choose')}
        >
          Back to options
        </Button>
      </div>
    )
  }

  if (mode === 'review' && parsedData) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300">
          Job details have been extracted from your uploaded document. Review and edit the fields below, then submit to create the job listing.
        </div>
        <JobForm
          mode="edit"
          initialData={parsedData}
          action={updateJobAction}
          redirectTo="/employer/jobs"
        />
      </div>
    )
  }

  // manual mode
  return (
    <div className="space-y-4">
      <JobForm mode="create" action={createJobAction} />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMode('choose')}
      >
        Back to options
      </Button>
    </div>
  )
}
