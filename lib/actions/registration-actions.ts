"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers, registrations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildMemberId } from "@/lib/member-id";

export type ReviewFormState = {
  error?: string;
  success?: string;
};

export async function approveRegistrationAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const admin = await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  if (!registrationId) return { error: "Missing application reference." };

  const [application] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!application) return { error: "Application not found." };
  if (application.applicationStatus !== "pending") {
    return { error: `This application was already ${application.applicationStatus}.` };
  }

  const [existingMember] = await db
    .select({ id: pgpmembers.id })
    .from(pgpmembers)
    .where(eq(pgpmembers.email, application.email))
    .limit(1);
  if (existingMember) {
    return {
      error: "A member with this email already exists in the directory. Reject or delete the application instead.",
    };
  }

  const now = new Date();
  const dateSurvived = now.toISOString().slice(0, 10);

  let memberId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [{ memberCount }] = await db
      .select({ memberCount: drizzleSql<number>`count(*)` })
      .from(pgpmembers);
    memberId = buildMemberId(dateSurvived, Number(memberCount) + 1 + attempt);

    try {
      await db.insert(pgpmembers).values({
        memberId,
        firstName: application.firstName,
        lastName: application.lastName,
        middleInitial: application.middleInitial,
        age: application.age,
        dateOfBirth: application.dateOfBirth,
        placeOfBirth: application.placeOfBirth,
        street: application.street,
        barangay: application.barangay,
        municipality: application.municipality,
        province: application.province,
        email: application.email,
        contactNumber: application.contactNumber,
        guardianName: application.guardianName,
        guardianAddress: application.guardianAddress,
        guardianContact: application.guardianContact,
        // Sensible defaults; both are editable on the member edit page.
        baptizedName: application.firstName,
        dateSurvived,
        // Approved applications enter the internal formation workflow first.
        // They become public members only after an officer confirms completion.
        status: "Neophyte",
        neophyteStatus: "orientation",
        neophyteStatusUpdatedAt: now,
        neophyteStatusUpdatedBy: admin.email,
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error && error.message.toLowerCase().includes("unique");
      if (!isUniqueViolation || attempt === 4) throw error;
    }
  }

  await db
    .update(registrations)
    .set({
      applicationStatus: "approved",
      reviewedAt: new Date(),
      reviewedBy: admin.email,
    })
    .where(eq(registrations.id, registrationId));

  revalidatePath("/admin");
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/members");
  revalidatePath("/admin/neophytes");
  return { success: `Application approved. Member ID ${memberId} was moved to the neophyte workflow.` };
}

export async function rejectRegistrationAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const admin = await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  if (!registrationId) return { error: "Missing application reference." };

  const [application] = await db
    .select({ applicationStatus: registrations.applicationStatus })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!application) return { error: "Application not found." };
  if (application.applicationStatus !== "pending") {
    return { error: `This application was already ${application.applicationStatus}.` };
  }

  await db
    .update(registrations)
    .set({
      applicationStatus: "rejected",
      reviewedAt: new Date(),
      reviewedBy: admin.email,
    })
    .where(eq(registrations.id, registrationId));

  revalidatePath("/admin");
  revalidatePath("/admin/registrations");
  return { success: "Application was rejected." };
}

export async function deleteRegistrationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  if (!registrationId) return;

  await db.delete(registrations).where(eq(registrations.id, registrationId));
  revalidatePath("/admin");
  revalidatePath("/admin/registrations");
  redirect("/admin/registrations");
}
