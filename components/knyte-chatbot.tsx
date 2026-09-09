"use client";

import Image from "next/image";
import Link from "next/link";
import KnyteMarkdown from "@/components/knyte-markdown";
import { useEffect, useRef, useState, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INTRO_MESSAGE =
  "Greetings! I am **Knyte**, the executive AI assistant for Pi Gamma Phi Gamma Sigma. I can assist you with brotherhood lore, member lookups, assignment solutions, essays, and campus navigation. How may I be of service?";

export default function KnyteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json") && response.body) {
        // Streaming answer — show the text as it arrives, token by token.
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamed = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          streamed += decoder.decode(value, { stream: true });
          const text = streamed;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: text } : m,
            ),
          );
        }

        if (!streamed.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content:
                      "I couldn't generate a response just now. Please try again.",
                  }
                : m,
            ),
          );
        }
      } else {
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
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting to the PGPGS neural core right now. Please try again in a moment.",
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

  return (
    <>
      {/* Floating Chat Modal */}
      <div
        className={`fixed bottom-24 right-4 z-50 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-[#e4ddcb] bg-white shadow-[0_24px_70px_rgba(27,92,56,0.18)] backdrop-blur-2xl transition-all duration-300 ${
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "pointer-events-none translate-y-6 opacity-0 scale-95"
        }`}
        style={{ height: "min(620px, calc(100vh - 8rem))" }}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-[#e4ddcb] bg-gradient-to-r from-[var(--green-dark)] via-[#155331] to-[var(--green)] px-4 py-3.5 shadow-sm">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gold)]/50 bg-white/10 shadow-sm">
              <Image
                src="/icon_chatbot.png"
                alt="Knyte"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
              />
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--green-dark)] bg-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-serif font-bold text-white tracking-wide">Knyte Intelligence</h3>
              <span className="rounded border border-[var(--gold)]/50 bg-[var(--gold)]/20 px-1 py-0.2 text-[9px] font-mono text-[var(--gold-light)] font-semibold">
                AI
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 truncate">PGPGS Sovereign Concierge</p>
          </div>

          <div className="flex items-center gap-1">
            {/* Full Screen Link */}
            <Link
              href="/knyte"
              title="Open full-screen consultation suite"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-100/80 hover:bg-white/10 hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </Link>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-100/80 hover:bg-white/10 hover:text-white transition"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto bg-[#f6f3ea] px-4 py-4 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--gold)]/40 bg-white shadow-2xs">
                      <Image
                        src="/icon_chatbot.png"
                        alt="Knyte"
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      !isAssistant
                        ? "rounded-br-sm border border-[#1b5c38]/40 bg-gradient-to-br from-[#1b5c38] to-[#124227] text-white shadow-md"
                        : "rounded-bl-sm border border-[#e4ddcc] bg-white text-gray-900 shadow-2xs"
                    }`}
                  >
                    {isAssistant ? (
                      <KnyteMarkdown content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--gold)]/40 bg-white shadow-2xs">
                  <Image
                    src="/icon_chatbot.png"
                    alt="Knyte"
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded object-cover"
                  />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-[#e4ddcc] bg-white px-4 py-2.5 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--green)] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-[#e4ddcc] bg-white p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#d6ccb7] bg-[#faf8f2] px-3.5 py-2 shadow-inner focus-within:border-[var(--gold)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--gold)]/20">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Knyte anything..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--green)] to-[var(--green-dark)] text-white shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          </div>
          
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-mono text-gray-400">
            <span>PGPGS Neural Assistant</span>
            <Link href="/knyte" className="text-[var(--green)] hover:text-[var(--green-dark)] font-semibold hover:underline">
              Open Full Suite ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Launcher Button */}
      <div className="fixed bottom-5 right-5 z-50">
        {/* Luxury Callout Bubble when closed */}
        {!isOpen && !hasOpened && (
          <div className="absolute bottom-20 right-0 animate-bounce">
            <div className="relative whitespace-nowrap rounded-2xl border border-[#ded5c2] bg-white px-4 py-2 text-xs font-semibold text-[var(--green-dark)] shadow-[0_8px_30px_rgba(27,92,56,0.18)]">
              <span className="mr-1.5 text-sm">✨</span> PGPGS AI Concierge · Chat with Knyte
              <div className="absolute -bottom-2 right-6 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
            </div>
          </div>
        )}

        {/* Ambient Ring Pulse */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)]/20" />
            <span className="absolute inset-0 animate-pulse rounded-full bg-[var(--gold)]/20" />
          </>
        )}

        <button
          onClick={handleToggle}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--gold)] bg-gradient-to-br from-[var(--green)] via-[#155331] to-[var(--green-dark)] shadow-[0_8px_32px_rgba(27,92,56,0.35),0_0_20px_rgba(201,162,39,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(27,92,56,0.45)] ${
            isOpen ? "rotate-90 scale-95" : ""
          }`}
          aria-label={isOpen ? "Close Knyte consultation" : "Open Knyte consultation"}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              <Image
                src="/icon_chatbot.png"
                alt="Knyte Chatbot"
                width={48}
                height={48}
                className="h-11 w-11 rounded-full object-cover shadow-inner"
              />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[var(--green-dark)] bg-emerald-400" />
            </div>
          )}
        </button>
      </div>

      {/* Notification Dot */}
      {!isOpen && !hasOpened && (
        <span className="fixed bottom-16 right-5 z-50 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-[var(--gold)] shadow-md" />
      )}
    </>
  );
}
