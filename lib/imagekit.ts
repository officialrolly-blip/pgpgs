// Client-side helpers for uploading member photos to ImageKit.
// Uses ImageKit's direct-to-upload endpoint with the public key, so no
// private key ever reaches the browser.

export const IMAGEKIT_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";
export const IMAGEKIT_URL_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

export type ImageKitUploadResult = {
  fileId: string;
  name: string;
  size: number;
  filePath: string;
  url: string; // `url` is the CDN URL of the uploaded image
  fileType: string;
};

/**
 * Uploads an image file directly from the browser to ImageKit.
 * Returns the CDN url of the uploaded asset.
 */
export async function uploadMemberPhoto(
  file: File,
  memberName: string,
): Promise<ImageKitUploadResult> {
  if (!IMAGEKIT_PUBLIC_KEY) {
    throw new Error(
      "Image upload is not configured. Please set NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY.",
    );
  }

  const safeName = (memberName || "member")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const fileName = `${safeName}-${Date.now()}.jpg`;
  const authResponse = await fetch("/api/imagekit-auth");
  if (!authResponse.ok) {
    const result = (await authResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error ?? "Image upload authentication failed.");
  }
  const auth = (await authResponse.json()) as {
    token: string;
    expire: number;
    signature: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  formData.append("token", auth.token);
  formData.append("expire", String(auth.expire));
  formData.append("signature", auth.signature);
  formData.append("useUniqueFileName", "true");
  formData.append("folderName", "pgpmembers");
  formData.append("isPrivateFile", "false");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photo upload failed (${response.status}): ${text}`);
  }

  const result = (await response.json()) as ImageKitUploadResult;
  return result;
}

/** Builds an ImageKit URL with transformations for a fixed square crop. */
export function avatarFromUrl(
  url: string,
  width = 320,
  height = 320,
): string {
  const base = url.startsWith("http") ? url : `${IMAGEKIT_URL_ENDPOINT}${url}`;
  return `${base}?tr=w-${width},h-${height},c-at_max`;
}