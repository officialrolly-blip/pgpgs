import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeading from "@/components/admin/page-heading";
import NeophyteCreateForm from "@/components/admin/neophyte-create-form";
import { requireNeophytesPage } from "@/lib/officer-access";
import { canManageNeophytes, scopeChapterFor, scopeLabel } from "@/lib/officer-permissions";
import { getAllChapterNames } from "@/lib/chapters";

export const metadata: Metadata = { title: "Add Neophyte" };

export default async function NewNeophytePage() {
  const viewer = await requireNeophytesPage();
  if (!canManageNeophytes(viewer)) redirect("/admin/neophytes");

  const scope = scopeChapterFor(viewer);
  const chapters = await getAllChapterNames();

  return (
    <>
      <PageHeading
        title="Add a Neophyte"
        description={
          scope
            ? `The new record will be tracked under ${scopeLabel(viewer)} and start at Orientation.`
            : "Pick the chapter the neophyte will be tracked under. The record starts at Orientation."
        }
        actions={
          <Link href="/admin/neophytes" className="a-btn a-btn-secondary">
            ← Back to Neophyte Status
          </Link>
        }
      />
      <NeophyteCreateForm lockedChapter={scope} chapters={chapters} />
    </>
  );
}