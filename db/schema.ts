import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const pgpmembers = pgTable("pgpmembers", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: text("member_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleInitial: text("middle_initial"),
  age: integer("age").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  street: text("street").notNull(),
  barangay: text("barangay").notNull(),
  municipality: text("municipality").notNull(),
  province: text("province").notNull(),
  email: text("email").notNull(),
  contactNumber: text("contact_number").notNull(),
  guardianName: text("guardian_name").notNull(),
  guardianAddress: text("guardian_address").notNull(),
  guardianContact: text("guardian_contact").notNull(),
  baptizedName: text("baptized_name").notNull(),
  dateSurvived: text("date_survived").notNull(),
  status: text("status").notNull(), // Member, Neophyte, Alumni, officer, or former role
  memberChapter: text("member_chapter"),
  officerPosition: text("officer_position"),
  officerDateElected: text("officer_date_elected"),
  formerPresidentChapter: text("former_president_chapter"),
  formerPresidentStart: text("former_president_start"),
  formerPresidentEnd: text("former_president_end"),
  formerMasterInitiatorStart: text("former_master_initiator_start"),
  formerMasterInitiatorEnd: text("former_master_initiator_end"),
  formerLadyInitiatorStart: text("former_lady_initiator_start"),
  formerLadyInitiatorEnd: text("former_lady_initiator_end"),
  formerVicePresidentChapter: text("former_vice_president_chapter"),
  formerVicePresidentRole: text("former_vice_president_role"),
  formerVicePresidentStart: text("former_vice_president_start"),
  formerVicePresidentEnd: text("former_vice_president_end"),
  formerMasterInitiatorRole: text("former_master_initiator_role"),
  formerMasterInitiatorChapter: text("former_master_initiator_chapter"),
  formerLadyInitiatorRole: text("former_lady_initiator_role"),
  formerLadyInitiatorChapter: text("former_lady_initiator_chapter"),
  grandKnight: text("grand_knight"),
  grandKnightChapter: text("grand_knight_chapter"),
  grandKnightStart: text("grand_knight_start"),
  grandKnightEnd: text("grand_knight_end"),
  chapterOrganizerChapter: text("chapter_organizer_chapter"),
  photoUrl: text("photo_url"),
  hasPhoto: boolean("has_photo").default(false).notNull(),
  neophyteStatus: text("neophyte_status"),
  neophyteStatusUpdatedAt: timestamp("neophyte_status_updated_at", { withTimezone: true }),
  neophyteStatusUpdatedBy: text("neophyte_status_updated_by"),
  neophyteCertificationIssuedAt: timestamp("neophyte_certification_issued_at", { withTimezone: true }),
  neophyteCertificationIssuedBy: text("neophyte_certification_issued_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // "superadmin" or "admin"
  isActive: boolean("is_active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterName: text("chapter_name").notNull().unique(),
  chapterAddress: text("chapter_address").notNull(),
  chapterOrganizer: text("chapter_organizer").notNull(),
  logoUrl: text("logo_url"),
  presidentId: uuid("president_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  vicePresidentId: uuid("vice_president_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  vicePresidentRole: text("vice_president_role"), // "Vice President for Internal" or "Vice President for External"
  secretaryId: uuid("secretary_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  treasurerId: uuid("treasurer_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  masterInitiatorId: uuid("master_initiator_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  masterInitiatorRole: text("master_initiator_role"), // I, II, III, or IV
  ladyInitiatorId: uuid("lady_initiator_id").references(() => pgpmembers.id, { onDelete: "set null" }),
  ladyInitiatorRole: text("lady_initiator_role"), // I, II, III, or IV
  status: text("status").notNull().default("pending"), // "pending" until an admin publishes it
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: text("published_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const registrations = pgTable("registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: text("member_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleInitial: text("middle_initial"),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  street: text("street").notNull(),
  barangay: text("barangay").notNull(),
  municipality: text("municipality").notNull(),
  province: text("province").notNull(),
  guardianName: text("guardian_name").notNull(),
  guardianAddress: text("guardian_address").notNull(),
  guardianContact: text("guardian_contact").notNull(),
  guardianRelationship: text("guardian_relationship").notNull(),
  studying: text("studying").notNull(),
  schoolName: text("school_name").notNull(),
  schoolAddress: text("school_address"),
  schoolYear: text("school_year"),
  educationalAttainment: text("educational_attainment"),
  email: text("email").notNull().unique(),
  contactNumber: text("contact_number").notNull(),
  passwordHash: text("password_hash").notNull(),
  applicationStatus: text("application_status").notNull().default("pending"), // pending | approved | rejected
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const registrationSessions = pgTable("registration_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id")
    .notNull()
    .references(() => registrations.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Member digital-ID credentials (created when a member verifies their dateSurvived).
// The memberId column is the username and password; we still hash the password.
export const memberCredentials = pgTable("member_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberPk: uuid("member_pk")
    .notNull()
    .references(() => pgpmembers.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Opaque session tokens for members who log in to view their digital ID.
export const memberSessions = pgTable("member_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  credentialId: uuid("credential_id")
    .notNull()
    .references(() => memberCredentials.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
