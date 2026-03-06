export type QaState = "loading" | "empty" | "error" | null;

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function qaEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_QA_STATES === "1";
}

export function resolveQaState(searchParams: SearchParamsLike): QaState {
  if (!qaEnabled() || !searchParams) return null;

  let rawValue = "";
  if (searchParams instanceof URLSearchParams) {
    rawValue = searchParams.get("qa") ?? "";
  } else {
    const value = searchParams.qa;
    rawValue = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "loading" || normalized === "empty" || normalized === "error") {
    return normalized;
  }
  return null;
}

