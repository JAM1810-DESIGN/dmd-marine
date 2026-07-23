export type FaqItem = { question: string; answer: string };

export function isFaqArray(value: unknown): value is FaqItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as FaqItem).question === "string" &&
        typeof (item as FaqItem).answer === "string",
    )
  );
}
