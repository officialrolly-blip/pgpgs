import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import {
  deleteChapterAction,
  publishChapterAction,
  unpublishChapterAction,
} from "@/lib/actions/chapter-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Across Capiz Chapters" };

const chapterPresident = alias(pgpmembers, "chapter_president");
const chapterVicePresident = alias(pgpmembers, "chapter_vice_president");
const chapterSecretary = alias(pgpmembers, "chapter_secretary");
const chapterTreasurer = alias(pgpmembers, "chapter_treasurer");
const chapterMasterInitiator = alias(pgpmembers, "chapter_master_initiator");
const chapterLadyInitiator = alias(pgpmembers, "chapter_lady_initiator");

function personName(person: { first: string | null; middle: string | null; last: string | null }) {
  return [person.first, person.middle, person.last].filter(Boolean).join(" ");
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminChaptersPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: chapters.id,
      chapterName: chapters.chapterName,
      chapterAddress: chapters.chapterAddress,
      chapterOrganizer: chapters.chapterOrganizer,
      logoUrl: chapters.logoUrl,
      status: chapters.status,
      createdAt: chapters.createdAt,
      publishedAt: chapters.publishedAt,
      presidentFirst: chapterPresident.firstName,
      presidentMiddle: chapterPresident.middleInitial,
      presidentLast: chapterPresident.lastName,
      vicePresidentFirst: chapterVicePresident.firstName,
      vicePresidentMiddle: chapterVicePresident.middleInitial,
      vicePresidentLast: chapterVicePresident.lastName,
      secretaryFirst: chapterSecretary.firstName,
      secretaryMiddle: chapterSecretary.middleInitial,
      secretaryLast: chapterSecretary.lastName,
      treasurerFirst: chapterTreasurer.firstName,
      treasurerMiddle: chapterTreasurer.middleInitial,
      treasurerLast: chapterTreasurer.lastName,
      masterInitiatorFirst: chapterMasterInitiator.firstName,
      masterInitiatorMiddle: chapterMasterInitiator.middleInitial,
      masterInitiatorLast: chapterMasterInitiator.lastName,
      masterInitiatorRole: chapters.masterInitiatorRole,
      ladyInitiatorFirst: chapterLadyInitiator.firstName,
      ladyInitiatorMiddle: chapterLadyInitiator.middleInitial,
      ladyInitiatorLast: chapterLadyInitiator.lastName,
      ladyInitiatorRole: chapters.ladyInitiatorRole,
    })
    .from(chapters)
    .leftJoin(chapterPresident, eq(chapters.presidentId, chapterPresident.id))
    .leftJoin(chapterVicePresident, eq(chapters.vicePresidentId, chapterVicePresident.id))
    .leftJoin(chapterSecretary, eq(chapters.secretaryId, chapterSecretary.id))
    .leftJoin(chapterTreasurer, eq(chapters.treasurerId, chapterTreasurer.id))
    .leftJoin(chapterMasterInitiator, eq(chapters.masterInitiatorId, chapterMasterInitiator.id))
    .leftJoin(chapterLadyInitiator, eq(chapters.ladyInitiatorId, chapterLadyInitiator.id))
    .orderBy(desc(chapters.createdAt));

  const pending = rows.filter((row) => row.status !== "published").length;
  const published = rows.length - pending;

  return (
    <>
      <PageHeading
        title="Across Capiz Chapters"
        description="Review chapter registrations from the public PGPGS Across Capiz form. Only published chapters appear on the website."
        actions={
          <Link href="/about/pgpgs-across-capiz" target="_blank" rel="noreferrer" className="a-btn a-btn-secondary">
            View public page ↗
          </Link>
        }
      />

      <section className="a-card grid overflow-hidden sm:grid-cols-3 sm:divide-x divide-a-border-soft" aria-label="Chapter overview">
        <SummaryItem label="Total registrations" value={rows.length} detail="All time" />
        <SummaryItem label="Awaiting review" value={pending} detail={pending === 1 ? "Chapter pending" : "Chapters pending"} />
        <SummaryItem label="Published" value={published} detail="Visible on the website" />
      </section>

      <section className="a-card mt-6 overflow-hidden" aria-labelledby="chapters-heading">
        <header className="flex items-end justify-between gap-4 border-b border-a-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-a-muted">Chapter registry</p>
            <h2 id="chapters-heading" className="a-card-title mt-1">Submissions &amp; published chapters</h2>
          </div>
          <span className="a-badge a-badge-green a-badge-plain">{rows.length} total</span>
        </header>
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <p className="text-sm text-a-muted">No chapters have been registered yet.</p>
            <p className="mt-1 text-xs text-a-muted/80">Submissions from the public form will appear here for review.</p>
          </div>
        ) : (
          <ChapterTable rows={rows} />
        )}
      </section>
    </>
  );
}

function SummaryItem({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="p-5">
      <p className="text-sm font-medium text-a-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-a-text">{value}</p>
      <p className="mt-0.5 text-xs text-a-muted">{detail}</p>
    </div>
  );
}

type OfficialNameFields =
  | "presidentFirst" | "presidentMiddle" | "presidentLast"
  | "vicePresidentFirst" | "vicePresidentMiddle" | "vicePresidentLast"
  | "secretaryFirst" | "secretaryMiddle" | "secretaryLast"
  | "treasurerFirst" | "treasurerMiddle" | "treasurerLast"
  | "masterInitiatorFirst" | "masterInitiatorMiddle" | "masterInitiatorLast"
  | "ladyInitiatorFirst" | "ladyInitiatorMiddle" | "ladyInitiatorLast";

type ChapterRow = {
  id: string;
  chapterName: string;
  chapterAddress: string;
  chapterOrganizer: string;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
  masterInitiatorRole: string | null;
  ladyInitiatorRole: string | null;
} & Record<OfficialNameFields, string | null>;

function ChapterTable({ rows }: { rows: ChapterRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="a-table min-w-[900px]">
        <thead>
          <tr>
            <th className="a-th sm:!px-6">Chapter</th>
            <th className="a-th">Officials</th>
            <th className="a-th">Submitted</th>
            <th className="a-th">Status</th>
            <th className="a-th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {rows.map((row) => {
            const isPublished = row.status === "published";
            const officials = [
              row.presidentLast ? `President: ${personName({ first: row.presidentFirst, middle: row.presidentMiddle, last: row.presidentLast })}` : null,
              row.vicePresidentLast ? `VP: ${personName({ first: row.vicePresidentFirst, middle: row.vicePresidentMiddle, last: row.vicePresidentLast })}` : null,
              row.secretaryLast ? `Secretary: ${personName({ first: row.secretaryFirst, middle: row.secretaryMiddle, last: row.secretaryLast })}` : null,
              row.treasurerLast ? `Treasurer: ${personName({ first: row.treasurerFirst, middle: row.treasurerMiddle, last: row.treasurerLast })}` : null,
              row.masterInitiatorLast ? `Master Initiator ${row.masterInitiatorRole ?? ""}: ${personName({ first: row.masterInitiatorFirst, middle: row.masterInitiatorMiddle, last: row.masterInitiatorLast })}` : null,
              row.ladyInitiatorLast ? `Lady Initiator ${row.ladyInitiatorRole ?? ""}: ${personName({ first: row.ladyInitiatorFirst, middle: row.ladyInitiatorMiddle, last: row.ladyInitiatorLast })}` : null,
            ].filter(Boolean) as string[];
            return (
              <tr key={row.id} className="a-tr align-top">
                <td className="a-td sm:!px-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-a-border bg-a-brand-soft">
                      {row.logoUrl ? (
                        <Image src={row.logoUrl} alt="" width={44} height={44} unoptimized className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-a-brand">PGPGS</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/chapters/${row.id}`} className="block truncate font-semibold text-a-text transition hover:text-a-brand">{row.chapterName}</Link>
                      <span className="block truncate text-xs text-a-muted">{row.chapterAddress}</span>
                      <span className="block truncate text-xs text-a-muted">Organizer: {row.chapterOrganizer}</span>
                    </span>
                  </div>
                </td>
                <td className="a-td">
                  {officials.length === 0 ? (
                    <span className="text-xs text-a-muted/80">No officials designated</span>
                  ) : (
                    <ul className="space-y-1 text-xs leading-5">
                      {officials.map((official) => (
                        <li key={official}>{official}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="a-td text-a-muted"><time dateTime={row.createdAt.toISOString()}>{formatDate(row.createdAt)}</time></td>
                <td className="a-td">
                  <span className={`a-badge ${isPublished ? "a-badge-green" : "a-badge-amber"}`}>
                    {isPublished ? "Published" : "Pending review"}
                  </span>
                  {isPublished && row.publishedAt ? (
                    <p className="mt-1 text-[11px] text-a-muted">on {formatDate(row.publishedAt)}</p>
                  ) : null}
                </td>
                <td className="a-td">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isPublished ? (
                      <form action={unpublishChapterAction}>
                        <input type="hidden" name="chapterId" value={row.id} />
                        <button type="submit" className="a-btn a-btn-secondary a-btn-sm">Unpublish</button>
                      </form>
                    ) : (
                      <form action={publishChapterAction}>
                        <input type="hidden" name="chapterId" value={row.id} />
                        <button type="submit" className="a-btn a-btn-primary a-btn-sm">Publish</button>
                      </form>
                    )}
                    <Link href={`/admin/chapters/${row.id}`} className="a-btn a-btn-secondary a-btn-sm">Edit</Link>
                    <form action={deleteChapterAction}>
                      <input type="hidden" name="chapterId" value={row.id} />
                      <ConfirmSubmitButton
                        message={`Delete the chapter "${row.chapterName}"? This cannot be undone.`}
                        className="a-btn a-btn-danger a-btn-sm"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}