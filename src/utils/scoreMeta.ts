export type ScoreTierKey = "good" | "fair" | "poor" | "unrated";

export type ScoreMeta = {
  key: ScoreTierKey;
  /** Candidate-facing label: Tốt | Khá | Cần cải thiện | — */
  label: string;
  /** HR / Admin-facing label: Phù hợp cao | Cần xem xét | Chưa phù hợp | Chưa hoàn thành */
  hrLabel: string;
  hex: string;
  textClass: string;
  badgeTone: "success" | "warning" | "destructive" | "neutral";
  badgeVariant: "success" | "warning" | "destructive" | "secondary";
};

/**
 * Single source of truth for score classification across User & Admin:
 * - >= 80: Green (Tốt / Phù hợp cao)
 * - 50 - 79: Amber (Khá / Cần xem xét)
 * - < 50: Red (Cần cải thiện / Chưa phù hợp)
 * - null / undefined: Neutral (—)
 */
export function getScoreMeta(score: number | null | undefined): ScoreMeta {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return {
      key: "unrated",
      label: "—",
      hrLabel: "Chưa hoàn thành",
      hex: "#A1A1AA",
      textClass: "text-zinc-400",
      badgeTone: "neutral",
      badgeVariant: "secondary",
    };
  }
  if (score >= 80) {
    return {
      key: "good",
      label: "Tốt",
      hrLabel: "Phù hợp cao",
      hex: "#10B981",
      textClass: "text-emerald-600",
      badgeTone: "success",
      badgeVariant: "success",
    };
  }
  if (score >= 50) {
    return {
      key: "fair",
      label: "Khá",
      hrLabel: "Cần xem xét",
      hex: "#F59E0B",
      textClass: "text-amber-600",
      badgeTone: "warning",
      badgeVariant: "warning",
    };
  }
  return {
    key: "poor",
    label: "Cần cải thiện",
    hrLabel: "Chưa phù hợp",
    hex: "#EF4444",
    textClass: "text-red-600",
    badgeTone: "destructive",
    badgeVariant: "destructive",
  };
}

/**
 * Generates collision-free avatar initials:
 * - "Ứng viên 1" -> "U1", "Ứng viên 18" -> "U18" (avoids V1 collision!)
 * - "Nguyễn Đình Duy" -> "ND" (first + last word initials)
 * - "Admin" -> "AD"
 */
export function getAvatarInitials(name?: string | null, fallback = "UV"): string {
  const clean = (name || "").trim();
  if (!clean) return fallback;

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;

  const lastPart = parts[parts.length - 1];
  // Numeric suffix such as "Ứng viên 1", "Ứng viên 18", "User 24"
  if (/^\d+$/.test(lastPart)) {
    const num = lastPart.slice(0, 3);
    if (parts.length === 1) return num;
    const prefix = parts[0]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .charAt(0)
      .toUpperCase();
    return num.length <= 2 ? `${prefix || "U"}${num}` : num;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const firstChar = parts[0].charAt(0);
  const lastChar = lastPart.charAt(0);
  return `${firstChar}${lastChar}`.toUpperCase() || fallback;
}

/**
 * Deduplicates job skill tags and strips values already shown in location/level or generic filler.
 */
export function deduplicateJobSkills(
  rawSkills: string[] = [],
  location = "",
  level = "",
): string[] {
  const norm = (v: string) => v.trim().toLowerCase();
  const locNorm = norm(location);
  const lvlNorm = norm(level);
  const genericFiller = new Set([
    "dữ liệu thực",
    "toàn thời gian",
    "việt nam",
  ]);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of rawSkills) {
    const cleaned = (tag || "").trim();
    const key = norm(cleaned);
    if (!key) continue;
    if (genericFiller.has(key)) continue;
    if (key.startsWith("level:")) continue;
    if (lvlNorm && key === lvlNorm) continue;
    if (
      locNorm &&
      (key === locNorm || locNorm.includes(key) || key.includes(locNorm))
    ) {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

