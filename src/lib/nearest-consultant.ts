/**
 * Text-based proximity matching between a work location (e.g. a booking's
 * port or a project's location) and a consultant's base location / address.
 * No geocoding — a practical token-overlap heuristic that works offline.
 */

export type LocatableConsultant = {
  baseLocation?: string | null;
  address?: string | null;
};

function normalize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

/**
 * Higher score = nearer. 0 means no location signal or no overlap.
 *  3 — base location matches the work location exactly (case-insensitive)
 *  2 — base location and work location share a token (e.g. same port/city)
 *  1 — the address mentions the work location
 */
export function proximityScore(consultant: LocatableConsultant, location: string | null): number {
  const target = location?.trim().toLowerCase();
  if (!target) return 0;

  const base = consultant.baseLocation?.trim().toLowerCase() ?? "";
  if (base && base === target) return 3;

  const targetTokens = new Set(normalize(target));
  if (targetTokens.size === 0) return 0;

  if (base) {
    const baseTokens = normalize(base);
    if (baseTokens.some((token) => targetTokens.has(token))) return 2;
  }

  const address = consultant.address?.toLowerCase() ?? "";
  if (address) {
    const addressTokens = normalize(address);
    if (addressTokens.some((token) => targetTokens.has(token))) return 1;
  }

  return 0;
}

/**
 * Returns the consultants sorted nearest-first, each tagged with its score and
 * whether it is (one of) the nearest match(es). Falls back to the input order
 * (assumed alphabetical) when there is no location signal or a tie.
 */
export function rankByProximity<T extends LocatableConsultant>(
  consultants: T[],
  location: string | null,
): (T & { proximityScore: number; isNearest: boolean })[] {
  const scored = consultants.map((consultant, index) => ({
    consultant,
    index,
    score: proximityScore(consultant, location),
  }));

  const maxScore = scored.reduce((max, item) => Math.max(max, item.score), 0);

  return scored
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((item) => ({
      ...item.consultant,
      proximityScore: item.score,
      isNearest: maxScore > 0 && item.score === maxScore,
    }));
}
