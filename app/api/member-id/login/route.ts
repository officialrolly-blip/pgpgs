import { NextResponse } from "next/server";
import { authenticateMember, setMemberSessionCookie } from "@/lib/member-auth";

export const runtime = "nodejs";

// Member login for the digital-ID portal.
export async function POST(request: Request) {
  try {
    const { memberId, password } = (await request.json()) as {
      memberId?: string;
      password?: string;
    };

    if (!memberId || !password) {
      return NextResponse.json(
        { error: "Member ID and password are required." },
        { status: 400 },
      );
    }

    const result = await authenticateMember(memberId, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await setMemberSessionCookie(result.token);

    return NextResponse.json({
      ok: true,
      memberId: result.user.memberId,
    });
  } catch (error) {
    console.error("Member login failed", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
