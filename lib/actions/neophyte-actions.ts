"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { NEOPHYTE_STATUSES, NEOPHYTE_STATUS_LABELS } from "@/lib/member-constants";

export type NeophyteActionState = { error?: string; success?: string };

function neophyteId(formData: FormData): string {
  return String(formData.get("neophyteId") ?? "").trim();
}

function revalidateNeophytePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/neophytes");
  revalidatePath("/admin/members");
}

export async function updateNeophyteStatusAction(
  _previousState: NeophyteActionState,
  formData: FormData,
): Promise<NeophyteActionState> {
  const admin = await requireAdmin();
  const id = neophyteId(formData);
  const requestedStatus = String(formData.get("neophyteStatus") ?? "").trim();
  if (!id) return { error: "Missing neophyte reference." };
  if (!NEOPHYTE_STATUSES.includes(requestedStatus as (typeof NEOPHYTE_STATUSES)[number])) {
    return { error: "Please select a valid neophyte status." };
  }

  const [neophyte] = await db
    .select({ id: pgpmembers.id, status: pgpmembers.status, neophyteStatus: pgpmembers.neophyteStatus })
    .from(pgpmembers)
    .where(eq(pgpmembers.id, id))
    .limit(1);
  if (!neophyte || neophyte.status !== "Neophyte") return { error: "Neophyte record not found." };

  const currentIndex = NEOPHYTE_STATUSES.indexOf(
    (neophyte.neophyteStatus ?? "orientation") as (typeof NEOPHYTE_STATUSES)[number],
  );
  const nextIndex = NEOPHYTE_STATUSES.indexOf(requestedStatus as (typeof NEOPHYTE_STATUSES)[number]);
  if (currentIndex === -1) return { error: "This record has an invalid workflow status." };
  if (nextIndex > currentIndex + 1) {
    return { error: "Complete the previous formation step before advancing." };
  }

  await db
    .update(pgpmembers)
    .set({
      neophyteStatus: requestedStatus,
      neophyteStatusUpdatedAt: new Date(),
      neophyteStatusUpdatedBy: admin.email,
    })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  return { success: `Status updated to ${NEOPHYTE_STATUS_LABELS[requestedStatus as (typeof NEOPHYTE_STATUSES)[number]]}.` };
}

export async function issueNeophyteCertificationAction(
  _previousState: NeophyteActionState,
  formData: FormData,
): Promise<NeophyteActionState> {
  const admin = await requireAdmin();
  const id = neophyteId(formData);
  if (!id) return { error: "Missing neophyte reference." };

  const [neophyte] = await db
    .select({ status: pgpmembers.status, neophyteStatus: pgpmembers.neophyteStatus })
    .from(pgpmembers)
    .where(eq(pgpmembers.id, id))
    .limit(1);
  if (!neophyte || neophyte.status !== "Neophyte") return { error: "Neophyte record not found." };
  if (neophyte.neophyteStatus !== "passed_member") {
    return { error: "The neophyte must reach ‘Passed as a Member’ before certification." };
  }

  await db
    .update(pgpmembers)
    .set({ neophyteCertificationIssuedAt: new Date(), neophyteCertificationIssuedBy: admin.email })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  return { success: "Certification issued. It is ready to print and confirm." };
}

export async function confirmNeophyteMemberAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = neophyteId(formData);
  if (!id) return;

  const [neophyte] = await db
    .select({ status: pgpmembers.status, neophyteStatus: pgpmembers.neophyteStatus, certificationIssuedAt: pgpmembers.neophyteCertificationIssuedAt })
    .from(pgpmembers)
    .where(eq(pgpmembers.id, id))
    .limit(1);
  if (!neophyte || neophyte.status !== "Neophyte") return;
  if (neophyte.neophyteStatus !== "passed_member" || !neophyte.certificationIssuedAt) return;

  const now = new Date();
  await db
    .update(pgpmembers)
    .set({
      status: "Member",
      dateSurvived: now.toISOString().slice(0, 10),
      neophyteStatus: "confirmed_member",
      neophyteStatusUpdatedAt: now,
      neophyteStatusUpdatedBy: admin.email,
    })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  redirect("/admin/neophytes?confirmed=1");
}
