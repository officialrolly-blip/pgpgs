"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  createNewsPostAction,
  updateNewsPostAction,
  type NewsActionState,
} from "@/lib/actions/news-actions";
import { uploadNewsCover } from "@/lib/imagekit";

const inputClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15 disabled:bg-black/5";
const selectClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-a-muted";

export type NewsFormPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  authorName: string | null;
  published: boolean;
};

export default function NewsForm({ post }: { post?: NewsFormPost | null }) {
  const isEditing = Boolean(post);
  const action = isEditing ? updateNewsPostAction : createNewsPostAction;
  const [state, formAction, isPending] = useActionState<NewsActionState, FormData>(
    action,
    {},
  );

  const [coverUrl, setCoverUrl] = useState(post?.coverImageUrl ?? "");
  const [removeCover, setRemoveCover] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  async function handleCoverSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCoverError("Please choose an image file (PNG, JPG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("The cover image must be 5 MB or smaller.");
      return;
    }
    setCoverError("");
    setRemoveCover(false);
    setCoverUploading(true);
    try {
      const result = await uploadNewsCover(
        file,
        titleInputRef.current?.value || "news",
      );
      setCoverUrl(result.url);
    } catch (error) {
      setCoverError(
        error instanceof Error
          ? error.message
          : "Cover upload failed. Please try again.",
      );
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <form action={formAction} className="a-card max-w-2xl p-6">
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      {removeCover ? <input type="hidden" name="removeCover" value="on" /> : null}
      {coverUrl && !removeCover ? (
        <input type="hidden" name="coverUrl" value={coverUrl} />
      ) : null}

      {state.error ? (
        <p role="alert" className="rounded-xl border border-[#fecdca] bg-a-danger-soft px-4 py-3 text-sm font-medium text-a-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-[#a6f4c5] bg-a-success-soft px-4 py-3 text-sm font-medium text-a-success">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-5">
        <div>
          <label className={labelClass} htmlFor="news-title">
            Title <span className="text-a-danger">*</span>
          </label>
          <input
            id="news-title"
            name="title"
            ref={titleInputRef}
            required
            maxLength={160}
            defaultValue={post?.title ?? ""}
            placeholder="e.g. Feeding Program brings joy to Barangay Baybay"
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="news-slug">
              Web address (slug)
            </label>
            <input
              id="news-slug"
              name="slug"
              defaultValue={post?.slug ?? ""}
              placeholder="auto-generated from the title"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-a-muted">
              Leave blank to auto-generate from the title. Example:{" "}
              <code className="text-a-text">/news/feeding-program</code>
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor="news-category">
              Category <span className="text-a-danger">*</span>
            </label>
            <select id="news-category" name="category" defaultValue={post?.category ?? "News"} className={selectClass}>
              <option value="News">News</option>
              <option value="Announcement">Announcement</option>
              <option value="Community Service">Community Service</option>
              <option value="Chapter Story">Chapter Story</option>
              <option value="Fellowship">Fellowship</option>
              <option value="Events">Events</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="news-author">
            Author (optional)
          </label>
          <input
            id="news-author"
            name="authorName"
            maxLength={120}
            defaultValue={post?.authorName ?? ""}
            placeholder="e.g. Bro. Juan dela Cruz"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="news-summary">
            Summary <span className="text-a-danger">*</span>
          </label>
          <textarea
            id="news-summary"
            name="summary"
            required
            maxLength={400}
            rows={3}
            defaultValue={post?.summary ?? ""}
            placeholder="One or two sentences shown on the homepage and news cards."
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-a-muted">Up to 400 characters.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="news-body">
            Body <span className="text-a-danger">*</span>
          </label>
          <textarea
            id="news-body"
            name="body"
            required
            rows={12}
            defaultValue={post?.body ?? ""}
            placeholder={"Write the full story here.\n\nSeparate paragraphs with a blank line."}
            className={`${inputClass} font-mono text-[13px] leading-6`}
          />
          <p className="mt-1.5 text-xs text-a-muted">
            Separate paragraphs with a blank line. They become separate paragraphs on the
            public page.
          </p>
        </div>

        <div>
          <span className={labelClass}>Cover image (optional)</span>
          {coverUrl && !removeCover ? (
            <div className="mt-2 flex items-start gap-3">
              <Image
                src={coverUrl}
                alt="Cover preview"
                width={320}
                height={180}
                unoptimized
                className="h-28 w-48 rounded-lg border border-a-border object-cover"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={coverUploading}
                  onClick={() => coverInputRef.current?.click()}
                  className="a-btn a-btn-secondary a-btn-sm"
                >
                  Replace
                </button>
                <button
                  type="button"
                  disabled={coverUploading}
                  onClick={() => setRemoveCover(true)}
                  className="a-btn a-btn-secondary a-btn-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            disabled={coverUploading}
            className={
              coverUrl && !removeCover
                ? "hidden"
                : "mt-2 block text-sm text-a-muted file:mr-3 file:rounded-lg file:border-0 file:bg-a-brand-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-a-brand hover:file:bg-a-brand/10"
            }
          />
          {coverUploading ? (
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-a-brand">
              <span
                aria-hidden
                className="h-3 w-3 animate-spin rounded-full border-2 border-a-brand border-t-transparent"
              />
              Uploading cover to ImageKit…
            </p>
          ) : null}
          {coverError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-a-danger">
              {coverError}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-a-muted">
            PNG, JPG, or WebP, up to 5 MB. The image uploads to ImageKit as soon as you
            pick it.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post?.published ?? false}
            className="h-4 w-4 rounded border-a-border accent-a-brand"
          />
          <span className="text-sm font-medium text-a-text">
            Publish immediately (visible on the public site)
          </span>
        </label>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || coverUploading}
          className="a-btn a-btn-primary"
        >
          {coverUploading
            ? "Uploading cover…"
            : isPending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create post"}
        </button>
        {post ? (
          <Link href={`/news/${post.slug}`} className="a-btn a-btn-secondary" target="_blank" rel="noreferrer">
            View live post ↗
          </Link>
        ) : null}
      </div>
    </form>
  );
}