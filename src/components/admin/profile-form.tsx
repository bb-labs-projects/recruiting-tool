'use client'

import { InlineEditField } from './inline-edit-field'
import { ConfidenceBadge } from './confidence-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  updateProfileField,
  updateEducation,
  updateWorkHistory,
  updateBarAdmission,
} from '@/actions/profiles'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  year: string | null
  confidence: 'high' | 'medium' | 'low'
}

interface WorkHistoryEntry {
  id: string
  employer: string
  title: string
  startDate: string | null
  endDate: string | null
  description: string | null
  confidence: 'high' | 'medium' | 'low'
}

interface BarAdmissionEntry {
  id: string
  jurisdiction: string
  year: string | null
  status: string | null
  confidence: 'high' | 'medium' | 'low'
}

interface SpecializationEntry {
  name: string
  confidence: 'high' | 'medium' | 'low'
}

interface TechnicalDomainEntry {
  name: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ProfileFormData {
  id: string
  name: string
  nameConfidence: 'high' | 'medium' | 'low'
  email: string | null
  emailConfidence: 'high' | 'medium' | 'low'
  phone: string | null
  phoneConfidence: 'high' | 'medium' | 'low'
  education: EducationEntry[]
  workHistory: WorkHistoryEntry[]
  barAdmissions: BarAdmissionEntry[]
  specializations: SpecializationEntry[]
  technicalDomains: TechnicalDomainEntry[]
}

// ---------------------------------------------------------------------------
// Action wrappers
// ---------------------------------------------------------------------------

function createProfileFieldAction(profileId: string, fieldName: string) {
  return async (formData: FormData) => {
    const fd = new FormData()
    fd.set('profileId', profileId)
    fd.set('fieldName', fieldName)
    fd.set('value', formData.get('value') as string)
    return updateProfileField(fd)
  }
}

function createEducationAction(
  educationId: string,
  profileId: string,
  currentValues: {
    institution: string
    degree: string
    field: string
    year: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('educationId', educationId)
    fd.set('profileId', profileId)
    fd.set('institution', editedField === 'institution' ? newValue : currentValues.institution)
    fd.set('degree', editedField === 'degree' ? newValue : currentValues.degree)
    fd.set('field', editedField === 'field' ? newValue : currentValues.field)
    fd.set('year', editedField === 'year' ? newValue : (currentValues.year ?? ''))
    return updateEducation(fd)
  }
}

function createWorkHistoryAction(
  workHistoryId: string,
  profileId: string,
  currentValues: {
    employer: string
    title: string
    startDate: string | null
    endDate: string | null
    description: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('workHistoryId', workHistoryId)
    fd.set('profileId', profileId)
    fd.set('employer', editedField === 'employer' ? newValue : currentValues.employer)
    fd.set('title', editedField === 'title' ? newValue : currentValues.title)
    fd.set('startDate', editedField === 'startDate' ? newValue : (currentValues.startDate ?? ''))
    fd.set('endDate', editedField === 'endDate' ? newValue : (currentValues.endDate ?? ''))
    fd.set('description', editedField === 'description' ? newValue : (currentValues.description ?? ''))
    return updateWorkHistory(fd)
  }
}

function createBarAdmissionAction(
  barAdmissionId: string,
  profileId: string,
  currentValues: {
    jurisdiction: string
    year: string | null
    status: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('barAdmissionId', barAdmissionId)
    fd.set('profileId', profileId)
    fd.set('jurisdiction', editedField === 'jurisdiction' ? newValue : currentValues.jurisdiction)
    fd.set('year', editedField === 'year' ? newValue : (currentValues.year ?? ''))
    fd.set('status', editedField === 'status' ? newValue : (currentValues.status ?? ''))
    return updateBarAdmission(fd)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const sortedWorkHistory = [...profile.workHistory].sort((a, b) => {
    // Most recent first: descending by startDate
    const aDate = a.startDate ?? ''
    const bDate = b.startDate ?? ''
    return bDate.localeCompare(aDate)
  })

  return (
    <div className="space-y-6">
      {/* Section 1: Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InlineEditField
            profileId={profile.id}
            fieldName="name"
            value={profile.name}
            confidence={profile.nameConfidence}
            action={createProfileFieldAction(profile.id, 'name')}
            label="Name"
          />
          <InlineEditField
            profileId={profile.id}
            fieldName="email"
            value={profile.email ?? ''}
            confidence={profile.emailConfidence}
            action={createProfileFieldAction(profile.id, 'email')}
            label="Email"
          />
          <InlineEditField
            profileId={profile.id}
            fieldName="phone"
            value={profile.phone ?? ''}
            confidence={profile.phoneConfidence}
            action={createProfileFieldAction(profile.id, 'phone')}
            label="Phone"
          />
        </CardContent>
      </Card>

      {/* Section 2: Specializations (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Specializations</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.specializations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No specializations recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.specializations.map((spec) => (
                <div key={spec.name} className="flex items-center gap-1">
                  <Badge variant="secondary">{spec.name}</Badge>
                  <ConfidenceBadge level={spec.confidence} className="text-[10px] px-1.5 py-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Education */}
      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.education.length === 0 ? (
            <p className="text-muted-foreground text-sm">No education entries recorded.</p>
          ) : (
            profile.education.map((edu, index) => (
              <div key={edu.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry {index + 1}
                  </span>
                  <ConfidenceBadge level={edu.confidence} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="institution"
                    value={edu.institution}
                    confidence={edu.confidence}
                    action={createEducationAction(edu.id, profile.id, edu, 'institution')}
                    label="Institution"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="degree"
                    value={edu.degree}
                    confidence={edu.confidence}
                    action={createEducationAction(edu.id, profile.id, edu, 'degree')}
                    label="Degree"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="field"
                    value={edu.field}
                    confidence={edu.confidence}
                    action={createEducationAction(edu.id, profile.id, edu, 'field')}
                    label="Field of Study"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="year"
                    value={edu.year ?? ''}
                    confidence={edu.confidence}
                    action={createEducationAction(edu.id, profile.id, edu, 'year')}
                    label="Year"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 4: Work History */}
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedWorkHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No work history recorded.</p>
          ) : (
            sortedWorkHistory.map((work, index) => (
              <div key={work.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry {index + 1}
                  </span>
                  <ConfidenceBadge level={work.confidence} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="employer"
                    value={work.employer}
                    confidence={work.confidence}
                    action={createWorkHistoryAction(work.id, profile.id, work, 'employer')}
                    label="Employer"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="title"
                    value={work.title}
                    confidence={work.confidence}
                    action={createWorkHistoryAction(work.id, profile.id, work, 'title')}
                    label="Title"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="startDate"
                    value={work.startDate ?? ''}
                    confidence={work.confidence}
                    action={createWorkHistoryAction(work.id, profile.id, work, 'startDate')}
                    label="Start Date"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="endDate"
                    value={work.endDate ?? ''}
                    confidence={work.confidence}
                    action={createWorkHistoryAction(work.id, profile.id, work, 'endDate')}
                    label="End Date"
                  />
                  <div className="sm:col-span-2">
                    <InlineEditField
                      profileId={profile.id}
                      fieldName="description"
                      value={work.description ?? ''}
                      confidence={work.confidence}
                      action={createWorkHistoryAction(work.id, profile.id, work, 'description')}
                      label="Description"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 5: Technical Domains (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Domains</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.technicalDomains.length === 0 ? (
            <p className="text-muted-foreground text-sm">No technical domains recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.technicalDomains.map((domain) => (
                <div key={domain.name} className="flex items-center gap-1">
                  <Badge variant="secondary">{domain.name}</Badge>
                  <ConfidenceBadge level={domain.confidence} className="text-[10px] px-1.5 py-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Bar Admissions */}
      <Card>
        <CardHeader>
          <CardTitle>Bar Admissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.barAdmissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bar admissions recorded.</p>
          ) : (
            profile.barAdmissions.map((bar, index) => (
              <div key={bar.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Entry {index + 1}
                  </span>
                  <ConfidenceBadge level={bar.confidence} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="jurisdiction"
                    value={bar.jurisdiction}
                    confidence={bar.confidence}
                    action={createBarAdmissionAction(bar.id, profile.id, bar, 'jurisdiction')}
                    label="Jurisdiction"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="year"
                    value={bar.year ?? ''}
                    confidence={bar.confidence}
                    action={createBarAdmissionAction(bar.id, profile.id, bar, 'year')}
                    label="Year"
                  />
                  <InlineEditField
                    profileId={profile.id}
                    fieldName="status"
                    value={bar.status ?? ''}
                    confidence={bar.confidence}
                    action={createBarAdmissionAction(bar.id, profile.id, bar, 'status')}
                    label="Status"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
