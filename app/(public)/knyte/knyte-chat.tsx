"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant" as const,
  content:
    "Hello! I'm Knyte, your AI assistant for Pi Gamma Phi Gamma Sigma. I can help you with:\n\n• Learning about PGPGS history and traditions\n• Member verification and lookup\n• Information about officers and leadership\n• General questions about the brotherhood\n\nHow can I assist you today?",
  timestamp: new Date(),
};

export default function KnyteChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "default",
      title: "New Chat",
      messages: [INITIAL_MESSAGE],
      createdAt: new Date(),
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-300 overflow-hidden bg-gray-50 flex flex-col shrink-0 border-r border-gray-200`}
      >
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Chat History</p>
          {sessions.map((session) => (
            <div key={session.id} className={`group flex items-center rounded-lg mb-1 ${session.id === activeSessionId ? "bg-gray-200" : "hover:bg-gray-100"}`}>
              <button onClick={() => setActiveSessionId(session.id)} className="flex-1 flex items-center gap-3 px-3 py-3 text-sm text-gray-700 truncate text-left">
                <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="truncate">{session.title}</span>
              </button>
              <button onClick={() => deleteSession(session.id)} className="hidden group-hover:flex items-center justify-center p-2 mr-1 text-gray-500 hover:text-red-500 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600">
            <div className="h-8 w-8 rounded-full bg-[var(--green)] flex items-center justify-center">
              <Image src="/icon_chatbot.png" alt="Knyte" width={24} height={24} className="rounded-full" />
            </div>
            <div>
              <p className="text-gray-800 font-medium">Knyte</p>
              <p className="text-xs text-gray-500">PGPGS Assistant</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Image src="/icon_chatbot.png" alt="Knyte" width={28} height={28} className="rounded-full" />
            <span className="text-gray-800 font-semibold">Knyte</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">AI</span>
          </div>
          <a href="/" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Back to Home">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {activeSession?.messages?.map((message) => (
              <div key={message.id} className={`py-6 ${message.role === "user" ? "bg-gray-50" : "bg-white"}`}>
                <div className={`flex gap-4 px-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {message.role === "assistant" && (
                    <div className="shrink-0">
                      <div className="h-8 w-8 rounded-full bg-[var(--green)] flex items-center justify-center">
                        <Image src="/icon_chatbot.png" alt="Knyte" width={24} height={24} className="rounded-full" />
                      </div>
                    </div>
                  )}
                  {message.role === "user" && (
                    <div className="shrink-0">
                      <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">U</div>
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 ${message.role === "user" ? "text-right" : "text-left"}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-1">{message.role === "assistant" ? "Knyte" : "You"}</p>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "inline-block text-left bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]" : "text-gray-800"}`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="py-6 bg-white">
                <div className="flex gap-4 px-4 max-w-3xl mx-auto">
                  <div className="shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[var(--green)] flex items-center justify-center">
                      <Image src="/icon_chatbot.png" alt="Knyte" width={24} height={24} className="rounded-full" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Knyte</p>
                    <div className="flex items-center gap-1 py-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-white rounded-xl border border-gray-300 px-4 py-3 focus-within:border-[var(--green)] transition shadow-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Knyte..."
                rows={1}
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none resize-none text-sm"
                style={{ maxHeight: "120px" }}
                disabled={isTyping}
              />
              <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-2 rounded-lg bg-[var(--green)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--green-dark)] transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">Knyte can help with PGPGS history, member verification, and general questions about the brotherhood.</p>
          </div>
        </div>
      </div>
    </div>
  );
}