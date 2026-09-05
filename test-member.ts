import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

function loadEnv(file: string) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch {}
}

loadEnv(".env");
loadEnv(".env.local");

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("No database URL configured");
  process.exit(1);
}

const sql = neon(url);

async function testMember(memberId: string) {
  console.log(`Testing Member ID: ${memberId}`);
  console.log("---");

  const result = await sql`
    SELECT id, member_id, first_name, last_name, status
    FROM pgpmembers
    WHERE UPPER(member_id) = UPPER(${memberId})
  `;

  if (result.length === 0) {
    console.log(`❌ Member ID "${memberId}" NOT FOUND in database`);
    console.log("\nChecking for similar IDs...");

    const memberYear = memberId.match(/\d{4}/)?.[0];
    if (memberYear) {
      const similar = await sql`
        SELECT member_id, first_name, last_name, status
        FROM pgpmembers
        WHERE member_id LIKE ${`%${memberYear}%`}
        ORDER BY member_id
        LIMIT 10
      `;

      if (similar.length > 0) {
        console.log(`\nFound these IDs from year ${memberYear}:`);
        similar.forEach((row: any) => {
          console.log(`  - ${row.member_id} (${row.first_name} ${row.last_name}) - Status: ${row.status}`);
        });
      }
    }
  } else {
    const member = result[0] as any;
    console.log(`✅ Member ID FOUND!`);
    console.log(`   Database ID: ${member.id}`);
    console.log(`   Member ID: ${member.member_id}`);
    console.log(`   Name: ${member.first_name} ${member.last_name}`);
    console.log(`   Status: ${member.status}`);

    if (member.status?.toLowerCase() !== "active") {
      console.log(`\n⚠️  WARNING: Status is "${member.status}", not "Active".`);
      console.log("   This could prevent login.");
    }
  }
}

testMember("PGPGS-2021-0001").then(() => process.exit(0));
