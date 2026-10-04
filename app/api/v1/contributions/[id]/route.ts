import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import {
  UUID_PATTERN,
  deleteContributionRecord,
  getContributionById,
} from "@/lib/contribution-service";
import { canAccessChapterName } from "@/lib/chapter-names";
import { asOfficer, getScopedMember } from "@/lib/officer-access";
import { scopeChapterFor } from "@/lib/officer-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — a single contribution record (admin).
//   GET    /api/v1/contributions/{id}
//   DELETE /api/v1/contributions/{id}   (corrections only)
//
// Chapter scoping: a chapter officer only reaches records whose member sits in
// their assigned chapter; anything else answers 404, exactly like an unknown id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const result = await getContributionById(id);
    if (result.migrationNeeded) {
      return NextResponse.json(
        { error: "The contributions ledger is unavailable right now." },
        { status: 503 },
      );
    }
    if (!result.record) {
      return NextResponse.json({ error: "Contribution record not found." }, { status: 404 });
    }
    const chapterScope = scopeChapterFor(asOfficer(admin));
    if (chapterScope) {
      const member = await getScopedMember(admin, result.record.memberPk);
      if (!member || !canAccessChapterName(member.memberChapter, chapterScope)) {
        return NextResponse.json({ error: "Contribution record not found." }, { status: 404 });
      }
    }
    return NextResponse.json({ contribution: result.record });
  } catch (error) {
    console.error("API v1 contribution record failed", error);
    return NextResponse.json(
      { error: "Unable to load the contribution record right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: "Invalid contribution id." }, { status: 400 });
    }
    const result = await deleteContributionRecord(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ success: result.success });
  } catch (error) {
    console.error("API v1 contribution delete failed", error);
    return NextResponse.json(
      { error: "Unable to delete that record right now." },
      { status: 500 },
    );
  }
}
