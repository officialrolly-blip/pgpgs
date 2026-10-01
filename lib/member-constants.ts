// Shared vocabulary for member records, used by the public API route,
// the admin dashboard, and the officers pages.
export const MEMBER_STATUSES = [
  "Member",
  "Alumni",
  "PGP-GS Roxas City Chapter Officer",
  "Former Chapter President",
  "Former Chapter Vice President",
  "Former Chapter Master Initiator",
  "Former Chapter Lady Initiator",
  "Former Grand Knight",
  "Elected Grand Knight",
  "Chapter Organizer",
] as const;

export const NEOPHYTE_STATUSES = [
  "orientation",
  "baptism",
  "baptism_confirmed",
  "passed_member",
] as const;

export const NEOPHYTE_STATUS_LABELS: Record<
  (typeof NEOPHYTE_STATUSES)[number],
  string
> = {
  orientation: "Orientation",
  baptism: "Baptism",
  baptism_confirmed: "Confirmation of Baptism",
  passed_member: "Passed as a Member",
};

// Sentinel value for the admin "Update stage" dropdown. It is intentionally NOT
// part of NEOPHYTE_STATUSES (the linear formation pipeline). Choosing it and
// saving permanently removes the neophyte record from the database.
export const NEOPHYTE_FAILED_TO_COMPLY = "failed_to_comply";
export const NEOPHYTE_FAILED_TO_COMPLY_LABEL = "Failed to Comply";

export const OFFICER_POSITIONS = [
  "President",
  "Vice President Internal",
  "Vice President External",
  "Treasurer",
  "Secretary",
  "Auditor",
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
] as const;

export const VICE_PRESIDENT_ROLES = [
  "VP For Internal",
  "VP For External",
] as const;

export const MASTER_INITIATOR_ROLES = [
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
] as const;

export const LADY_INITIATOR_ROLES = [
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
  "Lady Initiator IV",
] as const;
