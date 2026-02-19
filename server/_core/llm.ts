// LLM integration via local api-gateway at localhost:5200

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
 * Analyze a screenshot image using the local api-gateway vision endpoint.
 * @param imageUrl - Public URL of the image to analyze
 * @param prompt - Prompt for the vision model
 */
export async function analyzeWithVision(
  imageUrl: string,
  prompt: string
): Promise<string> {
  // Strip data URL prefix if present — api-gateway expects raw base64 or a plain URL
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
