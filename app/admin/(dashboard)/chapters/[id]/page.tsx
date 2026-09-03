import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { alias } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ChapterEditForm, { type ChapterEditOfficials } from "@/components/admin/chapter-edit-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit Chapter" };

const chapterPresident = alias(pgpmembers, "chapter_president");
const chapterVicePresident = alias(pgpmembers, "chapter_vice_president");
const chapterSecretary = alias(pgpmembers, "chapter_secretary");
const chapterTreasurer = alias(pgpmembers, "chapter_treasurer");
const chapterMasterInitiator = alias(pgpmembers, "chapter_master_initiator");
const chapterLadyInitiator = alias(pgpmembers, "chapter_lady_initiator");

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: chapters.id,
      chapterName: chapters.chapterName,
      chapterAddress: chapters.chapterAddress,
      chapterOrganizer: chapters.chapterOrganizer,
      logoUrl: chapters.logoUrl,
      status: chapters.status,
      vicePresidentRole: chapters.vicePresidentRole,
      masterInitiatorRole: chapters.masterInitiatorRole,
      ladyInitiatorRole: chapters.ladyInitiatorRole,
      presidentId: chapterPresident.id,
      presidentMemberId: chapterPresident.memberId,
      presidentFirst: chapterPresident.firstName,
      presidentMiddle: chapterPresident.middleInitial,
      presidentLast: chapterPresident.lastName,
      presidentStatus: chapterPresident.status,
      vicePresidentId: chapterVicePresident.id,
      vicePresidentMemberId: chapterVicePresident.memberId,
      vicePresidentFirst: chapterVicePresident.firstName,
      vicePresidentMiddle: chapterVicePresident.middleInitial,
      vicePresidentLast: chapterVicePresident.lastName,
      vicePresidentStatus: chapterVicePresident.status,
      secretaryId: chapterSecretary.id,
      secretaryMemberId: chapterSecretary.memberId,
      secretaryFirst: chapterSecretary.firstName,
      secretaryMiddle: chapterSecretary.middleInitial,
      secretaryLast: chapterSecretary.lastName,
      secretaryStatus: chapterSecretary.status,
      treasurerId: chapterTreasurer.id,
      treasurerMemberId: chapterTreasurer.memberId,
      treasurerFirst: chapterTreasurer.firstName,
      treasurerMiddle: chapterTreasurer.middleInitial,
      treasurerLast: chapterTreasurer.lastName,
      treasurerStatus: chapterTreasurer.status,
      masterInitiatorId: chapterMasterInitiator.id,
      masterInitiatorMemberId: chapterMasterInitiator.memberId,
      masterInitiatorFirst: chapterMasterInitiator.firstName,
      masterInitiatorMiddle: chapterMasterInitiator.middleInitial,
      masterInitiatorLast: chapterMasterInitiator.lastName,
      masterInitiatorStatus: chapterMasterInitiator.status,
      ladyInitiatorId: chapterLadyInitiator.id,
      ladyInitiatorMemberId: chapterLadyInitiator.memberId,
      ladyInitiatorFirst: chapterLadyInitiator.firstName,
      ladyInitiatorMiddle: chapterLadyInitiator.middleInitial,
      ladyInitiatorLast: chapterLadyInitiator.lastName,
      ladyInitiatorStatus: chapterLadyInitiator.status,
    })
    .from(chapters)
    .leftJoin(chapterPresident, eq(chapters.presidentId, chapterPresident.id))
    .leftJoin(chapterVicePresident, eq(chapters.vicePresidentId, chapterVicePresident.id))
    .leftJoin(chapterSecretary, eq(chapters.secretaryId, chapterSecretary.id))
    .leftJoin(chapterTreasurer, eq(chapters.treasurerId, chapterTreasurer.id))
    .leftJoin(chapterMasterInitiator, eq(chapters.masterInitiatorId, chapterMasterInitiator.id))
    .leftJoin(chapterLadyInitiator, eq(chapters.ladyInitiatorId, chapterLadyInitiator.id))
    .where(eq(chapters.id, id))
    .limit(1);

  if (!row) notFound();

  const toOption = (
    memberUuid: string | null,
    memberId: string | null,
    firstName: string | null,
    middleInitial: string | null,
    lastName: string | null,
    status: string | null,
  ) =>
    memberUuid && memberId && firstName && lastName
      ? { id: memberUuid, memberId, firstName, lastName, middleInitial, status: status ?? "" }
      : null;

  const officials: ChapterEditOfficials = {
    president: toOption(row.presidentId, row.presidentMemberId, row.presidentFirst, row.presidentMiddle, row.presidentLast, row.presidentStatus),
    vicePresident: toOption(row.vicePresidentId, row.vicePresidentMemberId, row.vicePresidentFirst, row.vicePresidentMiddle, row.vicePresidentLast, row.vicePresidentStatus),
    secretary: toOption(row.secretaryId, row.secretaryMemberId, row.secretaryFirst, row.secretaryMiddle, row.secretaryLast, row.secretaryStatus),
    treasurer: toOption(row.treasurerId, row.treasurerMemberId, row.treasurerFirst, row.treasurerMiddle, row.treasurerLast, row.treasurerStatus),
    masterInitiator: toOption(row.masterInitiatorId, row.masterInitiatorMemberId, row.masterInitiatorFirst, row.masterInitiatorMiddle, row.masterInitiatorLast, row.masterInitiatorStatus),
    ladyInitiator: toOption(row.ladyInitiatorId, row.ladyInitiatorMemberId, row.ladyInitiatorFirst, row.ladyInitiatorMiddle, row.ladyInitiatorLast, row.ladyInitiatorStatus),
  };

  const isPublished = row.status === "published";

  return (
    <>
      <PageHeading
        title="Edit Chapter"
        description={`${row.chapterName} · ${row.chapterAddress}`}
        actions={
          <span className={`a-badge ${isPublished ? "a-badge-green" : "a-badge-amber"}`}>
            {isPublished ? "Published" : "Pending review"}
          </span>
        }
      />

      {!isPublished ? (
        <p className="a-card mb-6 border-[#fedf89] bg-a-warning-soft px-4 py-3 text-sm text-a-warning">
          This chapter is pending review. It is not visible on the public site until it is published from the{" "}
          <Link href="/admin/chapters" className="font-semibold underline">chapters list</Link>.
        </p>
      ) : null}

      <ChapterEditForm
        chapter={{
          id: row.id,
          chapterName: row.chapterName,
          chapterAddress: row.chapterAddress,
          chapterOrganizer: row.chapterOrganizer,
          logoUrl: row.logoUrl,
          status: row.status,
        }}
        officials={officials}
        roles={{
          vicePresidentRole: row.vicePresidentRole ?? "",
          masterInitiatorRole: row.masterInitiatorRole ?? "",
          ladyInitiatorRole: row.ladyInitiatorRole ?? "",
        }}
      />
    </>
  );
}