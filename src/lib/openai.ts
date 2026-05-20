import OpenAI from "openai";

// Singleton — reused across requests in the same worker process.
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const MODELS = {
  strong: "gpt-4o",
  fast: "gpt-4o-mini",
} as const;
