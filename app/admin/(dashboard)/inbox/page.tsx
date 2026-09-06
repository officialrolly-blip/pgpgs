import type { Metadata } from "next";
import { Fragment } from "react";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import {
  deleteMessageAction,
  markMessageReadAction,
  markMessageUnreadAction,
} from "@/lib/actions/contact-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Inbox" };

const STATUSES = ["unread", "read", "all"] as const;
const PAGE_SIZE = 20;
type Status = (typeof STATUSES)[number];

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status: Status = STATUSES.includes(params.status as Status)
    ? (params.status as Status)
    : "unread";
  const requestedPage = Math.max(1, Number(params.page ?? "1") || 1);

  const conditions = [];
  if (status !== "all") conditions.push(eq(contactMessages.status, status));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(contactMessages.name, pattern),
        ilike(contactMessages.email, pattern),
        ilike(contactMessages.subject, pattern),
        ilike(contactMessages.message, pattern),
      ),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRows, statusRows] = await Promise.all([
    db.select({ value: count() }).from(contactMessages).where(where),
    db
      .select({ status: contactMessages.status, value: count() })
      .from(contactMessages)
      .groupBy(contactMessages.status),
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const messages = await db
    .select()
    .from(contactMessages)
    .where(where)
    .orderBy(desc(contactMessages.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const statusCounts = Object.fromEntries(
    statusRows.map((row) => [row.status, Number(row.value)]),
  );
  const buildHref = (nextStatus = status, nextPage = 1) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextStatus !== "unread") query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    const queryString = query.toString();
    return queryString ? `/admin/inbox?${queryString}` : "/admin/inbox";
  };

  return (
    <>
      <PageHeading
        title="Inbox"
        description="Messages and queries sent through the contact form on the public website."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Inbox overview">
        {(["unread", "read", "all"] as const).map((value) => (
          <a
            key={value}
            href={buildHref(value)}
            className={`a-card a-card-hover p-4 capitalize ${status === value ? "border-a-brand ring-2 ring-a-brand/15" : ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-a-muted">{value}</p>
            <p className="mt-1 text-2xl font-bold text-a-text">
              {value === "all"
                ? (statusCounts.unread ?? 0) + (statusCounts.read ?? 0)
                : (statusCounts[value] ?? 0)}
            </p>
          </a>
        ))}
      </section>

      <form action="/admin/inbox" method="get" className="mb-5 flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, subject, or message…"
          aria-label="Search messages"
          className="a-input"
        />
        <button type="submit" className="a-btn a-btn-secondary shrink-0">Search</button>
      </form>

      {messages.length === 0 ? (
        <div className="a-card p-12 text-center">
          <p className="text-sm text-a-muted">
            {q
              ? `No messages match “${q}”.`
              : status === "unread"
                ? "No unread messages — the inbox is all caught up."
                : "No messages yet."}
          </p>
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="a-tr border-b border-a-border text-xs uppercase tracking-wide text-a-muted">
                <th className="a-th">From</th>
                <th className="a-th">Contact</th>
                <th className="a-th">Received</th>
                <th className="a-th">Status</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <Fragment key={message.id}>
                  <tr className={`a-tr align-top ${message.status === "unread" ? "bg-a-brand-soft/40" : ""}`}>
                    <td className="a-td">
                      <p className={`text-a-text ${message.status === "unread" ? "font-semibold" : "font-medium"}`}>
                        {message.name}
                      </p>
                      <p className="mt-0.5 text-xs text-a-muted">{message.email}</p>
                    </td>
                    <td className="a-td text-a-secondary">
                      {message.contactNumber ?? <span className="text-a-muted">—</span>}
                    </td>
                    <td className="a-td text-a-muted">
                      <time dateTime={message.createdAt.toISOString()}>
                        {formatDateTime(message.createdAt)}
                      </time>
                    </td>
                    <td className="a-td">
                      <span className={`a-badge ${message.status === "unread" ? "a-badge-amber" : "a-badge-gray"}`}>
                        {message.status}
                      </span>
                    </td>
                    <td className="a-td text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {message.status === "unread" ? (
                          <form action={markMessageReadAction}>
                            <input type="hidden" name="messageId" value={message.id} />
                            <button type="submit" className="a-btn a-btn-secondary a-btn-sm">
                              Mark read
                            </button>
                          </form>
                        ) : (
                          <form action={markMessageUnreadAction}>
                            <input type="hidden" name="messageId" value={message.id} />
                            <button type="submit" className="a-btn a-btn-secondary a-btn-sm">
                              Mark unread
                            </button>
                          </form>
                        )}
                        <form action={deleteMessageAction} className="inline-block">
                          <input type="hidden" name="messageId" value={message.id} />
                          <ConfirmSubmitButton
                            message={`Permanently delete the message from ${message.name}?`}
                            className="a-btn a-btn-danger a-btn-sm"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-[var(--a-bg)]">
                    <td colSpan={5} className="a-td !border-b-0 px-5 py-0">
                      <details className="group border-t border-transparent open:border-a-border-soft">
                        <summary className="cursor-pointer list-none py-3 text-xs font-semibold text-a-brand marker:content-none transition hover:text-a-brand-dark">
                          <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
                          {message.subject ? `Subject: ${message.subject}` : "View full message"}
                        </summary>
                        <div className="border-t border-a-border-soft pb-5 pt-4">
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-a-secondary">
                            {message.message}
                          </p>
                        </div>
                      </details>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Inbox pagination">
          {currentPage > 1 ? (
            <a href={buildHref(status, currentPage - 1)} className="a-btn a-btn-secondary a-btn-sm">
              ← Previous
            </a>
          ) : (
            <span />
          )}
          <p className="text-xs text-a-muted">
            Page {currentPage} of {totalPages} · {total} {total === 1 ? "message" : "messages"}
          </p>
          {currentPage < totalPages ? (
            <a href={buildHref(status, currentPage + 1)} className="a-btn a-btn-secondary a-btn-sm">
              Next →
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function formatDateTime(date: Date) {
  return `${date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`;
}