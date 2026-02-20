import { relations } from 'drizzle-orm'
import {
  profiles,
  cvUploads,
  education,
  workHistory,
  barAdmissions,
  profileSpecializations,
  profileTechnicalDomains,
  specializations,
  technicalDomains,
} from './schema'

export const profilesRelations = relations(profiles, ({ many }) => ({
  education: many(education),
  workHistory: many(workHistory),
  barAdmissions: many(barAdmissions),
  profileSpecializations: many(profileSpecializations),
  profileTechnicalDomains: many(profileTechnicalDomains),
  cvUploads: many(cvUploads),
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
