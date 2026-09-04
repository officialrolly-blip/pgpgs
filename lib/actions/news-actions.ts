"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadNewsCoverServer } from "@/lib/imagekit-server";

export type NewsActionState = { error?: string; success?: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_COVER_BYTES = 5 * 1024 * 1024;

const CATEGORIES = [
  "News",
  "Announcement",
  "Community Service",
  "Chapter Story",
  "Fellowship",
  "Events",
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function postId(formData: FormData): string {
  return String(formData.get("postId") ?? "").trim();
}

function requiredText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function slugFromForm(formData: FormData, title: string, existingSlug?: string) {
  const manual = requiredText(formData, "slug");
  if (manual) return slugify(manual) || slugify(title);
  return existingSlug && slugify(existingSlug) === slugify(title)
    ? existingSlug
    : slugify(title);
}

function revalidateNewsPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin/news");
  if (slug) revalidatePath(`/news/${slug}`);
}

function isUniqueSlugError(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const pgCode = cause?.code ?? (error as { code?: string })?.code ?? "";
  const combined = `${error instanceof Error ? error.message : ""} ${cause?.message ?? ""}`.toLowerCase();
  return pgCode === "23505" || combined.includes("unique") || combined.includes("duplicate");
}

/** Creates a news/blog post. If "published" is checked it goes live immediately. */
export async function createNewsPostAction(
  _previousState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  const admin = await requireAdmin();

  const title = requiredText(formData, "title");
  const category = requiredText(formData, "category") || "News";
  const summary = requiredText(formData, "summary");
  const body = requiredText(formData, "body");
  const authorName = requiredText(formData, "authorName");

  if (!title || !summary || !body) {
    return { error: "Title, summary, and body are required." };
  }
  if (title.length > 160) {
    return { error: "The title must be 160 characters or fewer." };
  }
  if (summary.length > 400) {
    return { error: "The summary must be 400 characters or fewer." };
  }
  if (!CATEGORIES.some((value) => value === category)) {
    return { error: "Please choose a valid category." };
  }

  let coverImageUrl: string | null = null;
  const coverUrl = requiredText(formData, "coverUrl");
  const cover = formData.get("cover");
  if (coverUrl) {
    if (!/^https?:\/\//i.test(coverUrl)) {
      return { error: "The cover image link is invalid. Please re-upload the image." };
    }
    coverImageUrl = coverUrl;
  } else if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) {
      return { error: "The cover image must be an image file." };
    }
    if (cover.size > MAX_COVER_BYTES) {
      return { error: "The cover image must be 5 MB or smaller." };
    }
    try {
      coverImageUrl = await uploadNewsCoverServer(cover, title);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Cover image upload failed.",
      };
    }
  }

  const published = formData.get("published") === "on";
  const now = new Date();
  const slug = slugFromForm(formData, title);
  if (!slug) {
    return { error: "Please provide a title so a web address can be created." };
  }

  try {
    await db.insert(newsPosts).values({
      title,
      slug,
      category,
      summary,
      body,
      coverImageUrl,
      authorName: authorName || null,
      published,
      publishedAt: published ? now : null,
      publishedBy: published ? admin.email : null,
    });
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "Another post already uses this web address (slug). Please change the title or slug.",
      };
    }
    console.error("News creation failed", error);
    return { error: "Unable to save the post right now. Please try again." };
  }

  revalidateNewsPaths(slug);
  return { success: published ? "Post published." : "Post saved as draft." };
}

/** Updates an existing news/blog post. */
export async function updateNewsPostAction(
  _previousState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  const admin = await requireAdmin();
  const id = postId(formData);
  if (!UUID_PATTERN.test(id)) {
    return { error: "Missing or invalid post reference." };
  }

  const [existing] = await db
    .select({ id: newsPosts.id, slug: newsPosts.slug, published: newsPosts.published })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);
  if (!existing) {
    return { error: "This post could not be found anymore." };
  }

  const title = requiredText(formData, "title");
  const category = requiredText(formData, "category") || "News";
  const summary = requiredText(formData, "summary");
  const body = requiredText(formData, "body");
  const authorName = requiredText(formData, "authorName");

  if (!title || !summary || !body) {
    return { error: "Title, summary, and body are required." };
  }
  if (title.length > 160) {
    return { error: "The title must be 160 characters or fewer." };
  }
  if (summary.length > 400) {
    return { error: "The summary must be 400 characters or fewer." };
  }
  if (!CATEGORIES.some((value) => value === category)) {
    return { error: "Please choose a valid category." };
  }

  let newCover: string | undefined;
  const coverUrl = requiredText(formData, "coverUrl");
  const cover = formData.get("cover");
  if (coverUrl) {
    if (!/^https?:\/\//i.test(coverUrl)) {
      return { error: "The cover image link is invalid. Please re-upload the image." };
    }
    newCover = coverUrl;
  } else if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) {
      return { error: "The cover image must be an image file." };
    }
    if (cover.size > MAX_COVER_BYTES) {
      return { error: "The cover image must be 5 MB or smaller." };
    }
    try {
      newCover = await uploadNewsCoverServer(cover, title);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Cover image upload failed.",
      };
    }
  }

  const removeCover = formData.get("removeCover") === "on";
  const oldSlug = existing.slug;
  const nextSlug = slugFromForm(formData, title, oldSlug);
  if (!nextSlug) {
    return { error: "Please provide a title so a web address can be created." };
  }

  const published = formData.get("published") === "on";
  const now = new Date();
  const shouldSetPublishedAt = published && !existing.published;
  const isUnpublishing = !published && existing.published;

  try {
    await db
      .update(newsPosts)
      .set({
        title,
        slug: nextSlug,
        category,
        summary,
        body,
        authorName: authorName || null,
        ...(newCover !== undefined
          ? { coverImageUrl: newCover }
          : removeCover
            ? { coverImageUrl: null }
            : {}),
        published,
        publishedAt: isUnpublishing ? null : shouldSetPublishedAt ? now : undefined,
        publishedBy: published ? admin.email : isUnpublishing ? null : undefined,
        updatedAt: now,
      })
      .where(eq(newsPosts.id, id));
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return {
        error: "Another post already uses this web address (slug). Please change it or the slug.",
      };
    }
    console.error("News update failed", error);
    return { error: "Unable to save the post right now. Please try again." };
  }

  revalidateNewsPaths(nextSlug);
  if (oldSlug !== nextSlug) revalidatePath(`/news/${oldSlug}`);
  return { success: published ? "Post published." : "Post saved as draft." };
}

/** Publishes a draft so it appears on the public site. */
export async function publishNewsPostAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = postId(formData);
  if (!UUID_PATTERN.test(id)) return;

  const [existing] = await db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);

  const now = new Date();
  await db
    .update(newsPosts)
    .set({ published: true, publishedAt: now, publishedBy: admin.email })
    .where(eq(newsPosts.id, id));
  revalidateNewsPaths(existing?.slug);
}

/** Sends a published post back to draft. */
export async function unpublishNewsPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = postId(formData);
  if (!UUID_PATTERN.test(id)) return;

  const [existing] = await db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);

  await db
    .update(newsPosts)
    .set({
      published: false,
      publishedAt: null,
      publishedBy: null,
    })
    .where(eq(newsPosts.id, id));
  revalidateNewsPaths(existing?.slug);
}

/** Permanently removes a news/blog post. */
export async function deleteNewsPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = postId(formData);
  if (!UUID_PATTERN.test(id)) return;

  const [existing] = await db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);

  await db.delete(newsPosts).where(eq(newsPosts.id, id));
  revalidateNewsPaths(existing?.slug);
}