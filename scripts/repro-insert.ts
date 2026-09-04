import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgpmembers } from "./schema-import";

async function main() {
  const url = process.env.DATABASE_URL!;
  const db = drizzle(neon(url));
  const isMemberOrAlumni = false;
  const isOfficer = false;
  const isFormerPresident = false;
  const isFormerVicePresident = true;
  const isFormerMasterInitiator = false;
  const isFormerLadyInitiator = false;
  const isFormerGrandKnight = false;
  const isChapterOrganizer = false;
  const body = {
    firstName: "Repro",
    lastName: "Test",
    middleInitial: null,
    age: 37,
    dateOfBirth: "1989-02-28",
    placeOfBirth: "Pontevedra, Capiz",
    street: "Tacas",
    barangay: "Pangayawan",
    municipality: "Pontevedra",
    province: "Capiz",
    email: "repro" + Date.now() + "@example.com",
    contactNumber: "0907",
    guardianName: "Guardian",
    guardianAddress: "Addr",
    guardianContact: "0917",
    baptizedName: "Ron",
    dateSurvived: "2020-02-28",
    status: "Former Chapter Vice President",
    memberChapter: null,
    officerPosition: null,
    officerDateElected: null,
    formerPresidentChapter: null,
    formerPresidentStart: null,
    formerPresidentEnd: null,
    formerVicePresidentChapter: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
    formerVicePresidentRole: "VP For Internal",
    formerVicePresidentStart: "2022-01-07",
    formerVicePresidentEnd: "2023-01-07",
    formerMasterInitiatorRole: null,
    formerMasterInitiatorChapter: null,
    formerMasterInitiatorStart: null,
    formerMasterInitiatorEnd: null,
    formerLadyInitiatorRole: null,
    formerLadyInitiatorChapter: null,
    formerLadyInitiatorStart: null,
    formerLadyInitiatorEnd: null,
    grandKnight: null,
    grandKnightChapter: null,
    grandKnightStart: null,
    grandKnightEnd: null,
    chapterOrganizerChapter: null,
    photoUrl: null,
    hasPhoto: false,
  } as const;

  try {
    await db.insert(pgpmembers).values({
      memberId: "pgpgs-repro-" + Date.now(),
      firstName: body.firstName!,
      lastName: body.lastName!,
      middleInitial: body.middleInitial || null,
      age: body.age,
      dateOfBirth: body.dateOfBirth!,
      placeOfBirth: body.placeOfBirth!,
      street: body.street!,
      barangay: body.barangay!,
      municipality: body.municipality!,
      province: body.province!,
      email: body.email,
      contactNumber: body.contactNumber!,
      guardianName: body.guardianName!,
      guardianAddress: body.guardianAddress!,
      guardianContact: body.guardianContact!,
      baptizedName: body.baptizedName!,
      dateSurvived: body.dateSurvived!,
      status: body.status,
      memberChapter: isMemberOrAlumni ? body.memberChapter! : null,
      officerPosition: isOfficer ? body.officerPosition! : null,
      officerDateElected: isOfficer ? body.officerDateElected! : null,
      formerPresidentChapter: isFormerPresident ? body.formerPresidentChapter! : null,
      formerPresidentStart: isFormerPresident ? body.formerPresidentStart! : null,
      formerPresidentEnd: isFormerPresident ? body.formerPresidentEnd! : null,
      formerVicePresidentChapter: isFormerVicePresident ? body.formerVicePresidentChapter! : null,
      formerVicePresidentRole: isFormerVicePresident ? body.formerVicePresidentRole! : null,
      formerVicePresidentStart: isFormerVicePresident ? body.formerVicePresidentStart! : null,
      formerVicePresidentEnd: isFormerVicePresident ? body.formerVicePresidentEnd! : null,
      formerMasterInitiatorRole: isFormerMasterInitiator ? body.formerMasterInitiatorRole! : null,
      formerMasterInitiatorChapter: isFormerMasterInitiator ? body.formerMasterInitiatorChapter! : null,
      formerMasterInitiatorStart: isFormerMasterInitiator ? body.formerMasterInitiatorStart! : null,
      formerMasterInitiatorEnd: isFormerMasterInitiator ? body.formerMasterInitiatorEnd! : null,
      formerLadyInitiatorRole: isFormerLadyInitiator ? body.formerLadyInitiatorRole! : null,
      formerLadyInitiatorChapter: isFormerLadyInitiator ? body.formerLadyInitiatorChapter! : null,
      formerLadyInitiatorStart: isFormerLadyInitiator ? body.formerLadyInitiatorStart! : null,
      formerLadyInitiatorEnd: isFormerLadyInitiator ? body.formerLadyInitiatorEnd! : null,
      grandKnight: body.grandKnight ? body.grandKnight : null,
      grandKnightChapter: isFormerGrandKnight || (body as { status: string }).status === "Elected Grand Knight" ? body.grandKnightChapter! : null,
      grandKnightStart: isFormerGrandKnight ? body.grandKnightStart! : null,
      grandKnightEnd: isFormerGrandKnight ? body.grandKnightEnd! : null,
      chapterOrganizerChapter: isChapterOrganizer ? body.chapterOrganizerChapter! : null,
      photoUrl: body.photoUrl ? body.photoUrl : null,
      hasPhoto: Boolean(body.hasPhoto),
    });
    console.log("INSERT OK");
  } catch (err) {
    console.log("TOP LEVEL:", err instanceof Error ? err.message : String(err));
    const cause = (err as { cause?: unknown }).cause;
    console.log("CAUSE:", JSON.stringify(cause, null, 2) ?? String(cause));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});