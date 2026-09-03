"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadChapterLogoServer } from "@/lib/imagekit-server";

export type ChapterActionState = { error?: string; success?: string };

const INITIATOR_ROLES = ["I", "II", "III", "IV"] as const;
type InitiatorRole = (typeof INITIATOR_ROLES)[number];
const VICE_PRESIDENT_ROLES = [
  "Vice President for Internal",
  "Vice President for External",
] as const;
type VicePresidentRole = (typeof VICE_PRESIDENT_ROLES)[number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function chapterId(formData: FormData): string {
  return String(formData.get("chapterId") ?? "").trim();
}

function requiredText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalMemberId(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return UUID_PATTERN.test(value) ? value : null;
}

function revalidateChapterPaths(id?: string) {
  revalidatePath("/admin/chapters");
  if (id) revalidatePath(`/admin/chapters/${id}`);
  revalidatePath("/about/pgpgs-across-capiz");
}

/** Publishes a pending chapter so it appears on the public site. */
export async function publishChapterAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = chapterId(formData);
  if (!UUID_PATTERN.test(id)) return;

  const now = new Date();
  await db
    .update(chapters)
    .set({
      status: "published",
      publishedAt: now,
      publishedBy: admin.email,
      reviewedAt: now,
      reviewedBy: admin.email,
    })
    .where(eq(chapters.id, id));
  revalidateChapterPaths(id);
}

/** Sends a published chapter back to the pending review queue. */
export async function unpublishChapterAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = chapterId(formData);
  if (!UUID_PATTERN.test(id)) return;

  await db
    .update(chapters)
    .set({
      status: "pending",
      publishedAt: null,
      publishedBy: null,
      reviewedAt: new Date(),
      reviewedBy: admin.email,
    })
    .where(eq(chapters.id, id));
  revalidateChapterPaths(id);
}

/** Permanently removes a chapter registration. */
export async function deleteChapterAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = chapterId(formData);
  if (!UUID_PATTERN.test(id)) return;

  await db.delete(chapters).where(eq(chapters.id, id));
  revalidateChapterPaths();
}

function resolveInitiatorRole(
  memberId: string | null,
  role: FormDataEntryValue | null,
): { value: string | null; error?: string } {
  if (!memberId) {
    if (typeof role === "string" && role.trim()) {
      return { value: null, error: "A role was selected without choosing a member." };
    }
    return { value: null };
  }
  const trimmed = typeof role === "string" ? role.trim() : "";
  if (!trimmed) {
    return { value: null, error: "Please choose the initiator role (I, II, III, or IV)." };
  }
  if (!INITIATOR_ROLES.includes(trimmed as InitiatorRole)) {
    return { value: null, error: "Initiator role must be I, II, III, or IV." };
  }
  return { value: trimmed };
}

function resolveVicePresidentRole(
  memberId: string | null,
  role: FormDataEntryValue | null,
): { value: string | null; error?: string } {
  if (!memberId) {
    if (typeof role === "string" && role.trim()) {
      return { value: null, error: "A role was selected without choosing a member." };
    }
    return { value: null };
  }
  const trimmed = typeof role === "string" ? role.trim() : "";
  if (!trimmed) {
    return { value: null, error: "Please choose the Vice President role (Internal or External)." };
  }
  if (!VICE_PRESIDENT_ROLES.includes(trimmed as VicePresidentRole)) {
    return { value: null, error: "Vice President role must be Internal or External." };
  }
  return { value: trimmed };
}

/** Full edit of a chapter: details, optional logo replacement, and officials. */
export async function updateChapterAction(
  _previousState: ChapterActionState,
  formData: FormData,
): Promise<ChapterActionState> {
  const admin = await requireAdmin();
  const id = chapterId(formData);
  if (!UUID_PATTERN.test(id)) return { error: "Missing or invalid chapter reference." };

  const chapterName = requiredText(formData, "chapterName");
  const chapterAddress = requiredText(formData, "chapterAddress");
  const chapterOrganizer = requiredText(formData, "chapterOrganizer");
  if (!chapterName || !chapterAddress || !chapterOrganizer) {
    return { error: "Chapter name, address, and organizer are required." };
  }

  const officialIds = {
    presidentId: optionalMemberId(formData, "presidentId"),
    vicePresidentId: optionalMemberId(formData, "vicePresidentId"),
    secretaryId: optionalMemberId(formData, "secretaryId"),
    treasurerId: optionalMemberId(formData, "treasurerId"),
    masterInitiatorId: optionalMemberId(formData, "masterInitiatorId"),
    ladyInitiatorId: optionalMemberId(formData, "ladyInitiatorId"),
  };

  const masterRole = resolveInitiatorRole(
    officialIds.masterInitiatorId,
    formData.get("masterInitiatorRole"),
  );
  if (masterRole.error) return { error: masterRole.error };
  const viceRole = resolveVicePresidentRole(
    officialIds.vicePresidentId,
    formData.get("vicePresidentRole"),
  );
  if (viceRole.error) return { error: viceRole.error };
  const ladyRole = resolveInitiatorRole(
    officialIds.ladyInitiatorId,
    formData.get("ladyInitiatorRole"),
  );
  if (ladyRole.error) return { error: ladyRole.error };

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) {
      return { error: "The logo must be an image file." };
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: "The logo must be 5 MB or smaller." };
    }
    try {
      logoUrl = await uploadChapterLogoServer(logo, chapterName);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Logo upload failed.",
      };
    }
  }

  try {
    await db
      .update(chapters)
      .set({
        chapterName,
        chapterAddress,
        chapterOrganizer,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...officialIds,
        vicePresidentRole: viceRole.value,
        masterInitiatorRole: masterRole.value,
        ladyInitiatorRole: ladyRole.value,
        reviewedAt: new Date(),
        reviewedBy: admin.email,
      })
      .where(eq(chapters.id, id));
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
    const pgCode = cause?.code ?? (error as { code?: string })?.code ?? "";
    const combined = `${error instanceof Error ? error.message : ""} ${cause?.message ?? ""}`.toLowerCase();
    if (pgCode === "23505" || combined.includes("unique") || combined.includes("duplicate")) {
      return { error: "A chapter with this name has already been registered." };
    }
    if (pgCode === "23503" || combined.includes("foreign key")) {
      return { error: "One of the selected officials could not be found. Please search again." };
    }
    console.error("Chapter update failed", error);
    return { error: "Unable to save the chapter right now. Please try again." };
  }

  revalidateChapterPaths(id);
  return { success: "Chapter updated successfully." };
}