import { relations } from 'drizzle-orm'
import {
  users,
  profiles,
  cvUploads,
  education,
  workHistory,
  barAdmissions,
  profileSpecializations,
  profileTechnicalDomains,
  specializations,
  technicalDomains,
  employerProfiles,
  savedProfiles,
} from './schema'

export const profilesRelations = relations(profiles, ({ many }) => ({
  education: many(education),
  workHistory: many(workHistory),
  barAdmissions: many(barAdmissions),
  profileSpecializations: many(profileSpecializations),
  profileTechnicalDomains: many(profileTechnicalDomains),
  cvUploads: many(cvUploads),
  savedProfiles: many(savedProfiles),
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
  employerProfile: one(employerProfiles, {
    fields: [users.id],
    references: [employerProfiles.userId],
  }),
  savedProfiles: many(savedProfiles),
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
