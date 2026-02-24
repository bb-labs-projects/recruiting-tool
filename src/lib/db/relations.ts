import { relations } from 'drizzle-orm'
import {
  users,
  profiles,
  cvUploads,
  education,
  workHistory,
  barAdmissions,
  languages,
  profileSpecializations,
  profileTechnicalDomains,
  specializations,
  technicalDomains,
  employerProfiles,
  savedProfiles,
  profileUnlocks,
  profileViews,
  stripeEvents,
  jobs,
  jobMatches,
} from './schema'

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  education: many(education),
  workHistory: many(workHistory),
  barAdmissions: many(barAdmissions),
  profileSpecializations: many(profileSpecializations),
  profileTechnicalDomains: many(profileTechnicalDomains),
  languages: many(languages),
  cvUploads: many(cvUploads),
  savedProfiles: many(savedProfiles),
  profileUnlocks: many(profileUnlocks),
  profileViews: many(profileViews),
  jobMatches: many(jobMatches),
}))

export const educationRelations = relations(education, ({ one }) => ({
  profile: one(profiles, {
    fields: [education.profileId],
    references: [profiles.id],
  }),
}))

export const workHistoryRelations = relations(workHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [workHistory.profileId],
    references: [profiles.id],
  }),
}))

export const languagesRelations = relations(languages, ({ one }) => ({
  profile: one(profiles, {
    fields: [languages.profileId],
    references: [profiles.id],
  }),
}))

export const barAdmissionsRelations = relations(barAdmissions, ({ one }) => ({
  profile: one(profiles, {
    fields: [barAdmissions.profileId],
    references: [profiles.id],
  }),
}))

export const profileSpecializationsRelations = relations(
  profileSpecializations,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileSpecializations.profileId],
      references: [profiles.id],
    }),
    specialization: one(specializations, {
      fields: [profileSpecializations.specializationId],
      references: [specializations.id],
    }),
  })
)

export const profileTechnicalDomainsRelations = relations(
  profileTechnicalDomains,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [profileTechnicalDomains.profileId],
      references: [profiles.id],
    }),
    technicalDomain: one(technicalDomains, {
      fields: [profileTechnicalDomains.technicalDomainId],
      references: [technicalDomains.id],
    }),
  })
)

export const cvUploadsRelations = relations(cvUploads, ({ one }) => ({
  profile: one(profiles, {
    fields: [cvUploads.profileId],
    references: [profiles.id],
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  candidateProfile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  employerProfile: one(employerProfiles, {
    fields: [users.id],
    references: [employerProfiles.userId],
  }),
  savedProfiles: many(savedProfiles),
  profileUnlocks: many(profileUnlocks),
  profileViews: many(profileViews),
  jobs: many(jobs, { relationName: 'jobEmployer' }),
}))

export const employerProfilesRelations = relations(
  employerProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [employerProfiles.userId],
      references: [users.id],
      relationName: 'employerUser',
    }),
    reviewer: one(users, {
      fields: [employerProfiles.reviewedBy],
      references: [users.id],
      relationName: 'employerReviewer',
    }),
  })
)

export const savedProfilesRelations = relations(savedProfiles, ({ one }) => ({
  user: one(users, {
    fields: [savedProfiles.employerUserId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [savedProfiles.profileId],
    references: [profiles.id],
  }),
}))

export const profileUnlocksRelations = relations(profileUnlocks, ({ one }) => ({
  user: one(users, {
    fields: [profileUnlocks.employerUserId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [profileUnlocks.profileId],
    references: [profiles.id],
  }),
}))

export const profileViewsRelations = relations(profileViews, ({ one }) => ({
  user: one(users, {
    fields: [profileViews.employerUserId],
    references: [users.id],
  }),
  profile: one(profiles, {
    fields: [profileViews.profileId],
    references: [profiles.id],
  }),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  employer: one(users, {
    fields: [jobs.employerUserId],
    references: [users.id],
    relationName: 'jobEmployer',
  }),
  creator: one(users, {
    fields: [jobs.createdBy],
    references: [users.id],
    relationName: 'jobCreator',
  }),
  matches: many(jobMatches),
}))

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  job: one(jobs, {
    fields: [jobMatches.jobId],
    references: [jobs.id],
  }),
  profile: one(profiles, {
    fields: [jobMatches.profileId],
    references: [profiles.id],
  }),
}))
