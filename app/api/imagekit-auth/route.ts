import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || privateKey.startsWith("your_")) {
    return NextResponse.json(
      { error: "ImageKit private key is missing or still a placeholder. Set IMAGEKIT_PRIVATE_KEY in .env.local." },
      { status: 503 },
    );
  }

  const expire = Math.floor(Date.now() / 1000) + 10 * 60;
  const token = randomBytes(16).toString("hex");
  const signature = createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  return NextResponse.json({ token, expire, signature });
}
