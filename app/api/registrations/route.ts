import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";

export const runtime = "nodejs";

const hashPassword = promisify(scrypt);

const requiredFields = [
  "firstName",
  "lastName",
  "age",
  "gender",
  "dateOfBirth",
  "placeOfBirth",
  "street",
  "barangay",
  "municipality",
  "province",
  "guardianName",
  "guardianAddress",
  "guardianContact",
  "guardianRelationship",
  "studying",
  "schoolName",
  "email",
  "contactNumber",
  "password",
] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const missingField = requiredFields.find(
      (field) => typeof body[field] !== "string" || !body[field]?.trim(),
    );

    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 },
      );
    }

    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return NextResponse.json({ error: "Please enter a valid age." }, { status: 400 });
    }

    if (body.studying !== "Yes" && body.studying !== "No") {
      return NextResponse.json({ error: "Please select a valid study status." }, { status: 400 });
    }

    if (body.studying === "Yes" && (!body.schoolAddress || !body.schoolYear)) {
      return NextResponse.json(
        { error: "School address and year are required for current students." },
        { status: 400 },
      );
    }

    if (body.studying === "No" && !body.educationalAttainment) {
      return NextResponse.json(
        { error: "Educational attainment is required." },
        { status: 400 },
      );
    }

    const email = (body.email as string).trim().toLowerCase();
    const existingRegistration = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(eq(registrations.email, email))
      .limit(1);
    if (existingRegistration.length > 0) {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 },
      );
    }

    const password = body.password as string;
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await hashPassword(password, salt, 64)) as Buffer;
    const passwordHash = `${salt}:${derivedKey.toString("hex")}`;
    let memberId = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [{ memberCount }] = await db
        .select({ memberCount: drizzleSql<number>`count(*)` })
        .from(registrations);
      memberId = `PGPGS-${new Date().getFullYear()}-${String(Number(memberCount) + 1 + attempt).padStart(4, "0")}`;

      try {
        await db.insert(registrations).values({
          memberId,
          firstName: body.firstName as string,
          lastName: body.lastName as string,
          middleInitial: (body.middleInitial as string) || null,
          age,
          gender: body.gender as string,
          dateOfBirth: body.dateOfBirth as string,
          placeOfBirth: body.placeOfBirth as string,
          street: body.street as string,
          barangay: body.barangay as string,
          municipality: body.municipality as string,
          province: body.province as string,
          guardianName: body.guardianName as string,
          guardianAddress: body.guardianAddress as string,
          guardianContact: body.guardianContact as string,
          guardianRelationship: body.guardianRelationship as string,
          studying: body.studying as string,
          schoolName: body.schoolName as string,
          schoolAddress: (body.schoolAddress as string) || null,
          schoolYear: (body.schoolYear as string) || null,
          educationalAttainment: (body.educationalAttainment as string) || null,
          email,
          contactNumber: body.contactNumber as string,
          passwordHash,
        });
        break;
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("unique") || attempt === 2) {
          throw error;
        }
      }
    }

    return NextResponse.json({ memberId, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "An application with this email already exists." },
        { status: 409 },
      );
    }

    console.error("Registration submission failed", error);
    return NextResponse.json(
      { error: "Unable to save your registration right now. Please try again." },
      { status: 500 },
    );
  }
}
