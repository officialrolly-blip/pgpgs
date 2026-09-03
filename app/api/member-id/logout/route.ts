import { NextResponse } from "next/server";
import { destroyMemberSession } from "@/lib/member-auth";

export const runtime = "nodejs";

export async function POST() {
  await destroyMemberSession();
  return NextResponse.json({ ok: true });
}
