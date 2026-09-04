// Diagnostic: test ImageKit uploads end-to-end exactly like the app does.
// 1. Browser flow:  HMAC auth params + public key  -> upload.imagekit.io
// 2. Server flow:   Basic auth with private key    -> upload.imagekit.io
// Cleans up the test files afterwards.
import { createHmac, randomBytes } from "node:crypto";

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function browserFlowUpload() {
  console.log("--- Browser flow (public key + HMAC signature) ---");
  if (!PUBLIC_KEY) return "SKIP: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY is empty";
  if (!PRIVATE_KEY) return "SKIP: IMAGEKIT_PRIVATE_KEY is empty (auth params need it)";

  const expire = Math.floor(Date.now() / 1000) + 600;
  const token = randomBytes(16).toString("hex");
  const signature = createHmac("sha1", PRIVATE_KEY).update(token + expire).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), "diag-browser.png");
  form.append("fileName", `diag-browser-${Date.now()}.png`);
  form.append("publicKey", PUBLIC_KEY);
  form.append("token", token);
  form.append("expire", String(expire));
  form.append("signature", signature);
  form.append("useUniqueFileName", "true");
  form.append("folder", "news-posts");
  form.append("isPrivateFile", "false");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  if (!res.ok) return `FAILED (${res.status}): ${text.slice(0, 400)}`;
  const json = JSON.parse(text) as { fileId: string; url: string };
  console.log(`  OK -> ${json.url}`);
  return json.fileId;
}

async function serverFlowUpload() {
  console.log("--- Server flow (private key Basic auth) ---");
  if (!PRIVATE_KEY) return "SKIP: IMAGEKIT_PRIVATE_KEY is empty";
  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), "diag-server.png");
  form.append("fileName", `diag-server-${Date.now()}.png`);
  form.append("useUniqueFileName", "true");
  form.append("folder", "news-posts");
  form.append("isPrivateFile", "false");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) return `FAILED (${res.status}): ${text.slice(0, 400)}`;
  const json = JSON.parse(text) as { fileId: string; url: string };
  console.log(`  OK -> ${json.url}`);
  return json.fileId;
}

async function cleanup(fileId: string) {
  if (!fileId || fileId.startsWith("SKIP") || fileId.startsWith("FAILED")) return;
  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${auth}` },
  });
}

async function main() {
  const a = await browserFlowUpload();
  console.log(`  result: ${String(a).slice(0, 200)}`);
  const b = await serverFlowUpload();
  console.log(`  result: ${String(b).slice(0, 200)}`);
  await cleanup(String(a));
  await cleanup(String(b));
  console.log("cleanup done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
