"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INTRO_MESSAGE =
  "Hey there! I'm Knyte, your friendly assistant for Pi Gamma Phi Gamma Sigma. I can help you learn about our brotherhood, answer questions about our history and values, or assist with verifying members. How can I help you today?";

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

  return (
    <>
      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-4 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-300 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        style={{ height: "min(600px, calc(100vh - 8rem))" }}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 bg-gradient-to-r from-[var(--green-dark)] to-[var(--green)] px-4 py-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 p-1">
              <Image src="/icon_chatbot.png" alt="Knyte" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--green)] bg-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Knyte</h3>
            <p className="text-xs text-white/70">PGPGS Assistant</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[var(--background)] px-4 py-4">
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--green)]/10">
                    <Image src="/icon_chatbot.png" alt="Knyte" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "rounded-br-md bg-[var(--green)] text-white"
                      : "rounded-bl-md bg-white text-[var(--foreground)] shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--green)]/10">
                  <Image src="/icon_chatbot.png" alt="Knyte" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                </div>
                                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--green)]/60 [animation-delay:300ms]" />
                  </div>
                </div>
                            </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
                            className="flex-1 rounded-full bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-black/30 outline-none transition focus:ring-2 focus:ring-[var(--green)]/20"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-white shadow-md transition hover:bg-[var(--green-dark)] disabled:opacity-40 disabled:hover:bg-[var(--green)]"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="fixed bottom-4 right-4 z-50">
        {/* Attention-craving text bubble */}
        {!isOpen && !hasOpened && (
          <div className="absolute bottom-20 right-0 animate-bounce">
            <div className="relative whitespace-nowrap rounded-xl bg-[var(--green)] px-4 py-2 text-sm font-medium text-white shadow-lg">
              👋 Hi! I'm Knyte, chat with me!
              <div className="absolute -bottom-2 right-6 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[var(--green)]" />
            </div>
          </div>
        )}
        
        {/* Attention pulse when closed */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--green)] opacity-40" />
            <span className="absolute inset-0 animate-pulse rounded-full bg-[var(--green)] opacity-20" />
          </>
        )}
        
        <button
          onClick={handleToggle}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] shadow-[0_8px_32px_rgba(27,92,56,0.4)] ring-4 ring-[var(--gold)]/40 transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_40px_rgba(27,92,56,0.5)] hover:ring-[var(--gold)]/60 ${
            isOpen ? "rotate-90 scale-90" : "animate-[wobble_2s_ease-in-out_infinite]"
          }`}
          aria-label={isOpen ? "Close Knyte chat" : "Open Knyte chat"}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <Image src="/icon_chatbot.png" alt="Knyte Chatbot" width={64} height={64} className="h-14 w-14 rounded-full object-cover" />
          )}
        </button>
      </div>

      {/* Notification dot */}
      {!isOpen && !hasOpened && (
        <span className="fixed bottom-16 right-4 z-50 h-5 w-5 animate-pulse rounded-full border-2 border-white bg-[var(--gold)] shadow-lg" />
      )}
    </>
  );
}



