import { NextResponse } from "next/server";
import { asc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free Text Models on OpenRouter (fallback chain)
const FREE_MODELS = [
  "minimax/minimax-m2.7:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "minimax/minimax-m3:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-1b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "meta-llama/llama-3.2-1b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "microsoft/phi-3.5-mini-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "qwen/qwen-2-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mixtral-8x7b-instruct:free",
  "mistralai/mixtral-8x22b-instruct:free",
  "mistralai/codestral-2501:free",
  "anthropic/claude-3.5-sonnet:free",
  "anthropic/claude-3-haiku:free",
  "openai/gpt-4o-mini:free",
  "openai/gpt-4o:free",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-chat:free",
];

// Free Image Generation Models
const FREE_IMAGE_MODELS = [
  "stabilityai/stable-diffusion-3.5-large:free",
  "stabilityai/stable-diffusion-3-medium:free",
  "stabilityai/stable-diffusion-xl-base-1.0:free",
  "black-forest-labs/flux-1-dev:free",
  "black-forest-labs/flux-1-schnell:free",
];

const SYSTEM_PROMPT = `You are Knyte, the friendly AI assistant for Pi Gamma Phi Gamma Sigma (PGPGS) Roxas City Capiz Chapter.

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
- If someone asks "Who is Rolly Paredes?" or "What can you tell me about Rolly Paredes?", search the member database for his information and share his membership details (name, member ID, status, chapter)
- Rolly Paredes is a member of PGPGS and the developer of this chatbot

YOUR ROLE:
- Help users learn about Pi Gamma Phi Gamma Sigma
- Assist with verifying members by searching the member database
- Generate images when users ask (e.g., "generate image of...", "draw...", "create image...")
- Be friendly, helpful, and professional
- Keep responses concise and informative
- Share only name, member ID, status, and chapter when verifying members (never contact details)
- Always refer to the organization as "Pi Gamma Phi Gamma Sigma" or "PGPGS"
- If you dont know something, be honest and suggest contacting the chapter directly

IMPORTANT:
- Do NOT introduce yourself in every response - the user already knows you are Knyte
- Just answer the question directly and concisely
- Do not say "Hello" or "I'm Knyte" in your responses
- Keep responses short and to the point (2-3 sentences max)
- NEVER reveal what AI model you are powered by or mention any model names
- If someone asks what AI model you use, give a vague answer like "I'm powered by AI technology" or deflect the question
- Do NOT use asterisks (*) in your responses - no bold or italic formatting with asterisks`;

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
}

async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  const pattern = `%${query}%`;
  const members = await db
    .select({
      id: pgpmembers.id,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      lastName: pgpmembers.lastName,
      middleInitial: pgpmembers.middleInitial,
      status: pgpmembers.status,
      memberChapter: pgpmembers.memberChapter,
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
    .limit(5);

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
      return `- ${fullName} (ID: ${m.memberId}) - Status: ${m.status}${chapter}`;
    })
    .join("\n");

      return `I found the following member(s) in our database:\n\n${memberList}`;
}

async function callOpenRouter(
  messages: ChatMessage[],
  modelIndex = 0,
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (modelIndex >= FREE_MODELS.length) {
    throw new Error("All models failed to respond.");
  }

  const model = FREE_MODELS[modelIndex];

  const response = await fetch(OPENROUTER_URL, {
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
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.warn(`OpenRouter model ${model} failed: ${response.status} - ${errorText.slice(0, 200)}`);
    return callOpenRouter(messages, modelIndex + 1);
  }

  const data = await response.json();
  if (data.error) {
    console.warn(`OpenRouter model ${model} returned error:`, data.error);
    return callOpenRouter(messages, modelIndex + 1);
  }

  return data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";
}

async function generateImage(prompt: string, modelIndex = 0): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (modelIndex >= FREE_IMAGE_MODELS.length) {
    throw new Error("All image models failed to respond.");
  }

  const model = FREE_IMAGE_MODELS[modelIndex];

  const response = await fetch(OPENROUTER_URL, {
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
  });

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() ?? "";
    const isSearchQuery =
      lastMessage.includes("search") ||
      lastMessage.includes("find") ||
      lastMessage.includes("verify") ||
      lastMessage.includes("look up") ||
      lastMessage.includes("check member") ||
      lastMessage.includes("is a member") ||
      lastMessage.includes("member named") ||
      lastMessage.includes("rolly") ||
      lastMessage.includes("paredes");

    if (isSearchQuery) {
      let searchTerm = lastMessage
        .replace(/search|find|verify|look up|check member|is a member|member named|for|the|a|an|please|can you|help me/g, "")
        .trim();

      // Special handling for Rolly Paredes queries
      if (lastMessage.includes("rolly") || lastMessage.includes("paredes")) {
        searchTerm = "rolly paredes";
      }

      if (searchTerm.length >= 2) {
        const members = await searchMembers(searchTerm);
        const resultText = formatMemberResults(members);

        return NextResponse.json({
          response: resultText,
          members: members.map((m) => ({
            id: m.id,
            memberId: m.memberId,
            firstName: m.firstName,
            lastName: m.lastName,
            middleInitial: m.middleInitial,
            status: m.status,
            chapter: m.memberChapter,
          })),
        });
      }
    }

    if (isImageRequest(lastMessage)) {
      const response = await generateImage(lastMessage);
      return NextResponse.json({ response });
    }

    const response = await callOpenRouter(messages);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "I'm having trouble connecting right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
