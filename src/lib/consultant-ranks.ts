export const CONSULTANT_RANKS = [
  "Master / Captain",
  "Chief Officer",
  "Second Officer",
  "Third Officer",
  "Chief Engineer",
  "Second Engineer",
  "Third Engineer",
  "Deck Cadet",
  "Engine Cadet",
  "Bosun",
  "Other",
] as const;

export type ConsultantRank = (typeof CONSULTANT_RANKS)[number];

/** Index in CONSULTANT_RANKS = seniority order (0 = most senior). Unranked/unrecognized values sort last. */
export function rankSortIndex(rank: string | null): number {
  if (!rank) return CONSULTANT_RANKS.length;
  const index = CONSULTANT_RANKS.indexOf(rank as ConsultantRank);
  return index === -1 ? CONSULTANT_RANKS.length : index;
}
