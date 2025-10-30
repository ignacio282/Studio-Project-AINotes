export type AiUseCase = "journal" | "reflection" | "change" | "characters";

type AiConfig = {
  model: string;
  maxOutputTokens: number;
};

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAiConfig(useCase: AiUseCase): AiConfig {
  switch (useCase) {
    case "journal":
      return {
        model: process.env.AI_MODEL_JOURNAL || "gpt-5-nano",
        maxOutputTokens: intFromEnv("AI_MAX_TOKENS_JOURNAL", 3000),
      };
    case "reflection":
      return {
        model: process.env.AI_MODEL_REFLECTION || "gpt-5-nano",
        maxOutputTokens: intFromEnv("AI_MAX_TOKENS_REFLECTION", 400),
      };
    case "change":
      return {
        model: process.env.AI_MODEL_CHANGE || "gpt-5-nano",
        maxOutputTokens: intFromEnv("AI_MAX_TOKENS_CHANGE", 1200),
      };
    case "characters":
      return {
        model: process.env.AI_MODEL_CHARACTERS || "gpt-5-nano",
        maxOutputTokens: intFromEnv("AI_MAX_TOKENS_CHARACTERS", 900),
      };
    default:
      return { model: "gpt-5-nano", maxOutputTokens: 1000 };
  }
}

export const PROMPTS_VERSION = process.env.AI_PROMPTS_VERSION || "2025-10-25:v1";

