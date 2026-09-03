import type { Metadata } from "next";
import { asc, ne } from "drizzle-orm";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import IdCardGrid, { type IdCardMember } from "@/components/admin/id-card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "PGPGS ID" };
export const dynamic = "force-dynamic";

async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

export default async function AdminIdsPage() {
  await requireAdmin();
  const origin = await getSiteOrigin();

  const rows = await db
    .select({
      id: pgpmembers.id,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      status: pgpmembers.status,
      memberChapter: pgpmembers.memberChapter,
      dateOfBirth: pgpmembers.dateOfBirth,
      placeOfBirth: pgpmembers.placeOfBirth,
      street: pgpmembers.street,
      barangay: pgpmembers.barangay,
      municipality: pgpmembers.municipality,
      province: pgpmembers.province,
      dateSurvived: pgpmembers.dateSurvived,
      baptizedName: pgpmembers.baptizedName,
      photoUrl: pgpmembers.photoUrl,
      hasPhoto: pgpmembers.hasPhoto,
      guardianName: pgpmembers.guardianName,
      guardianAddress: pgpmembers.guardianAddress,
      guardianContact: pgpmembers.guardianContact,
      contactNumber: pgpmembers.contactNumber,
    })
    .from(pgpmembers)
    .where(ne(pgpmembers.status, "Neophyte"))
    .orderBy(asc(pgpmembers.memberId));

  const cards: IdCardMember[] = await Promise.all(
    rows.map(async (member) => {
      const memberId = member.memberId.trim().toUpperCase();
      const verificationUrl = `${origin}/verify/${encodeURIComponent(memberId)}`;
      const qrCode = await QRCode.toDataURL(verificationUrl, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0f3d26", light: "#ffffff" },
      });
      const fullName = `${member.firstName}${
        member.middleInitial ? ` ${member.middleInitial}.` : ""
      } ${member.lastName}`;

      return {
        id: member.id,
        memberId,
        fullName: fullName.toUpperCase(),
        status: member.status,
        chapter: member.memberChapter ?? "Roxas City Capiz Chapter",
        dateOfBirth: member.dateOfBirth,
        placeOfBirth: member.placeOfBirth,
        address: `${member.street}, ${member.barangay}, ${member.municipality}, ${member.province}`,
        dateSurvived: member.dateSurvived,
        baptizedName: member.baptizedName,
        photoUrl: member.photoUrl,
        hasPhoto: member.hasPhoto,
        guardianName: member.guardianName,
        guardianAddress: member.guardianAddress,
        guardianContact: member.guardianContact,
        contactNumber: member.contactNumber,
        qrCode,
      };
    }),
  );

  return (
    <>
      <PageHeading
        title="PGPGS Member ID"
        description={`Generates the verified membership ID for every member in the database (${
          cards.length
        } member${cards.length === 1 ? "" : "s"}). The QR code on each ID opens the public verification page, and the back of the ID carries the emergency contact information. Click any card to flip it.`}
      />
      <IdCardGrid members={cards} />
    </>
  );
}