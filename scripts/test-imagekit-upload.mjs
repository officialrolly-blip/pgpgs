// Standalone diagnostic: simulates the app's browser upload flow vs the server
// flow, to see exactly which form fields ImageKit accepts and where files land.
// Usage:  set -a && source .env.local && set +a && node scripts/test-imagekit-upload.mjs
import { createHmac, randomBytes } from "node:crypto";

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";
const ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";
const LIST_URL = "https://api.imagekit.io/v1/files?limit=8&sort=createdDate_DESC";

if (!PRIVATE_KEY || PRIVATE_KEY.startsWith("your_") || !PUBLIC_KEY) {
  console.error("Missing/placeholder IMAGEKIT_PRIVATE_KEY or NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY.");
  process.exit(1);
}

// 1x1 transparent PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function printResult(label, res, body) {
  console.log(`\n=== ${label} → HTTP ${res.status}`);
  try {
    const j = JSON.parse(body);
    console.log(
      JSON.stringify(
        { filePath: j.filePath, url: j.url, fileId: j.fileId, message: j.message, help: j.help },
        null,
        2,
      ),
    );
  } catch {
    console.log(body.slice(0, 400));
  }
}

// Exactly the fields lib/imagekit.ts currently sends (folderName + auth params)
async function browserFlow(folderField) {
  const token = randomBytes(16).toString("hex");
  const expire = Math.floor(Date.now() / 1000) + 600;
  const signature = createHmac("sha1", PRIVATE_KEY).update(token + expire).digest("hex");
  const stamp = Date.now();
  const name = `diag-${folderField}-${stamp}.png`;
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), name);
  fd.append("fileName", name);
  fd.append("publicKey", PUBLIC_KEY);
  fd.append("token", token);
  fd.append("expire", String(expire));
  fd.append("signature", signature);
  fd.append("useUniqueFileName", "true");
  fd.append(folderField, "news-posts");
  fd.append("isPrivateFile", "false");
  const res = await fetch(ENDPOINT, { method: "POST", body: fd });
  printResult(`Browser flow (field "${folderField}" → news-posts)`, res, await res.text());
}

// What lib/imagekit-server.ts sends (Basic auth + folder param)
async function serverFlow() {
  const name = `diag-server-${Date.now()}.png`;
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), name);
  fd.append("fileName", name);
  fd.append("useUniqueFileName", "true");
  fd.append("folder", "/news-posts");
  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: fd,
  });
  printResult('Server flow (Basic auth, folder "/news-posts")', res, await res.text());
}

// Where did the last uploads actually land?
async function listRecent() {
  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  const res = await fetch(LIST_URL, { headers: { Authorization: `Basic ${auth}` } });
  const body = await res.text();
  console.log(`\n=== 8 most recent files in the ImageKit account → HTTP ${res.status}`);
  try {
    const j = JSON.parse(body);
    for (const f of j) console.log(`- ${f.filePath}  (type: ${f.type})`);
    if (Array.isArray(j) && j.length === 0) console.log("(no files found at all)");
  } catch {
    console.log(body.slice(0, 400));
  }
}

await browserFlow("folderName"); // what the app sends today
await browserFlow("folder"); // candidate fix
await serverFlow();
await listRecent();
