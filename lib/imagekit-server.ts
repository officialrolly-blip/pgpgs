// Server-side ImageKit upload used by admin server actions.
// Authenticates with the private key over HTTP Basic auth (server-to-server),
// mirroring the browser flow in lib/imagekit.ts but without exposing the key.
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? "";

type ImageKitServerUploadResult = { url?: string };

export function isImageUploadConfigured(): boolean {
  return Boolean(PRIVATE_KEY) && !PRIVATE_KEY.startsWith("your_");
}

export async function uploadChapterLogoServer(
  file: File,
  chapterName: string,
): Promise<string> {
  if (!isImageUploadConfigured()) {
    throw new Error(
      "Image upload is not configured. Please set IMAGEKIT_PRIVATE_KEY in .env.local.",
    );
  }

  const safeName = (chapterName || "chapter")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${safeName}-logo-${Date.now()}.${extension}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("useUniqueFileName", "true");
  formData.append("folder", "chapter-logos");
  formData.append("isPrivateFile", "false");

  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Logo upload failed (${response.status}): ${text}`);
  }

  const result = (await response.json()) as ImageKitServerUploadResult;
  if (!result.url) throw new Error("Logo upload did not return a URL.");
  return result.url;
}

export async function uploadNewsCoverServer(
  file: File,
  title: string,
): Promise<string> {
  if (!isImageUploadConfigured()) {
    throw new Error(
      "Image upload is not configured. Please set IMAGEKIT_PRIVATE_KEY in .env.local.",
    );
  }

  const safeName = (title || "news")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${safeName}-cover-${Date.now()}.${extension}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("useUniqueFileName", "true");
  formData.append("folder", "news-posts");
  formData.append("isPrivateFile", "false");

  const auth = Buffer.from(`${PRIVATE_KEY}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cover image upload failed (${response.status}): ${text}`);
  }

  const result = (await response.json()) as ImageKitServerUploadResult;
  if (!result.url) throw new Error("Cover image upload did not return a URL.");
  return result.url;
}