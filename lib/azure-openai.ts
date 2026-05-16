export interface AzureOpenAIConfig {
  endpoint: string;
  apiVersion: string;
  deploymentName: string;
  apiKey: string;
  responsesUrl: string;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAzureOpenAIConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim() || "";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || "2025-04-01-preview";
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim() || "";
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim() || "";
  if (!endpoint || !apiKey || !deploymentName) return null;

  const normalizedEndpoint = trimTrailingSlash(endpoint);
  const responsesUrl = normalizedEndpoint.endsWith("/openai/responses")
    ? `${normalizedEndpoint}?api-version=${encodeURIComponent(apiVersion)}`
    : `${normalizedEndpoint}/openai/responses?api-version=${encodeURIComponent(apiVersion)}`;

  return {
    endpoint: normalizedEndpoint,
    apiVersion,
    deploymentName,
    apiKey,
    responsesUrl,
  };
}

export function getAzureOpenAIEndpointLabel(config = getAzureOpenAIConfig()) {
  if (!config) return "Not configured";
  return config.endpoint;
}

export interface AzureResponseResult {
  text: string;
  responseId?: string;
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const output = Array.isArray(record.output) ? record.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const outputItem = item as Record<string, unknown>;
    const content = Array.isArray(outputItem.content) ? outputItem.content : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) chunks.push(text.trim());
    }
  }
  return chunks.join("\n").trim();
}

export async function callAzureOpenAIResponse(input: {
  instructions: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<AzureResponseResult | null> {
  const config = getAzureOpenAIConfig();
  if (!config) return null;

  try {
    const response = await fetch(config.responsesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        model: config.deploymentName,
        input: input.prompt,
        instructions: input.instructions,
        max_output_tokens: input.maxOutputTokens ?? 900,
      }),
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractOutputText(payload);
    if (!text) return null;
    return {
      text,
      responseId: typeof payload === "object" && payload && "id" in payload ? String((payload as Record<string, unknown>).id) : undefined,
    };
  } catch {
    return null;
  }
}
