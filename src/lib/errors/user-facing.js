export function getFriendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error.message === "string"
        ? error.message
        : "";
  const message = raw.trim();
  const lower = message.toLowerCase();

  if (!message) return fallback;
  if (
    lower.includes("openai") ||
    lower.includes("api_key") ||
    lower.includes("environment") ||
    lower.includes("supabase") ||
    lower.includes("jwt") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  ) {
    return fallback;
  }
  if (lower.includes("unauthorized")) {
    return "Your session expired. Please sign in again.";
  }
  if (lower.includes("not found")) {
    return message;
  }
  return message.length > 140 ? fallback : message;
}
