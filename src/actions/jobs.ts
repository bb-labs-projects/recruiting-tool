'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { createJob, getJobById, updateJob } from '@/lib/dal/jobs'
import { invalidateMatchesForJob } from '@/lib/dal/job-matches'
import { notifyMatchResults } from '@/lib/matching/notify'

export type ActionState =
  | {
      success?: boolean
      error?: string
      jobId?: string
    }
  | undefined

const CreateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  requiredSpecializations: z.array(z.string()).min(1, 'At least one required specialization'),
  preferredSpecializations: z.array(z.string()).optional().default([]),
  minimumExperience: z.coerce.number().int().min(0).optional(),
  preferredLocation: z.string().max(255).optional(),
  requiredBar: z.array(z.string()).optional().default([]),
  requiredTechnicalDomains: z.array(z.string()).optional().default([]),
})

export async function createJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    const employerProfile = await getEmployerProfile(user.id)
    if (!employerProfile || employerProfile.status !== 'approved') {
      return { error: 'Employer profile must be approved to create jobs' }
    }

    const parsed = CreateJobSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      requiredSpecializations: formData.getAll('requiredSpecializations'),
      preferredSpecializations: formData.getAll('preferredSpecializations'),
      minimumExperience: formData.get('minimumExperience') || undefined,
      preferredLocation: formData.get('preferredLocation') || undefined,
      requiredBar: formData.getAll('requiredBar'),
      requiredTechnicalDomains: formData.getAll('requiredTechnicalDomains'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: Object.values(fieldErrors).flat()[0] ?? 'Invalid input' }
    }

    const jobId = await createJob({
      employerUserId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'draft',
      requiredSpecializations: parsed.data.requiredSpecializations,
      preferredSpecializations: parsed.data.preferredSpecializations,
      minimumExperience: parsed.data.minimumExperience,
      preferredLocation: parsed.data.preferredLocation,
      requiredBar: parsed.data.requiredBar,
      requiredTechnicalDomains: parsed.data.requiredTechnicalDomains,
      createdBy: user.id,
    })

    revalidatePath('/employer/jobs')
    return { success: true, jobId }
  } catch (error) {
    console.error('createJobAction error:', error)
    return { error: 'Failed to create job' }
  }
}

export async function publishJobAction(jobId: string): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    const job = await getJobById(jobId)
    if (!job || job.employerUserId !== user.id) {
      return { error: 'Job not found' }
    }

    if (job.status !== 'draft') {
      return { error: 'Only draft jobs can be published' }
    }

    await updateJob(jobId, { status: 'open' })

    revalidatePath('/employer/jobs')
    revalidatePath(`/employer/jobs/${jobId}`)
    return { success: true }
  } catch (error) {
    console.error('publishJobAction error:', error)
    return { error: 'Failed to publish job' }
  }
}

export async function updateJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    const jobId = formData.get('jobId') as string
    if (!jobId) {
      return { error: 'Job ID is required' }
    }

    const job = await getJobById(jobId)
    if (!job || job.employerUserId !== user.id) {
      return { error: 'Job not found' }
    }

    const parsed = CreateJobSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      requiredSpecializations: formData.getAll('requiredSpecializations'),
      preferredSpecializations: formData.getAll('preferredSpecializations'),
      minimumExperience: formData.get('minimumExperience') || undefined,
      preferredLocation: formData.get('preferredLocation') || undefined,
      requiredBar: formData.getAll('requiredBar'),
      requiredTechnicalDomains: formData.getAll('requiredTechnicalDomains'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: Object.values(fieldErrors).flat()[0] ?? 'Invalid input' }
    }

    await updateJob(jobId, {
      title: parsed.data.title,
      description: parsed.data.description,
      requiredSpecializations: parsed.data.requiredSpecializations,
      preferredSpecializations: parsed.data.preferredSpecializations,
      minimumExperience: parsed.data.minimumExperience,
      preferredLocation: parsed.data.preferredLocation,
      requiredBar: parsed.data.requiredBar,
      requiredTechnicalDomains: parsed.data.requiredTechnicalDomains,
    })

    await invalidateMatchesForJob(jobId)

    revalidatePath('/employer/jobs')
    revalidatePath(`/employer/jobs/${jobId}`)
    return { success: true, jobId }
  } catch (error) {
    console.error('updateJobAction error:', error)
    return { error: 'Failed to update job' }
  }
}

// --- Admin-specific actions ---

export async function createJobForEmployerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const employerUserId = formData.get('employerUserId') as string
    if (!employerUserId) {
      return { error: 'Employer is required' }
    }

    const employerProfile = await getEmployerProfile(employerUserId)
    if (!employerProfile || employerProfile.status !== 'approved') {
      return { error: 'Selected employer must have an approved profile' }
    }

    const parsed = CreateJobSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || undefined,
      requiredSpecializations: formData.getAll('requiredSpecializations'),
      preferredSpecializations: formData.getAll('preferredSpecializations'),
      minimumExperience: formData.get('minimumExperience') || undefined,
      preferredLocation: formData.get('preferredLocation') || undefined,
      requiredBar: formData.getAll('requiredBar'),
      requiredTechnicalDomains: formData.getAll('requiredTechnicalDomains'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: Object.values(fieldErrors).flat()[0] ?? 'Invalid input' }
    }

    const jobId = await createJob({
      employerUserId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'draft',
      requiredSpecializations: parsed.data.requiredSpecializations,
      preferredSpecializations: parsed.data.preferredSpecializations,
      minimumExperience: parsed.data.minimumExperience,
      preferredLocation: parsed.data.preferredLocation,
      requiredBar: parsed.data.requiredBar,
      requiredTechnicalDomains: parsed.data.requiredTechnicalDomains,
      createdBy: user.id,
    })

    revalidatePath('/admin/jobs')
    return { success: true, jobId }
  } catch (error) {
    console.error('createJobForEmployerAction error:', error)
    return { error: 'Failed to create job' }
  }
}

export async function triggerNotificationsAction(
  jobId: string
): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    const job = await getJobById(jobId)
    if (!job) {
      return { error: 'Job not found' }
    }

    await notifyMatchResults(jobId, 0)

    revalidatePath(`/admin/jobs/${jobId}`)
    return { success: true }
  } catch (error) {
    console.error('triggerNotificationsAction error:', error)
    return { error: 'Failed to send notifications' }
  }
}

export async function updateJobStatusAction(
  jobId: string,
  newStatus: 'open' | 'closed' | 'archived'
): Promise<ActionState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'admin') {
      return { error: 'Unauthorized' }
    }

    await updateJob(jobId, { status: newStatus })

    revalidatePath('/admin/jobs')
    revalidatePath(`/admin/jobs/${jobId}`)
    return { success: true }
  } catch (error) {
    console.error('updateJobStatusAction error:', error)
    return { error: 'Failed to update job status' }
  }
}
