"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export type ContactFormState = { error?: string; success?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function messageId(formData: FormData): string {
  return String(formData.get("messageId") ?? "").trim();
}

function revalidateInbox() {
  revalidatePath("/admin/inbox");
}

/** Public: stores a query sent through the "Get in touch" contact form. */
export async function submitContactMessageAction(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: a hidden field real users never fill in. If a bot fills it,
  // return a success-looking message without storing anything.
  if (requiredText(formData, "website")) {
    return { success: "Thank you! Your message has been sent to the chapter." };
  }

  const name = requiredText(formData, "name");
  const email = requiredText(formData, "email");
  const contactNumber = requiredText(formData, "contactNumber");
  const subject = requiredText(formData, "subject");
  const message = requiredText(formData, "message");

  if (!name || !email || !message) {
    return { error: "Please fill in your name, email, and message." };
  }
  if (name.length > 120) {
    return { error: "Your name must be 120 characters or fewer." };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Please enter a valid email address so we can reply to you." };
  }
  if (contactNumber && (contactNumber.length > 30 || !/^[0-9+\-() ]+$/.test(contactNumber))) {
    return { error: "Please enter a valid contact number (or leave it blank)." };
  }
  if (subject.length > 150) {
    return { error: "The subject must be 150 characters or fewer." };
  }
  if (message.length > 4000) {
    return { error: "Your message must be 4000 characters or fewer." };
  }

  try {
    await db.insert(contactMessages).values({
      name,
      email: email.toLowerCase(),
      contactNumber: contactNumber || null,
      subject: subject || null,
      message,
    });
  } catch (error) {
    console.error("Contact message submission failed", error);
    return {
      error: "Unable to send your message right now. Please try again in a moment.",
    };
  }

  revalidateInbox();
  return {
    success: "Thank you! Your message has been sent to the chapter. We'll get back to you soon.",
  };
}

/** Admin: marks a message as read. */
export async function markMessageReadAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = messageId(formData);
  if (!UUID_PATTERN.test(id)) return;

  await db
    .update(contactMessages)
    .set({ status: "read", readAt: new Date(), readBy: admin.email })
    .where(eq(contactMessages.id, id));
  revalidateInbox();
}

/** Admin: sends a message back to unread. */
export async function markMessageUnreadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = messageId(formData);
  if (!UUID_PATTERN.test(id)) return;

  await db
    .update(contactMessages)
    .set({ status: "unread", readAt: null, readBy: null })
    .where(eq(contactMessages.id, id));
  revalidateInbox();
}

/** Admin: permanently removes a message. */
export async function deleteMessageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = messageId(formData);
  if (!UUID_PATTERN.test(id)) return;

  await db.delete(contactMessages).where(eq(contactMessages.id, id));
  revalidateInbox();
}