import type { Metadata } from "next";
import Link from "next/link";
import PageHeading from "@/components/admin/page-heading";
import MemberForm, { emptyMemberForm } from "@/components/admin/member-form";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { canEditMembers, scopeChapterFor } from "@/lib/officer-permissions";
import { getAllChapterNames } from "@/lib/chapters";

export const metadata: Metadata = {
  title: "Add Member",
};

export default async function NewMemberPage() {
  const viewer = await requireAdmin();
  if (!canEditMembers(viewer)) {
    redirect("/admin/members");
  }
  const chapters = await getAllChapterNames();

  return (
    <>
      <PageHeading
        title="Add a Member"
        description="Manually add a brother or sister to the chapter directory."
        actions={
          <Link href="/admin/members" className="a-btn a-btn-secondary">
            ← Back to directory
          </Link>
        }
      />
      <MemberForm
        mode="create"
        initial={emptyMemberForm}
        chapters={chapters}
        lockedChapter={scopeChapterFor(viewer)}
      />
    </>
  );
}
