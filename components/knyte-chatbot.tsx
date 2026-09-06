"use client";

import Image from "next/image";
import KnyteMarkdown from "@/components/knyte-markdown";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INTRO_MESSAGE =
  "Hey there! I'm Knyte, your friendly assistant and study buddy. I can help with PGPGS questions, assignments and homework (math, science, essays, and more), member lookups, and just about anything you need. What can I help you with today?";

const WIDGET_CHAT_KEY = "pgpgs_knyte_widget_chat";
const MAX_WIDGET_MESSAGES = 100;

export default function KnyteChatbot() {
    const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    }, [isOpen]);

  // Restore the previous conversation on mount so history survives reloads
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(WIDGET_CHAT_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        const stored = (parsed as { messages?: unknown }).messages;
        if (!Array.isArray(stored) || stored.length === 0) return;

        const restored: Message[] = [];
        for (const item of stored) {
          if (!item || typeof item !== "object") continue;
          const m = item as Record<string, unknown>;
          restored.push({
            id: typeof m.id === "string" ? m.id : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: m.role === "user" ? "user" : "assistant",
            content: typeof m.content === "string" ? m.content : "",
            timestamp: new Date(typeof m.timestamp === "string" ? m.timestamp : Date.now()),
          });
        }
        if (restored.length === 0) return;

        setMessages(restored);
        // Returning visitor — skip the first-time intro and attention ping
        setHasOpened(true);
      } catch {
        // Ignore malformed history
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist the conversation so it survives page reloads
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        WIDGET_CHAT_KEY,
        JSON.stringify({
          messages: messages.slice(-MAX_WIDGET_MESSAGES).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
        }),
      );
    } catch {
      // Storage unavailable or full
    }
  }, [messages]);

  const handleToggle = () => {
    if (!isOpen && !hasOpened) {
      setHasOpened(true);
      setMessages([
        {
          id: "intro",
          role: "assistant",
          content: INTRO_MESSAGE,
          timestamp: new Date(),
        },
      ]);
    }
    setIsOpen(!isOpen);
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

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
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
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
            setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    try {
      localStorage.removeItem(WIDGET_CHAT_KEY);
    } catch {
      // Ignore storage errors
    }
    setMessages([
      {
        id: "intro",
        role: "assistant",
        content: INTRO_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setHasOpened(true);
  };

  return (
    <>
      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-4 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_24px_70px_-12px_rgba(15,61,38,0.4)] transition-all duration-300 sm:right-6 ${
          isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-[0.97] opacity-0"
        }`}
        style={{ height: "min(600px, calc(100vh - 8rem))" }}
        role="dialog"
        aria-label="Knyte chat"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-[var(--green-dark)] to-[var(--green)] px-4 py-3.5">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              <Image src="/icon_chatbot.png" alt="Knyte" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--green)] bg-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Knyte</h3>
            <p className="text-xs text-white/70">AI Assistant & Study Buddy</p>
          </div>
          <button
            onClick={handleNewConversation}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Start a new conversation"
            title="New conversation"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {/* Gold hairline accent */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/70 to-transparent" />
        </div>

        {/* Messages */}
        <div className="knyte-scroll flex-1 overflow-y-auto bg-[var(--background)] px-4 py-4">
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`knyte-rise flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
                    <Image src="/icon_chatbot.png" alt="Knyte" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] text-white shadow-sm"
                      : "rounded-bl-md border border-black/5 bg-white text-[var(--foreground)] shadow-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <KnyteMarkdown content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="knyte-rise flex justify-start">
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
                  <Image src="/icon_chatbot.png" alt="Knyte" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-black/5 bg-white px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-black/5 bg-white px-3.5 pb-3 pt-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="h-10 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-black/30 focus:border-[var(--green)] focus:bg-white focus:ring-4 focus:ring-[var(--green)]/10"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-black/30">
            Powered by Knyte · PGPGS Roxas City
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-end gap-3 sm:bottom-6 sm:right-6">
        {/* One-time invite */}
        {!isOpen && !hasOpened && (
          <div className="knyte-rise mb-1.5 hidden whitespace-nowrap rounded-2xl rounded-br-sm border border-black/5 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-lg sm:block">
            Chat with Knyte — your AI study buddy
          </div>
        )}

        <div className="relative">
          {/* One-time attention ping (stops after 3 cycles) */}
          {!isOpen && !hasOpened && <span aria-hidden className="knyte-attention absolute inset-0 rounded-full" />}

          <button
            onClick={handleToggle}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] shadow-[0_10px_30px_-6px_rgba(15,61,38,0.55)] ring-1 ring-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label={isOpen ? "Close Knyte chat" : "Open Knyte chat"}
          >
            {isOpen ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <Image src="/icon_chatbot.png" alt="Knyte Chatbot" width={56} height={56} className="h-12 w-12 rounded-full object-cover" />
            )}
          </button>

          {/* Unread badge */}
          {!isOpen && !hasOpened && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[var(--gold)]" />
          )}
        </div>
      </div>
    </>
  );
}



