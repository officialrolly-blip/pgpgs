"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
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

const STORAGE_KEY = "pgpgs_chat_member";

const INITIAL_CONTENT =
  "Greetings, Gamma Sigma Brother. I am **Knyte**, the executive AI assistant and academic study companion for **Pi Gamma Phi Gamma Sigma**.\n\nI am equipped to assist you with:\n\n• **Fraternity Knowledge**: Heritage, chapters, active leadership, and fraternal traditions\n• **Member Verification**: Instant lookup of registered brothers and credentials\n• **Academic Excellence**: Step-by-step solutions for STEM, calculus, chemistry, essays, and thesis development\n• **Executive Drafting**: Speeches, fraternal correspondence, and formal memoranda\n\nSelect a recommended inquiry below or state your request to begin.";

const SUGGESTED_PROMPTS = [
  {
    title: "Fraternal Principles & Creed",
    category: "Heritage",
    icon: "🏛️",
    prompt: "Elaborate on the founding history and core principles of PGPGS: Lux, Bonitas, and Unitas.",
  },
  {
    title: "Verify Brother Standing",
    category: "Directory",
    icon: "🛡️",
    prompt: "How can I verify a brother's standing, chapter assignment, and officer credentials?",
  },
  {
    title: "STEM & Academic Solving",
    category: "Academic",
    icon: "📐",
    prompt: "Help me solve a complex step-by-step calculus problem and explain the underlying theorems.",
  },
  {
    title: "Executive Essay Drafting",
    category: "Writing",
    icon: "🖋️",
    prompt: "Provide an executive structure and thesis outline for an academic paper on organizational leadership.",
  },
];

// Helper functions declared outside component to adhere to React purity rules
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createUserMessage(content: string): Message {
  return {
    id: generateId("user"),
    role: "user",
    content,
    timestamp: new Date(),
  };
}

function createAssistantMessage(content: string): Message {
  return {
    id: generateId("assistant"),
    role: "assistant",
    content,
    timestamp: new Date(),
  };
}

function createErrorMessage(content: string): Message {
  return {
    id: generateId("error"),
    role: "assistant",
    content,
    timestamp: new Date(),
  };
}

function createInitialSession(): ChatSession {
  return {
    id: "default",
    title: "Executive Consultation",
    messages: [
      {
        id: "welcome",
        role: "assistant",
        content: INITIAL_CONTENT,
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
  };
}

// Component for displaying images with luxury loading and error state
function MessageImage({ src, alt }: { src: string; alt: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#e3dccb] bg-[#faf8f2] shadow-md">
      {/* Loading skeleton */}
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-r from-[#faf8f2] via-[#efe9da] to-[#faf8f2] p-8">
          <div className="relative mb-3 flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--gold)]/30" />
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--green-dark)] font-semibold">
            Rendering Visual Asset...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex min-h-[220px] flex-col items-center justify-center bg-[#faf8f2] p-6 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">Failed to render visual asset</p>
          <p className="mt-1 text-xs text-gray-500">The generated image URL has expired or is unavailable.</p>
        </div>
      )}

      {/* Actual image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full max-w-xl h-auto object-cover transition-opacity duration-700 ${loading || error ? "opacity-0" : "opacity-100"}`}
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

export default function KnyteChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => [createInitialSession()]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedChat, setCopiedChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Member verification state
  const [verifiedMember, setVerifiedMember] = useState<VerifiedMember | null>(null);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const memberIdRef = useRef<HTMLInputElement>(null);

  // Check for existing session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const member = JSON.parse(stored) as VerifiedMember;
        queueMicrotask(() => {
          setVerifiedMember(member);
        });
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (verifiedMember) {
      inputRef.current?.focus();
    } else {
      memberIdRef.current?.focus();
    }
  }, [activeSessionId, verifiedMember]);

  const handleVerify = useCallback(async () => {
    const trimmed = memberIdInput.trim();
    if (!trimmed) {
      setVerifyError("Please enter your official PGPGS Member ID.");
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
        setVerifyError(data.error || "Authentication failed. Please verify your ID.");
        return;
      }

      // Store verified member
      setVerifiedMember(data.member);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
      setSessions([createInitialSession()]);
    } catch {
      setVerifyError("Unable to establish secure connection. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  }, [memberIdInput]);

  const handleLogout = useCallback(() => {
    setVerifiedMember(null);
    setMemberIdInput("");
    setVerifyError("");
    setSessions([createInitialSession()]);
    sessionStorage.removeItem(STORAGE_KEY);
    setTimeout(() => memberIdRef.current?.focus(), 100);
  }, []);

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId("session"),
      title: "New Consultation",
      messages: [
        {
          id: generateId("welcome"),
          role: "assistant",
          content: INITIAL_CONTENT,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const deleteSession = useCallback((sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions((prev) => {
      if (prev.length <= 1) {
        return [createInitialSession()];
      }
      return prev.filter((s) => s.id !== sessionId);
    });
  }, []);

  const clearCurrentSession = useCallback(() => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: "Executive Consultation",
              messages: [
                {
                  id: generateId("welcome"),
                  role: "assistant",
                  content: INITIAL_CONTENT,
                  timestamp: new Date(),
                },
              ],
            }
          : s,
      ),
    );
  }, [activeSessionId]);

  const copyMessageText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const copyFullConversation = useCallback(async () => {
    if (!activeSession) return;
    const formatted = activeSession.messages
      .map(
        (m) =>
          `[${m.role === "assistant" ? "KNYTE AI" : verifiedMember ? `${verifiedMember.firstName} ${verifiedMember.lastName}` : "MEMBER"}]:\n${m.content}\n`,
      )
      .join("\n---\n\n");
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedChat(true);
      setTimeout(() => setCopiedChat(false), 2000);
    } catch {
      // fallback
    }
  }, [activeSession, verifiedMember]);

  const handleSendPrompt = useCallback(
    async (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed || isTyping) return;

      const userMessage = createUserMessage(trimmed);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;
          const isFirst = s.messages.length <= 1;
          const newTitle = isFirst
            ? trimmed.slice(0, 32) + (trimmed.length > 32 ? "..." : "")
            : s.title;
          return { ...s, messages: [...s.messages, userMessage], title: newTitle };
        }),
      );

      setInput("");
      setIsTyping(true);

      try {
        const currentMessages =
          sessions.find((s) => s.id === activeSessionId)?.messages ?? [];
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...currentMessages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await response.json();

        if (data.error) {
          const errorMessage = createErrorMessage(data.error);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, errorMessage] }
                : s,
            ),
          );
        } else {
          const assistantMessage = createAssistantMessage(data.response);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: [...s.messages, assistantMessage] }
                : s,
            ),
          );
        }
      } catch {
        const errorMessage = createErrorMessage(
          "I encountered a temporary connection issue while querying the knowledge core. Please try again in a moment.",
        );
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, errorMessage] }
              : s,
          ),
        );
      } finally {
        setIsTyping(false);
      }
    },
    [activeSessionId, isTyping, sessions],
  );

  const handleSend = useCallback(() => {
    handleSendPrompt(input);
  }, [handleSendPrompt, input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (verifiedMember) {
          handleSend();
        } else {
          handleVerify();
        }
      }
    },
    [handleSend, handleVerify, verifiedMember],
  );

  // --------------------------------------------------------------------------
  // 1. VIP Verification Gate ("Milky White & Royal Green")
  // --------------------------------------------------------------------------
  if (!verifiedMember) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f6f3ea] p-4 sm:p-6 text-gray-900">
        {/* Soft royal green and warm gold ambient glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-[var(--green)]/10 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-[400px] w-[400px] rounded-full bg-[var(--gold)]/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1b5c38_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative z-10 w-full max-w-lg">
          {/* Porcelain Card */}
          <div className="overflow-hidden rounded-3xl border border-[#e5decb] bg-white/95 p-8 sm:p-10 shadow-[0_24px_70px_rgba(27,92,56,0.08),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
            
            {/* Header Badge & Insignia */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.25em] text-[#5e4912] shadow-sm mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                Sovereign Fraternal Gateway
              </div>

              {/* Crest / Logo */}
              <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--gold)]/30 via-[var(--green)]/20 to-[var(--gold)]/30 blur-md animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--gold)] bg-[#faf7f0] shadow-md">
                  <Image
                    src="/icon_chatbot.png"
                    alt="Knyte Intelligence"
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                    priority
                  />
                </div>
              </div>

              <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--green-dark)] sm:text-4xl">
                Knyte <span className="text-[var(--gold)]">Intelligence</span>
              </h1>
              <p className="mt-2 text-sm text-gray-500 font-light">
                Pi Gamma Phi Gamma Sigma · Restricted Member Concierge
              </p>
            </div>

            {/* Input Form */}
            <div className="mt-8 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <label className="text-[var(--green-dark)] font-semibold tracking-wide uppercase font-mono text-[11px]">
                    Fraternal Member ID
                  </label>
                  <Link
                    href="/member-id"
                    className="text-[var(--green)] hover:text-[var(--green-dark)] font-medium transition underline underline-offset-4 decoration-[var(--green)]/30 hover:decoration-[var(--green)] text-[11px]"
                  >
                    Lookup Member ID →
                  </Link>
                </div>
                
                <div className="relative flex items-center">
                  <input
                    ref={memberIdRef}
                    type="text"
                    value={memberIdInput}
                    onChange={(e) => setMemberIdInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="PGPGS-XXXX-XXXX"
                    className="w-full rounded-2xl border border-[#d8d0bd] bg-[#fbf9f5] px-5 py-4 text-center font-mono text-base sm:text-lg font-bold uppercase tracking-widest text-[#153f28] placeholder-gray-400 shadow-inner outline-none transition-all focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/20"
                    disabled={verifyLoading}
                    autoComplete="off"
                  />
                  {memberIdInput && !verifyLoading && (
                    <button
                      onClick={() => setMemberIdInput("")}
                      className="absolute right-4 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {verifyError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 shadow-sm">
                  <svg className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{verifyError}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={verifyLoading || !memberIdInput.trim()}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--green)] via-[#155331] to-[var(--green-dark)] px-6 py-4 font-semibold text-white shadow-[0_6px_25px_rgba(27,92,56,0.28)] transition-all hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(27,92,56,0.4)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {verifyLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-mono text-sm uppercase tracking-wider">Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide">Authorize & Enter Suite</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Security & Heritage Footer */}
            <div className="mt-8 border-t border-[#ede7d8] pt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                <svg className="h-3.5 w-3.5 text-[var(--gold)]" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.5 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08z" clipRule="evenodd" />
                </svg>
                Cryptographically Guarded · PGPGS Roxas City
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Exclusive access reserved for verified Gamma Sigma brothers and sorority sisters.
              </p>
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--green)] hover:text-[var(--green-dark)] font-medium transition"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Return to PGPGS Public Portal
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. Executive Main Interface (Milky White & Royal Green Workspace)
  // --------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f3ea] text-[#1c241f] font-sans antialiased">
      
      {/* -------------------------------------------------------------------- */}
      {/* SIDEBAR: Milky Porcelain & Royal Emerald Navigation */}
      {/* -------------------------------------------------------------------- */}
      <aside
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } relative z-30 flex flex-col shrink-0 overflow-hidden border-r border-[#e4ddcc] bg-[#fbf9f4] transition-all duration-300 ease-in-out`}
      >
        {/* Brand Header */}
        <div className="border-b border-[#e4ddcc] p-4 bg-[#f8f5ee]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/50 bg-white shadow-sm">
                <Image
                  src="/icon_chatbot.png"
                  alt="Knyte"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-lg object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-bold tracking-tight text-[var(--green-dark)]">KNYTE</span>
                  <span className="rounded border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#634e12]">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--green)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  <span>Neural Engine v2.5</span>
                </div>
              </div>
            </div>

            <Link
              href="/"
              title="Return to Website"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dcd3bf] bg-white text-gray-600 hover:border-[var(--green)] hover:text-[var(--green-dark)] transition shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
          </div>

          {/* New Consultation Button */}
          <button
            onClick={createNewChat}
            className="group mt-4 flex w-full items-center justify-between rounded-xl border border-[#d6ccb7] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--green-dark)] shadow-sm transition-all hover:border-[var(--gold)] hover:bg-[#faf7f0] hover:shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--green)]/10 text-[var(--green)] group-hover:bg-[var(--green)] group-hover:text-white transition">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <span>New Consultation</span>
            </div>
            <span className="font-mono text-[10px] text-gray-400 font-normal">⌘N</span>
          </button>
        </div>

        {/* Sessions History List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#6d7971]">
            Consultation Archive
          </div>

          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group relative flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all ${
                  isActive
                    ? "border-l-2 border-[var(--gold)] bg-white text-[var(--green-dark)] font-semibold shadow-sm"
                    : "border-l-2 border-transparent text-gray-700 hover:bg-[#ede7d8] hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[var(--gold)]" : "text-gray-400"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="truncate">{session.title}</span>
                </div>

                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  title="Archive / Remove Session"
                  className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Verified Member Profile & Sign-Out (At bottom of sidebar) */}
        <div className="border-t border-[#e4ddcc] bg-[#f8f5ee] p-3.5">
          <div className="flex items-center gap-3 rounded-2xl border border-[#ded5c2] bg-white p-2.5 shadow-sm">
            <div className="relative shrink-0">
              {verifiedMember.hasPhoto && verifiedMember.photoUrl ? (
                <Image
                  src={verifiedMember.photoUrl}
                  alt={`${verifiedMember.firstName} ${verifiedMember.lastName}`}
                  width={38}
                  height={38}
                  className="h-9 w-9 rounded-full border border-[var(--gold)]/80 object-cover shadow-sm"
                  unoptimized
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)]/80 bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] font-serif text-sm font-bold text-white shadow-sm">
                  {verifiedMember.firstName?.[0] || "Γ"}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-gray-900">
                Bro. {verifiedMember.firstName} {verifiedMember.lastName}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--gold)] font-medium truncate">
                <span>{verifiedMember.memberId}</span>
              </div>
              <p className="truncate text-[10px] text-gray-500">
                {verifiedMember.chapter || "PGPGS Active"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out / Switch Member ID"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e0d8c6] text-gray-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN WORKSPACE COLUMN */}
      {/* -------------------------------------------------------------------- */}
      <div className="relative flex flex-1 flex-col min-w-0 bg-[#f6f3ea] overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute top-0 left-1/3 h-72 w-96 rounded-full bg-[var(--green)]/5 blur-[120px]" />
        <div className="pointer-events-none absolute top-10 right-10 h-64 w-64 rounded-full bg-[var(--gold)]/10 blur-[100px]" />

        {/* Top Executive Navigation Bar */}
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#e4ddcc] bg-white/90 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ded5c2] text-gray-700 hover:border-[var(--green)] hover:bg-[#faf7f0] transition shadow-2xs"
              aria-label="Toggle consultation archive"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--green-dark)] tracking-wide truncate max-w-[200px] sm:max-w-xs">
                {activeSession?.title || "Executive Consultation"}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#634e12]">
                PGPGS Knowledge Core
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear Messages */}
            <button
              onClick={clearCurrentSession}
              title="Reset current conversation"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[#ded5c2] bg-white px-3 text-xs text-gray-700 hover:border-[var(--green)] hover:bg-[#faf7f0] hover:text-[var(--green-dark)] transition shadow-2xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Copy Full Chat */}
            <button
              onClick={copyFullConversation}
              title="Copy entire consultation transcript"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[#ded5c2] bg-white px-3 text-xs text-gray-700 hover:border-[var(--gold)] hover:bg-[#faf7f0] hover:text-gray-900 transition shadow-2xs"
            >
              {copiedChat ? (
                <>
                  <svg className="h-3.5 w-3.5 text-[var(--green)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[var(--green-dark)] font-semibold">Transcript Copied!</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                </>
              )}
            </button>

            {/* ID Card shortcut */}
            <Link
              href="/member-id"
              title="View Digital Member Card"
              className="hidden md:flex h-9 items-center gap-1.5 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-3 text-xs font-semibold text-[#5e4912] hover:bg-[var(--gold)]/25 transition shadow-2xs"
            >
              <span>ID Card</span>
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* MESSAGES STREAM */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar">
          <div className="mx-auto max-w-4xl space-y-6">

            {/* If first message only: Show Executive Concierge Hero Cards */}
            {activeSession?.messages?.length <= 1 && (
              <div className="my-6 rounded-3xl border border-[#e4ddcb] bg-white/95 p-6 sm:p-8 backdrop-blur-md shadow-[0_12px_40px_rgba(27,92,56,0.06)] text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--gold)]/50 bg-[#faf7f0] shadow-sm">
                  <Image
                    src="/icon_chatbot.png"
                    alt="Knyte AI"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--green-dark)]">
                  Welcome, Brother <span className="text-[var(--gold)]">{verifiedMember.lastName}</span>
                </h3>
                                <p className="mt-2 text-sm text-gray-600 max-w-lg mx-auto">
                  Your dedicated fraternal intelligence advisor and academic study companion. Fluent in English, Filipino, and Hiligaynon. Select a specialized module below to initiate:
                </p>

                {/* 4 Interactive Recommendation Cards */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
                  {SUGGESTED_PROMPTS.map((card, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendPrompt(card.prompt)}
                      disabled={isTyping}
                      className="group flex flex-col justify-between rounded-2xl border border-[#e5dfcd] bg-[#fbf9f5] p-4 transition-all hover:border-[var(--gold)] hover:bg-white hover:shadow-md active:scale-[0.99]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{card.icon}</span>
                          <span className="rounded-full border border-[var(--green)]/20 bg-[var(--green-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--green-dark)] font-semibold">
                            {card.category}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-gray-900 group-hover:text-[var(--green)] transition">
                          {card.title}
                        </h4>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {card.prompt}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[var(--green)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Activate inquiry</span>
                        <span>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {activeSession?.messages?.map((message) => {
              const isAssistant = message.role === "assistant";
              const { text, imageUrl, imageAlt } = parseContent(message.content);

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 sm:gap-4 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* Assistant Avatar */}
                  {isAssistant && (
                    <div className="relative mt-1 shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--gold)]/50 bg-white shadow-sm">
                        <Image
                          src="/icon_chatbot.png"
                          alt="Knyte"
                          width={26}
                          height={26}
                          className="h-6 w-6 rounded-md object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`min-w-0 max-w-[92%] sm:max-w-[82%] ${
                      isAssistant ? "text-left" : "text-right"
                    }`}
                  >
                    {/* Role Header & Timestamp */}
                    <div
                      className={`mb-1.5 flex items-center gap-2 text-[11px] font-mono ${
                        isAssistant ? "justify-start text-gray-500" : "justify-end text-gray-500"
                      }`}
                    >
                      {isAssistant ? (
                        <>
                          <span className="font-bold text-[var(--green-dark)]">Knyte AI</span>
                          <span className="rounded border border-[var(--gold)]/40 bg-[var(--gold)]/15 px-1.5 py-0.2 text-[9px] text-[#634e12] font-semibold">
                            VERIFIED
                          </span>
                        </>
                      ) : (
                        <span className="font-medium text-gray-700">
                          {verifiedMember
                            ? `Bro. ${verifiedMember.firstName} ${verifiedMember.lastName}`
                            : "You"}
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Content Box */}
                    {isAssistant ? (
                      <div className="group relative rounded-2xl rounded-tl-sm border border-[#e4dcce] bg-white p-4 sm:p-5 text-sm text-gray-900 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
                        {text && <KnyteMarkdown content={text} />}
                        {imageUrl && <MessageImage src={imageUrl} alt={imageAlt || "Generated visual"} />}

                        {/* Message Toolbar on hover */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#ede7da] pt-2 text-xs">
                          <span className="text-[10px] font-mono text-gray-400">
                            PGPGS Neural Response
                          </span>
                          <button
                            onClick={() => copyMessageText(message.id, text)}
                            className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-[var(--green)] transition"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <svg className="h-3.5 w-3.5 text-[var(--green)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-[var(--green)] font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-block text-left rounded-2xl rounded-tr-sm border border-[#1b5c38]/40 bg-gradient-to-br from-[#1b5c38] via-[#165231] to-[#0f3d26] px-4 py-3 text-sm text-white shadow-[0_4px_18px_rgba(27,92,56,0.22)]">
                        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                        {imageUrl && <MessageImage src={imageUrl} alt={imageAlt || "User visual"} />}
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {!isAssistant && (
                    <div className="relative mt-1 shrink-0">
                      {verifiedMember.hasPhoto && verifiedMember.photoUrl ? (
                        <Image
                          src={verifiedMember.photoUrl}
                          alt="You"
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full border border-[var(--gold)]/80 object-cover shadow-sm"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gold)]/80 bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] font-serif text-sm font-bold text-white shadow-sm">
                          {verifiedMember.firstName?.[0] || "U"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/50 bg-white shadow-sm">
                  <Image
                    src="/icon_chatbot.png"
                    alt="Knyte"
                    width={26}
                    height={26}
                    className="h-6 w-6 rounded-md object-cover"
                  />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-[#e4dcce] bg-white px-5 py-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: "160ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: "320ms" }} />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-gray-600 font-semibold">
                      Knyte is formulating response...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* EXECUTIVE FLOATING INPUT CONSOLE */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative z-20 shrink-0 border-t border-[#e4ddcc] bg-[#f8f5ee]/95 p-3 sm:p-5 backdrop-blur-2xl">
          <div className="mx-auto max-w-4xl">
            
            {/* Quick Action Suggestion Chips */}
            <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-gray-700 scrollbar-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 shrink-0">
                Quick Inquiries:
              </span>
              <button
                onClick={() => handleSendPrompt("What are the core duties and positions of Roxas City Chapter officers?")}
                disabled={isTyping}
                className="shrink-0 rounded-full border border-[#ded5c2] bg-white px-3 py-1 text-[11px] font-medium text-gray-700 hover:border-[var(--green)] hover:text-[var(--green-dark)] hover:shadow-2xs transition"
              >
                🏛️ Chapter Officers
              </button>
              <button
                onClick={() => handleSendPrompt("Help me solve an academic homework assignment step by step.")}
                disabled={isTyping}
                className="shrink-0 rounded-full border border-[#ded5c2] bg-white px-3 py-1 text-[11px] font-medium text-gray-700 hover:border-[var(--green)] hover:text-[var(--green-dark)] hover:shadow-2xs transition"
              >
                📐 Assignment Solver
              </button>
              <button
                onClick={() => handleSendPrompt("What are the founding dates and SEC registration of PGPGS?")}
                disabled={isTyping}
                className="shrink-0 rounded-full border border-[#ded5c2] bg-white px-3 py-1 text-[11px] font-medium text-gray-700 hover:border-[var(--green)] hover:text-[var(--green-dark)] hover:shadow-2xs transition"
              >
                📜 SEC & Founding Lore
              </button>
              <button
                onClick={() => handleSendPrompt("Generate a detailed study schedule and outline for upcoming examinations.")}
                disabled={isTyping}
                className="shrink-0 rounded-full border border-[#ded5c2] bg-white px-3 py-1 text-[11px] font-medium text-gray-700 hover:border-[var(--green)] hover:text-[var(--green-dark)] hover:shadow-2xs transition"
              >
                🎓 Exam Study Plan
              </button>
            </div>

            {/* Input Container */}
            <div className="relative flex items-end gap-2 rounded-2xl border border-[#d6ccb7] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all focus-within:border-[var(--gold)] focus-within:ring-2 focus-within:ring-[var(--gold)]/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Knyte anything about PGPGS, academics, homework, or brother verification..."
                rows={1}
                className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400 outline-none resize-none leading-relaxed"
                style={{ maxHeight: "140px" }}
                disabled={isTyping}
              />

              <div className="flex items-center gap-1.5 pb-0.5">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  aria-label="Send Consultation Message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1b5c38] via-[#165030] to-[var(--green-dark)] text-white shadow-[0_4px_16px_rgba(27,92,56,0.25)] transition-all hover:scale-105 hover:shadow-[0_6px_22px_rgba(27,92,56,0.35)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Sub-footnote */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 font-mono">
              <span>Press ↵ Enter to transmit · Shift + Enter for new line</span>
              <span className="hidden sm:inline">PGPGS Sovereign AI · Encrypted Session</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
