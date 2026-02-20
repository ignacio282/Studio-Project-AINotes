type ClosestMatchOptions = {
  minScoreShort?: number;
  minScoreMedium?: number;
  minScoreLong?: number;
};

export function normalizeEntityName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        best = Math.min(best, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = best;
    }
  }

  return dp[a.length][b.length];
}

function similarityScore(a: string, b: string): number {
  const left = normalizeEntityName(a).replace(/\s+/g, "");
  const right = normalizeEntityName(b).replace(/\s+/g, "");
  if (!left || !right) return 0;
  if (left === right) return 1;

  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 0;

  const distance = damerauLevenshteinDistance(left, right);
  const rawScore = 1 - distance / maxLen;

  const commonPrefix = (() => {
    const maxPrefix = Math.min(4, left.length, right.length);
    let i = 0;
    while (i < maxPrefix && left[i] === right[i]) i += 1;
    return i;
  })();
  const prefixBoost = commonPrefix * 0.02;

  return Math.max(0, Math.min(1, rawScore + prefixBoost));
}

function thresholdForLength(length: number, options?: ClosestMatchOptions): number {
  const short = options?.minScoreShort ?? 0.9;
  const medium = options?.minScoreMedium ?? 0.84;
  const long = options?.minScoreLong ?? 0.8;
  if (length <= 4) return short;
  if (length <= 8) return medium;
  return long;
}

function candidateVariants(base: string): string[] {
  const variants = new Set<string>();
  const value = (base || "").trim();
  if (!value) return [];

  variants.add(value);

  if (value.endsWith("'s")) {
    variants.add(value.slice(0, -2));
  }
  if (value.endsWith("s") && value.length > 4) {
    variants.add(value.slice(0, -1));
  }
  if (value.endsWith("es") && value.length > 5) {
    variants.add(value.slice(0, -2));
  }

  return Array.from(variants).filter(Boolean);
}

export function findClosestNameMatch(
  candidate: string,
  existingNames: string[],
  options?: ClosestMatchOptions,
): { name: string; score: number; threshold: number } | null {
  const candidateNormalized = normalizeEntityName(candidate);
  const candidateDense = candidateNormalized.replace(/\s+/g, "");
  if (!candidateDense) return null;

  const variants = candidateVariants(candidateDense);
  let bestName = "";
  let bestScore = 0;

  for (const name of existingNames) {
    if (typeof name !== "string") continue;
    const normalized = normalizeEntityName(name);
    const dense = normalized.replace(/\s+/g, "");
    if (!dense) continue;

    for (const variant of variants) {
      if (!variant || dense === variant) continue;
      const candidateFirst = variant[0];
      if (candidateFirst && dense[0] !== candidateFirst) continue;
      if (Math.abs(dense.length - variant.length) > 2) continue;

      const score = similarityScore(variant, dense);
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }
  }

  if (!bestName) return null;
  const threshold = thresholdForLength(candidateDense.length, options);
  if (bestScore < threshold) return null;
  return { name: bestName, score: bestScore, threshold };
}
