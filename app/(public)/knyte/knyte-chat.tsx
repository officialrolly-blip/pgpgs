"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import KnyteMarkdown from "@/components/knyte-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface VerifiedMember {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  chapter: string;
  photoUrl: string | null;
  hasPhoto: boolean;
}

// Component for displaying images with loading state
function MessageImage({ src, alt }: { src: string; alt: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative mt-2 overflow-hidden rounded-xl border border-black/5">
      {/* Loading skeleton */}
      {loading && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100">
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--green)] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Generating image...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex min-h-[200px] items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <svg className="mx-auto mb-2 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
      
      {/* Actual image */}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic AI-generated image URLs */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto transition-opacity duration-500 ${loading || error ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

// Parse markdown images from content
function parseContent(content: string): { text: string; imageUrl: string | null; imageAlt: string | null } {
  const imageMatch = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (imageMatch) {
    return {
      text: content.replace(imageMatch[0], "").trim(),
      imageUrl: imageMatch[2],
      imageAlt: imageMatch[1] || "Generated image",
    };
  }
  return { text: content, imageUrl: null, imageAlt: null };
}

const STORAGE_KEY = "pgpgs_chat_member";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(date: Date): string {
  try {
    return timeFormatter.format(date);
  } catch {
    return "";
  }
}

// ---- Chat history persistence (localStorage, per verified member) ----

const CHATS_KEY_PREFIX = "pgpgs_knyte_chats";
const MAX_STORED_SESSIONS = 50;
const MAX_STORED_MESSAGES = 200;

type StoredRecord = Record<string, unknown>;

function loadStoredChats(memberId: string): { sessions: ChatSession[]; activeSessionId: string } | null {
  try {
    const raw = localStorage.getItem(`${CHATS_KEY_PREFIX}:${memberId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as { activeSessionId?: unknown; sessions?: unknown };
    if (!Array.isArray(data.sessions)) return null;

    const sessions: ChatSession[] = [];
    for (const entry of data.sessions) {
      if (!entry || typeof entry !== "object") continue;
      const s = entry as StoredRecord;
      if (typeof s.id !== "string" || !Array.isArray(s.messages)) continue;

      const messages: Message[] = [];
      for (const item of s.messages) {
        if (!item || typeof item !== "object") continue;
        const m = item as StoredRecord;
        messages.push({
          id: typeof m.id === "string" ? m.id : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: m.role === "user" ? "user" : "assistant",
          content: typeof m.content === "string" ? m.content : "",
          timestamp: new Date(typeof m.timestamp === "string" ? m.timestamp : Date.now()),
        });
      }
      if (messages.length === 0) continue;

      sessions.push({
        id: s.id,
        title: typeof s.title === "string" && s.title.length > 0 ? s.title : "New Chat",
        createdAt: new Date(typeof s.createdAt === "string" ? s.createdAt : Date.now()),
        messages,
      });
    }

    if (sessions.length === 0) return null;

    const activeSessionId =
      typeof data.activeSessionId === "string" && sessions.some((s) => s.id === data.activeSessionId)
        ? data.activeSessionId
        : sessions[0].id;

    return { sessions, activeSessionId };
  } catch {
    // Malformed or unavailable history — start fresh
    return null;
  }
}

function saveChats(memberId: string, sessions: ChatSession[], activeSessionId: string): void {
  try {
    const payload = {
      activeSessionId,
      sessions: sessions.slice(0, MAX_STORED_SESSIONS).map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt.toISOString(),
        messages: s.messages.slice(-MAX_STORED_MESSAGES).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
      })),
    };
    localStorage.setItem(`${CHATS_KEY_PREFIX}:${memberId}`, JSON.stringify(payload));
  } catch {
    // Storage unavailable or full — history stays in memory for this visit
  }
}

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant" as const,
  content:
    "Hello! I'm Knyte, your AI assistant and study buddy for Pi Gamma Phi Gamma Sigma. I can help you with:\n\n• PGPGS history, members, officers, and news\n• Homework and assignments: math, science, essays, and more\n• Member verification and lookup\n• General questions about the brotherhood\n\nWhat do you need help with today?",
  timestamp: new Date(),
};

export default function KnyteChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Member verification state
  const [verifiedMember, setVerifiedMember] = useState<VerifiedMember | null>(null);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const memberIdRef = useRef<HTMLInputElement>(null);

  // Initialize chat sessions after verification
  const initializeChat = () => {
    setSessions([
      {
        id: "default",
        title: "New Chat",
        messages: [INITIAL_MESSAGE],
        createdAt: new Date(),
      },
    ]);
  };

  // Restore a verified session on mount (deferred so state updates
  // happen outside the synchronous effect body)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const member = JSON.parse(stored) as VerifiedMember;
          setVerifiedMember(member);
          const saved = loadStoredChats(member.memberId);
          if (saved) {
            setSessions(saved.sessions);
            setActiveSessionId(saved.activeSessionId);
          } else {
            initializeChat();
          }
        } catch {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Collapse the sidebar by default on smaller screens
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isTyping]);

  useEffect(() => {
    if (verifiedMember) {
      inputRef.current?.focus();
    } else {
      memberIdRef.current?.focus();
    }
  }, [activeSessionId, verifiedMember]);

  // Persist chat history for the verified member so it survives restarts
  useEffect(() => {
    if (!verifiedMember || sessions.length === 0) return;
    saveChats(verifiedMember.memberId, sessions, activeSessionId);
  }, [verifiedMember, sessions, activeSessionId]);

  const handleVerify = async () => {
    const trimmed = memberIdInput.trim();
    if (!trimmed) {
      setVerifyError("Please enter your PGPGS Member ID.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");

    try {
      const response = await fetch("/api/member-id/verify-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerifyError(data.error || "Verification failed. Please try again.");
        return;
      }

      // Store verified member and restore their saved chat history
      setVerifiedMember(data.member);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
      const saved = loadStoredChats(data.member.memberId);
      if (saved) {
        setSessions(saved.sessions);
        setActiveSessionId(saved.activeSessionId);
      } else {
        initializeChat();
      }
    } catch {
      setVerifyError("Connection error. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLogout = () => {
    setVerifiedMember(null);
    setMemberIdInput("");
    setVerifyError("");
    setSessions([]);
    sessionStorage.removeItem(STORAGE_KEY);
    setTimeout(() => memberIdRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (verifiedMember) {
        handleSend();
      } else {
        handleVerify();
      }
    }
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "New Chat",
      messages: [INITIAL_MESSAGE],
      createdAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) return;
    const remainingSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(remainingSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remainingSessions[0].id);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const isFirstMessage = activeSession.messages.length === 1;
    const newTitle = isFirstMessage
      ? trimmed.slice(0, 30) + (trimmed.length > 30 ? "..." : "")
      : activeSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMessage], title: newTitle }
          : s
      )
    );

    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...activeSession.messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: data.error,
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, errorMessage] }
              : s
          )
        );
      } else {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, assistantMessage] }
              : s
          )
        );
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // Show verification form if not verified
  if (!verifiedMember) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] p-4">
        {/* Soft brand glows */}
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--green)]/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_24px_70px_-24px_rgba(15,61,38,0.35)]">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--green-soft)] ring-1 ring-[var(--green)]/15">
                <Image
                  src="/icon_chatbot.png"
                  alt="Knyte"
                  width={96}
                  height={96}
                  priority
                  className="h-20 w-20 rounded-full object-cover"
                />
              </div>
              <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
                Welcome to Knyte AI
              </h1>
              <p className="text-sm text-gray-500">
                Pi Gamma Phi Gamma Sigma · AI Assistant
              </p>
            </div>

            {/* Verification Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="knyte-member-id" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  PGPGS Member ID
                </label>
                <input
                  ref={memberIdRef}
                  id="knyte-member-id"
                  type="text"
                  value={memberIdInput}
                  onChange={(e) => setMemberIdInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="PGPGS-XXXX-XXXX"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50/60 px-4 py-3 text-center font-mono text-sm uppercase tracking-widest text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--green)] focus:bg-white focus:ring-4 focus:ring-[var(--green)]/10"
                  disabled={verifyLoading}
                />
              </div>

              {verifyError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span>{verifyError}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={verifyLoading || !memberIdInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--green-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--green)]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifyLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>
            </div>

            {/* Info */}
            <div className="mt-7 border-t border-gray-100 pt-5">
              <div className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-gray-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  Only verified PGPGS members can access Knyte AI.
                  <br />
                  Your Member ID is found on your membership card.
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] font-medium uppercase tracking-widest text-gray-400/80">
            Pi Gamma Phi · Gamma Sigma · Roxas City
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } flex shrink-0 flex-col overflow-hidden bg-[var(--green-dark)] transition-[width] duration-300 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-2xl`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <Image src="/icon_chatbot.png" alt="Knyte" width={26} height={26} className="h-6 w-6 rounded-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Knyte</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">AI Assistant</p>
          </div>
        </div>

        {/* New chat */}
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 active:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        {/* History */}
        <div className="knyte-scroll flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Chat history</p>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group mb-0.5 flex items-center rounded-lg transition ${
                session.id === activeSessionId
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <button
                onClick={() => setActiveSessionId(session.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm"
              >
                <svg className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="truncate">{session.title}</span>
              </button>
              <button
                onClick={() => deleteSession(session.id)}
                aria-label="Delete chat"
                className="mr-1.5 hidden shrink-0 rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-red-300 group-hover:block"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Member footer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            {verifiedMember?.hasPhoto && verifiedMember?.photoUrl ? (
              <Image
                src={verifiedMember.photoUrl}
                alt={`${verifiedMember.firstName} ${verifiedMember.lastName}`}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/15"
                unoptimized
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] text-sm font-semibold text-white ring-2 ring-white/15">
                {verifiedMember?.firstName?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {verifiedMember?.firstName} {verifiedMember?.lastName}
              </p>
              <p className="truncate font-mono text-[11px] text-white/45">{verifiedMember?.memberId}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200/80 bg-white px-3 py-2.5 sm:px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M3 12h18M3 19.5h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--green)] ring-2 ring-[var(--green-soft)]">
              <Image src="/icon_chatbot.png" alt="Knyte" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">Knyte</p>
              <p className="hidden text-[10px] font-medium uppercase tracking-widest text-gray-400 sm:block">PGPGS AI Assistant</p>
            </div>
            <span className="rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--green-dark)]">AI</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 md:flex">
              {verifiedMember?.hasPhoto && verifiedMember?.photoUrl ? (
                <Image
                  src={verifiedMember.photoUrl}
                  alt={`${verifiedMember.firstName} ${verifiedMember.lastName}`}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] text-[10px] font-semibold text-white">
                  {verifiedMember?.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs font-medium text-gray-700">{verifiedMember?.firstName}</span>
            </div>
            <Link
              href="/"
              aria-label="Back to Home"
              title="Back to Home"
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
          </div>
        </header>

        <div className="knyte-scroll flex-1 overflow-y-auto bg-white">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {activeSession?.messages?.map((message) => {
              const isUser = message.role === "user";
              const { text, imageUrl, imageAlt } = parseContent(message.content);
              return (
                <div key={message.id} className={`knyte-rise flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className="shrink-0">
                    {isUser ? (
                      verifiedMember?.hasPhoto && verifiedMember?.photoUrl ? (
                        <Image
                          src={verifiedMember.photoUrl}
                          alt={`${verifiedMember.firstName} ${verifiedMember.lastName}`}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-[var(--green-soft)]"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] text-xs font-semibold text-white ring-2 ring-[var(--green-soft)]">
                          {verifiedMember?.firstName?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      )
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--green)] ring-2 ring-[var(--green-soft)]">
                        <Image src="/icon_chatbot.png" alt="Knyte" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex min-w-0 max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {isUser
                          ? verifiedMember
                            ? `${verifiedMember.firstName} ${verifiedMember.lastName}`
                            : "You"
                          : "Knyte"}
                      </span>
                      {message.id !== "welcome" && (
                        <span className="text-[11px] text-gray-400">{formatTime(message.timestamp)}</span>
                      )}
                    </div>

                    {text && isUser && (
                      <div className="whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[var(--green)] px-4 py-2.5 text-left text-sm leading-relaxed text-white shadow-sm">
                        {text}
                      </div>
                    )}
                    {text && !isUser && (
                      <div className="w-full text-left text-sm leading-relaxed text-gray-800">
                        <KnyteMarkdown content={text} />
                      </div>
                    )}
                    {imageUrl && (
                      <div className="w-full max-w-xs">
                        <MessageImage src={imageUrl} alt={imageAlt || "Generated image"} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="knyte-rise flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--green)] ring-2 ring-[var(--green-soft)]">
                  <Image src="/icon_chatbot.png" alt="Knyte" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="mb-1 text-xs font-semibold text-gray-700">Knyte</span>
                  <div className="flex items-center gap-1.5 rounded-full bg-[var(--green-soft)] px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/70 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/70 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/70 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200/80 bg-white px-4 pb-4 pt-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-[var(--green)] focus-within:ring-4 focus-within:ring-[var(--green)]/10">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Knyte..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                style={{ maxHeight: "120px" }}
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="rounded-xl bg-[var(--green)] p-2 text-white shadow-sm transition hover:bg-[var(--green-dark)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </button>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-gray-400">
              Knyte can help with PGPGS history, member lookups, and schoolwork — math, science, essays, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
