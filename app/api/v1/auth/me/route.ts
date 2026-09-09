import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { getMemberSessionUserFromRequest } from "@/lib/member-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — the logged-in member's digital-ID payload, authenticated via
// `Authorization: Bearer <token>` (mobile) or the website cookie session.
// The payload mirrors /api/member-id/me so the mobile ID card matches the
// website's; the two are intentionally versioned separately.
export async function GET(request: Request) {
  try {
    const session = await getMemberSessionUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const [member] = await db
      .select()
      .from(pgpmembers)
      .where(eq(pgpmembers.id, session.memberPk))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    // Build the verification URL for the QR code.
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_URL ??
      "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify/${member.memberId}`;

    const qrCode = await QRCode.toDataURL(verifyUrl, {
      width: 256,
      margin: 1,
      color: { dark: "#0f3d26", light: "#ffffff" },
    });

    const fullName = [member.firstName, member.middleInitial, member.lastName]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();

    const address = [member.street, member.barangay, member.municipality, member.province]
      .filter(Boolean)
      .join(", ");

    return NextResponse.json({
      member: {
        id: member.id,
        memberId: member.memberId,
        fullName,
        status: member.status,
        chapter: member.memberChapter || "—",
        dateOfBirth: member.dateOfBirth,
        placeOfBirth: member.placeOfBirth,
        address,
        dateSurvived: member.dateSurvived,
        baptizedName: member.baptizedName,
        photoUrl: member.photoUrl,
        hasPhoto: member.hasPhoto,
        guardianName: member.guardianName,
        guardianAddress: member.guardianAddress,
        guardianContact: member.guardianContact,
        contactNumber: member.contactNumber,
        qrCode,
      },
    });
  } catch (error) {
    console.error("API v1 member profile failed", error);
    return NextResponse.json(
      { error: "Failed to load your profile." },
      { status: 500 },
    );
  }
}