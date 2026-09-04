import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import MemberForm, {
  type MemberFormValues,
} from "@/components/admin/member-form";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { deleteMemberAction } from "@/lib/actions/member-actions";
import { requireAdmin } from "@/lib/auth";
import { getAllChapterNames } from "@/lib/chapters";

export const metadata: Metadata = {
  title: "Edit Member",
};

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const chapters = await getAllChapterNames();

  const [member] = await db
    .select()
    .from(pgpmembers)
    .where(eq(pgpmembers.id, id))
    .limit(1);

  if (!member) notFound();

  const initial: MemberFormValues = {
    id: member.id,
    memberId: member.memberId,
    firstName: member.firstName,
    lastName: member.lastName,
    middleInitial: member.middleInitial ?? "",
    age: String(member.age),
    dateOfBirth: member.dateOfBirth,
    placeOfBirth: member.placeOfBirth,
    street: member.street,
    barangay: member.barangay,
    municipality: member.municipality,
    province: member.province,
    email: member.email,
    contactNumber: member.contactNumber,
    guardianName: member.guardianName,
    guardianAddress: member.guardianAddress,
    guardianContact: member.guardianContact,
    baptizedName: member.baptizedName,
    dateSurvived: member.dateSurvived,
    status: member.status,
    memberChapter: member.memberChapter ?? "",
    officerPosition: member.officerPosition ?? "",
    officerDateElected: member.officerDateElected ?? "",
    formerPresidentChapter: member.formerPresidentChapter ?? "",
    formerPresidentStart: member.formerPresidentStart ?? "",
    formerPresidentEnd: member.formerPresidentEnd ?? "",
    formerVicePresidentChapter: member.formerVicePresidentChapter ?? "",
    formerVicePresidentRole: member.formerVicePresidentRole ?? "",
    formerVicePresidentStart: member.formerVicePresidentStart ?? "",
    formerVicePresidentEnd: member.formerVicePresidentEnd ?? "",
    formerMasterInitiatorRole: member.formerMasterInitiatorRole ?? "",
    formerMasterInitiatorChapter: member.formerMasterInitiatorChapter ?? "",
    formerMasterInitiatorStart: member.formerMasterInitiatorStart ?? "",
    formerMasterInitiatorEnd: member.formerMasterInitiatorEnd ?? "",
    formerLadyInitiatorRole: member.formerLadyInitiatorRole ?? "",
    formerLadyInitiatorChapter: member.formerLadyInitiatorChapter ?? "",
    formerLadyInitiatorStart: member.formerLadyInitiatorStart ?? "",
    formerLadyInitiatorEnd: member.formerLadyInitiatorEnd ?? "",
    grandKnightChapter: member.grandKnightChapter ?? "",
    grandKnightStart: member.grandKnightStart ?? "",
    grandKnightEnd: member.grandKnightEnd ?? "",
    chapterOrganizerChapter: member.chapterOrganizerChapter ?? "",
    photoUrl: member.photoUrl ?? "",
    hasPhoto: member.hasPhoto,
  };

  return (
    <>
      <PageHeading
        title={`${member.firstName} ${member.lastName}`}
        description={`Member ID ${member.memberId} · joined ${member.createdAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`}
        actions={
          <>
            <Link href="/admin/members" className="a-btn a-btn-secondary">
              ← Back
            </Link>
            <form action={deleteMemberAction}>
              <input type="hidden" name="id" value={member.id} />
              <ConfirmSubmitButton
                message={`Delete ${member.firstName} ${member.lastName} (${member.memberId})? This cannot be undone.`}
                className="a-btn a-btn-danger"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />
      <MemberForm mode="edit" initial={initial} chapters={chapters} />
    </>
  );
}
