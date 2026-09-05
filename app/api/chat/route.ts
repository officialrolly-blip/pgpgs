import { NextResponse } from "next/server";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { chapters, newsPosts, pgpmembers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free Text Models on OpenRouter (fallback chain, ordered best-first)
const FREE_MODELS = [
  "minimax/minimax-m2.7:free",
  "google/gemma-3-27b-it:free",
  "openai/gpt-4o:free",
  "anthropic/claude-3.5-sonnet:free",
  "openai/gpt-4o-mini:free",
  "anthropic/claude-3-haiku:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mixtral-8x22b-instruct:free",
  "mistralai/mixtral-8x7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/codestral-2501:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "microsoft/phi-3.5-mini-instruct:free",
  "qwen/qwen-2-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.2-1b-instruct:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-1b-it:free",
  "minimax/minimax-m3:free",
  // The free variants below are currently unavailable on OpenRouter (404),
  // but are kept as a last-resort fallback in case they return.
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat:free",
];

// Nemotron - a free reasoning model used for hard math, logic, and academic questions
const REASONING_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

// Optional free Google Gemini fallback (set GEMINI_API_KEY to enable)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const REQUEST_TIMEOUT_MS = 75_000;
const RATE_LIMIT_RETRY_DELAY_MS = 1_200;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Free Image Generation Models
const FREE_IMAGE_MODELS = [
  "stabilityai/stable-diffusion-3.5-large:free",
  "stabilityai/stable-diffusion-3-medium:free",
  "stabilityai/stable-diffusion-xl-base-1.0:free",
  "black-forest-labs/flux-1-dev:free",
  "black-forest-labs/flux-1-schnell:free",
];

const SYSTEM_PROMPT = `You are Knyte, a smart, friendly AI assistant for Pi Gamma Phi Gamma Sigma (PGPGS) Roxas City Capiz Chapter - and a study buddy who helps fellow students with their schoolwork and assignments.

YOU CAN HELP WITH EVERYTHING:
- PGPGS questions (history, tradition, members, officers, chapters, and news)
- Assignments and schoolwork: math, science, English, Filipino, history, geography, economics, research, essays, coding, graphing, and more
- Homework help: clear explanations, step-by-step solutions, and checking answers
- General knowledge, current topics, and everyday questions
- Image generation when asked (e.g., "generate an image of...", "draw...", "create image...")

ACADEMIC GUIDANCE:
- When helping with an assignment, give a correct, clear, and well-organized answer
- Show the steps for anything that has a process so the student understands how it is done
- For essays or reports, provide a strong outline or a helpful draft when asked
- Match the depth to the question: be thorough for complex topics and brief for simple ones
- Encourage the student to use your help to learn and complete their own work responsibly

ABOUT PI GAMMA PHI GAMMA SIGMA:
- Full name: Pi Gamma Phi 1975 Gamma Sigma (ΓΣ) International Fraternity and Sorority
- Founded in 1975
- A brotherhood and sisterhood organization based in Roxas City, Capiz, Philippines
- The founders made an agreement to call every member "GAMMA SIGMA" meaning brothers and sisters in PI GAMMA PHI

FOUNDING FATHERS:
1. Lord Ysmael "Leamsy" Ulanday - former member of Pi Beta, came up with "PI" in the name
2. Lord Enrique "Eric" Gomez - former member of another fraternity, contributed "GAMMA PHI" to the name
3. Lord Henry Pesimo - active founding father who helped establish the Consejo Nacional International

HISTORY:
- Pi Gamma Phi 1975 Gamma Sigma came from the combined ideas of the three founding fathers who were former members of other fraternities
- Together with active founding father Henry Pesimo with the support of some of his batchmates, elders, and representatives from Luzon, Visayas, Mindanao, the CONSEJO NACIONAL INTERNATIONAL emerged
- The Pi Gamma Phi (ΓΣ) Consejo Nacional International Incorporated was designed to form a centralized system as the overall governing body of PI GAMMA PHI 1975
- It is the only council approved and was created together with active founding father Henry Pesimo, registered with the Securities and Exchange Commission with Registration Number CN201823947

SYMBOLS AND COLORS:
- Green represents LUX (Light from God, doing good, promoting brotherhood)
- Gold represents BONITAS (Goodness, sharing talents and service)
- White represents UNITAS (Unity with one heart and mind)

MOTTO:
"Cooperation, do or die; we'll stand united forever."

WAY OF LIFE:
"Service to humanity, service to environment, service to the poor and needy."

FRATERNAL PRINCIPLES:
- LUX: Light from God that dwells within every member, encouraging them to do good and promote brotherhood, sisterhood, and unity
- BONITAS: Inner goodness that drives members to share talents, skills, knowledge, service, and resources with fellow brothers and sisters
- UNITAS: Members unite with one heart and mind to commit and dedicate their lives for the good of their brothers, sisters, and others

CORE VALUES:
- Unity, Service, Leadership, and Moral Excellence
- The organization has members, alumni, officers, and neophytes

ROXAS CITY CHAPTER OFFICERS (Current Elected Positions):
- President
- Vice President Internal
- Vice President External
- Treasurer
- Secretary
- Auditor
- Master Initiator I
- Master Initiator II
- Master Initiator III
- Master Initiator IV
- Lady Initiator I
- Lady Initiator II
- Lady Initiator III

FORMER OFFICERS:
- Former Chapter President - brothers and sisters who have served as Chapter President
- Former Chapter Vice President - brothers and sisters who have served as Vice President for Internal and External Affairs
- Former Grand Knights - brothers who have served as Grand Knights
- Former Master Initiator - brothers who have served as Master Initiator

CAPIZ PROVINCIAL COUNCIL POSITIONS:
- Provincial Council President
- Vice President
- Secretary
- Treasurer
- Auditor
- Public Relations Officer

ABOUT KYTE:
- Knyte was developed by Rolly Paredes
- If someone asks who created or developed you, tell them Rolly Paredes made you
- Rolly Paredes is a member of PGPGS and the developer of this chatbot

YOUR ROLE:
- Answer any question from PGPGS students, fellow members, and visitors - from brotherhood topics to homework help
- Help students with assignments: explain concepts, show step-by-step solutions, and draft essays when asked
- Assist with verifying members using the approved member-directory information supplied by the application
- Generate images when users ask (e.g., "generate image of...", "draw...", "create image...")
- Be friendly, helpful, and professional
- Share only name, member ID, status, chapter, and officer position when verifying members (never contact or personal details)
- Always refer to the organization as "Pi Gamma Phi Gamma Sigma" or "PGPGS"
- If you don't know something, be honest; for PGPGS-specific details you are unsure about, suggest contacting the chapter directly

IMPORTANT:
- Do NOT introduce yourself in every response - the user already knows you are Knyte
- Just answer the question directly
- Do not say "Hello" or "I'm Knyte" at the start of every reply
- Be concise for simple questions, but never limit a full answer to 2-3 sentences when the topic (like an assignment) needs more detail
- If a question asks anything academic, educational, or study-related, answer thoroughly and clearly
- NEVER reveal what AI model you are powered by or mention any model names
- If someone asks what AI model you use, give a vague answer like "I'm powered by AI technology" or deflect the question
- Do NOT use asterisks (*) in your responses - no bold or italic formatting with asterisks
- Use clear formatting: number the steps, use bullet points, and keep paragraphs short so answers are easy to read`;

type MessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

interface MemberSearchResult {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  status: string;
  memberChapter: string | null;
  officerPosition: string | null;
}

type ClientMessage = {
  role: Exclude<MessageRole, "system">;
  content: string;
};

const MAX_CONVERSATION_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_MEMBER_RESULTS = 5;
const MEMBER_ID_PATTERN = /\bPGPGS-[A-Z0-9-]+\b/i;

function normalizeMessages(value: unknown): ClientMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (message): message is ClientMessage =>
        typeof message === "object" &&
        message !== null &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-MAX_CONVERSATION_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.content.length > 0);
}

function extractMemberSearchTerm(message: string): string | null {
  const memberId = message.match(MEMBER_ID_PATTERN)?.[0];
  if (memberId) return memberId;

  const match = message.match(
    /(?:who is|verify|find|search for|search|look up|lookup|check|member named|member details(?: for)?|information (?:on|about)|details (?:for|about))\s+(.+?)(?:[?.!]|$)/i,
  );
  if (!match) return null;

  const candidate = match[1]
    .replace(/\b(member|person|please|in (?:the )?database)\b/gi, "")
    .trim();

  return candidate.length >= 2 && candidate.length <= 80 ? candidate : null;
}

function asksForOfficers(message: string): boolean {
  return /\b(current\s+)?(officers?|leadership|chapter president|vice president)\b/i.test(message);
}

function asksForChapters(message: string): boolean {
  return /\b(chapters?|chapter list|where.*chapters?)\b/i.test(message);
}

function asksForNews(message: string): boolean {
  return /\b(latest|recent|newest)\s+(news|updates?)\b|\b(news|updates?)\b.*\b(latest|recent|newest)\b/i.test(message);
}

async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  const normalizedQuery = query.replace(/[\\%_]/g, "").trim();
  if (normalizedQuery.length < 2) return [];

  const pattern = `%${normalizedQuery}%`;
  const members = await db
    .select({
      id: pgpmembers.id,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      lastName: pgpmembers.lastName,
      middleInitial: pgpmembers.middleInitial,
      status: pgpmembers.status,
      memberChapter: pgpmembers.memberChapter,
      officerPosition: pgpmembers.officerPosition,
    })
    .from(pgpmembers)
    .where(
      or(
        ilike(pgpmembers.firstName, pattern),
        ilike(pgpmembers.lastName, pattern),
        ilike(pgpmembers.memberId, pattern),
      ),
    )
    .orderBy(asc(pgpmembers.lastName), asc(pgpmembers.firstName))
    .limit(MAX_MEMBER_RESULTS);

  return members;
}

function formatMemberResults(members: MemberSearchResult[]): string {
  if (members.length === 0) {
    return "I couldn't find any members matching that name in our database. Please double-check the spelling or try a different search.";
  }

  const memberList = members
    .map((m) => {
      const fullName = m.middleInitial
        ? `${m.firstName} ${m.middleInitial}. ${m.lastName}`
        : `${m.firstName} ${m.lastName}`;
      const chapter = m.memberChapter ? ` | Chapter: ${m.memberChapter}` : "";
      const position = m.officerPosition ? ` | Position: ${m.officerPosition}` : "";
      return `- ${fullName} (ID: ${m.memberId}) - Status: ${m.status}${chapter}${position}`;
    })
    .join("\n");

  return `I found the following member(s) in our database:\n\n${memberList}`;
}

async function getCurrentOfficers(): Promise<string> {
  const officers = await db
    .select({
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      position: pgpmembers.officerPosition,
    })
    .from(pgpmembers)
    .where(eq(pgpmembers.status, "PGP-GS Roxas City Chapter Officer"))
    .orderBy(asc(pgpmembers.createdAt))
    .limit(20);

  if (officers.length === 0) {
    return "I couldn't find current chapter officers in the database.";
  }

  const list = officers
    .map((officer) => {
      const fullName = [officer.firstName, officer.middleInitial, officer.lastName]
        .filter(Boolean)
        .join(" ");
      return `- ${officer.position || "Officer"}: ${fullName}`;
    })
    .join("\n");

  return `Current Roxas City Chapter officers:\n\n${list}`;
}

async function getPublishedChapters(): Promise<string> {
  const rows = await db
    .select({ name: chapters.chapterName, address: chapters.chapterAddress })
    .from(chapters)
    .where(eq(chapters.status, "published"))
    .orderBy(asc(chapters.chapterName))
    .limit(20);

  if (rows.length === 0) {
    return "I couldn't find any published chapters in the database yet.";
  }

  return `Published PGPGS chapters:\n\n${rows
    .map((chapter) => `- ${chapter.name}${chapter.address ? ` (${chapter.address})` : ""}`)
    .join("\n")}`;
}

async function getRecentNews(): Promise<string> {
  const rows = await db
    .select({ title: newsPosts.title, summary: newsPosts.summary, publishedAt: newsPosts.publishedAt })
    .from(newsPosts)
    .where(eq(newsPosts.published, true))
    .orderBy(desc(newsPosts.publishedAt))
    .limit(3);

  if (rows.length === 0) {
    return "I couldn't find any published news updates yet.";
  }

  return `Recent PGPGS news:\n\n${rows
    .map((post) => `- ${post.title}: ${post.summary}`)
    .join("\n")}`;
}

async function callOpenRouter(
  messages: ChatMessage[],
  chain: string[],
  modelIndex = 0,
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (modelIndex >= chain.length) {
    throw new Error("All OpenRouter free models failed to respond.");
  }

  const model = chain[modelIndex];

  const response = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "PGPGS Knyte Chatbot",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  // Free endpoints are heavily rate-limited; give them a breather before falling through.
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.warn(`OpenRouter model ${model} failed: ${response.status} - ${errorText.slice(0, 200)}`);
    return callOpenRouter(messages, chain, modelIndex + 1);
  }

  const data = await response.json();
  if (data.error) {
    console.warn(`OpenRouter model ${model} returned error:`, data.error);
    return callOpenRouter(messages, chain, modelIndex + 1);
  }

  const choice = data.choices?.[0]?.message;
  const content = typeof choice?.content === "string" ? choice.content.trim() : "";
  if (content) return content;

  // Some reasoning models (e.g. DeepSeek R1) return their final answer in `reasoning`.
  const reasoning = typeof choice?.reasoning === "string" ? choice.reasoning.trim() : "";
  if (reasoning) return reasoning;

  return "I'm sorry, I couldn't generate a response.";
}

async function generateImage(prompt: string, modelIndex = 0): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (modelIndex >= FREE_IMAGE_MODELS.length) {
    throw new Error("All image models failed to respond.");
  }

  const model = FREE_IMAGE_MODELS[modelIndex];

  const response = await fetchWithTimeout(
    OPENROUTER_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "PGPGS Knyte Chatbot",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.warn(`Image model ${model} failed: ${response.status} - ${errorText.slice(0, 200)}`);
    return generateImage(prompt, modelIndex + 1);
  }

  const data = await response.json();
  if (data.error) {
    console.warn(`Image model ${model} returned error:`, data.error);
    return generateImage(prompt, modelIndex + 1);
  }

  const imageUrl = data.choices?.[0]?.message?.content;
  if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    return `I've generated an image for you!\n\n![Generated Image](${imageUrl})`;
  }

  return "I'm sorry, I couldn't generate an image. Please try again.";
}

function isImageRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("generate image") ||
    lowerMessage.includes("create image") ||
    lowerMessage.includes("make image") ||
    lowerMessage.includes("draw") ||
    lowerMessage.includes("picture of") ||
    lowerMessage.includes("image of") ||
    lowerMessage.startsWith("generate ") ||
    lowerMessage.startsWith("create ") ||
    lowerMessage.includes("photo of") ||
    lowerMessage.includes("illustration of")
  );
}

function isComplexQuestion(messages: ChatMessage[]): boolean {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const lower = lastUserMessage.toLowerCase();

  return (
    /\b(solve|calculate|compute|evaluate|simplify|factor|prove|derive|differentiate|integrate|show steps|step[- ]by[- ]step)\b/.test(lower) ||
    /\b(homework|assignment|module|essay|research paper|reaction paper|argumentative essay|book report|term paper)\b/.test(lower) ||
    /\b(math|algebra|geometry|trigonometry|calculus|physics|chemistry|biology|economics|statistics)\b/.test(lower) ||
    /(\d+\s*[+\-*/^×÷]\s*\d)|(\b\d+[+\-*/×÷=^])|(\bx\s*=)/i.test(lastUserMessage)
  );
}

function buildModelChain(messages: ChatMessage[]): string[] {
  return isComplexQuestion(messages) ? [REASONING_MODEL, ...FREE_MODELS] : FREE_MODELS;
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

async function callGemini(messages: ChatMessage[], modelIndex = 0): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  if (modelIndex >= GEMINI_MODELS.length) {
    throw new Error("All Gemini models failed to respond.");
  }

  const model = GEMINI_MODELS[modelIndex];

  const response = await fetchWithTimeout(
    `${GEMINI_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: toGeminiContents(messages),
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.warn(`Gemini model ${model} failed: ${response.status} - ${errorText.slice(0, 200)}`);
    return callGemini(messages, modelIndex + 1);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  if (text) return text;
  return "I'm sorry, I couldn't generate a response.";
}

async function callLLM(messages: ChatMessage[]): Promise<string> {
  // 1) Try the free OpenRouter models first.
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(messages, buildModelChain(messages));
    } catch (error) {
      console.warn("OpenRouter free models are unavailable:", error);
    }
  }

  // 2) Fall back to the free Google Gemini tier when it is configured.
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(messages);
    } catch (error) {
      console.warn("Gemini fallback failed:", error);
    }
  }

  throw new Error("No AI provider is configured or available.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = normalizeMessages(body.messages);

    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content ?? "";
    const memberSearchTerm = extractMemberSearchTerm(lastMessage);

    if (memberSearchTerm) {
      const members = await searchMembers(memberSearchTerm);
      return NextResponse.json({
        response: formatMemberResults(members),
        members: members.map((member) => ({
          id: member.id,
          memberId: member.memberId,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.middleInitial,
          status: member.status,
          chapter: member.memberChapter,
          officerPosition: member.officerPosition,
        })),
      });
    }

    if (asksForOfficers(lastMessage)) {
      return NextResponse.json({ response: await getCurrentOfficers() });
    }

    if (asksForChapters(lastMessage)) {
      return NextResponse.json({ response: await getPublishedChapters() });
    }

    if (asksForNews(lastMessage)) {
      return NextResponse.json({ response: await getRecentNews() });
    }

    if (isImageRequest(lastMessage)) {
      const response = await generateImage(lastMessage.toLowerCase());
      return NextResponse.json({ response });
    }

    const response = await callLLM(messages);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "I'm having trouble connecting right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
