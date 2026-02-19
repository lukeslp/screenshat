// LLM integration — provider selected by LLM_PROVIDER env var.
// LLM_PROVIDER=gateway (default): local api-gateway at API_GATEWAY_URL
// LLM_PROVIDER=openai|anthropic|google: direct provider call using LLM_API_KEY + LLM_MODEL

const LLM_PROVIDER = process.env.LLM_PROVIDER || "gateway";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "";

// Gateway config (default path, used when LLM_PROVIDER=gateway)
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:5200";
const API_GATEWAY_KEY = process.env.API_GATEWAY_KEY || "";

export interface VisionAnalysisResult {
  description: string;
  focalPoint: { x: number; y: number };
  cropSuggestions: Array<{
    format: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  qualityScore: number;
  suggestions: string[];
}

/**
 * Analyze a screenshot image using the configured LLM provider.
 * @param imageUrl - data: URI or plain URL of the image
 * @param prompt - Prompt for the vision model
 */
export async function analyzeWithVision(
  imageUrl: string,
  prompt: string
): Promise<string> {
  switch (LLM_PROVIDER) {
    case "openai":
      return analyzeWithOpenAI(imageUrl, prompt);
    case "anthropic":
      return analyzeWithAnthropic(imageUrl, prompt);
    case "google":
      return analyzeWithGoogle(imageUrl, prompt);
    default:
      return analyzeWithGateway(imageUrl, prompt);
  }
}

// ── Gateway (default) ──────────────────────────────────────────────────────

async function analyzeWithGateway(imageUrl: string, prompt: string): Promise<string> {
  // Strip data URL prefix — api-gateway expects raw base64 or a plain URL
  const image = imageUrl.startsWith("data:")
    ? imageUrl.split(",")[1] ?? imageUrl
    : imageUrl;

  const response = await fetch(`${API_GATEWAY_URL}/v1/llm/vision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_GATEWAY_KEY,
    },
    body: JSON.stringify({
      provider: "anthropic",
      model: "claude-sonnet-4-5-20250929",
      image,
      media_type: "image/png",
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM vision failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const result = await response.json();
  return result.content as string;
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

async function analyzeWithOpenAI(imageUrl: string, prompt: string): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: LLM_API_KEY });
  const model = LLM_MODEL || "gpt-4o"; // gpt-4.1 also available

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Anthropic ──────────────────────────────────────────────────────────────

async function analyzeWithAnthropic(imageUrl: string, prompt: string): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: LLM_API_KEY });
  const model = LLM_MODEL || "claude-sonnet-4-6"; // latest as of Feb 2026

  // Extract raw base64 from data URI
  const base64 = imageUrl.startsWith("data:")
    ? (imageUrl.split(",")[1] ?? imageUrl)
    : imageUrl;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const block = response.content[0];
  return block?.type === "text" ? block.text : "";
}

// ── Google Gemini ──────────────────────────────────────────────────────────

async function analyzeWithGoogle(imageUrl: string, prompt: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(LLM_API_KEY);
  const model = client.getGenerativeModel({ model: LLM_MODEL || "gemini-2.5-flash" }); // 2.0-flash deprecated March 2026

  // Extract raw base64 from data URI
  const base64 = imageUrl.startsWith("data:")
    ? (imageUrl.split(",")[1] ?? imageUrl)
    : imageUrl;

  const response = await model.generateContent([
    { inlineData: { mimeType: "image/png", data: base64 } },
    prompt,
  ]);

  return response.response.text();
}
