import { describe, it, expect } from "vitest";
import { bucketReceivables, type AgingItem } from "./aging";

const asOf = new Date("2026-08-10T00:00:00Z");
function daysAgo(n: number) {
  return new Date(asOf.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("bucketReceivables", () => {
  it("returns all zeros for no items", () => {
    expect(bucketReceivables([], asOf)).toEqual({ current: 0, d1to30: 0, d31to60: 0, d60plus: 0, total: 0 });
  });

  it("puts a not-yet-due invoice in current", () => {
    const items: AgingItem[] = [{ totalAmount: 100, paid: 0, dueDate: daysAgo(-5), issueDate: daysAgo(1) }];
    const b = bucketReceivables(items, asOf);
    expect(b.current).toBe(100);
    expect(b.total).toBe(100);
  });

  it("buckets by days past due across boundaries", () => {
    const items: AgingItem[] = [
      { totalAmount: 10, paid: 0, dueDate: daysAgo(15), issueDate: daysAgo(30) }, // 1-30
      { totalAmount: 20, paid: 0, dueDate: daysAgo(45), issueDate: daysAgo(60) }, // 31-60
      { totalAmount: 30, paid: 0, dueDate: daysAgo(90), issueDate: daysAgo(120) }, // 60+
    ];
    const b = bucketReceivables(items, asOf);
    expect(b.d1to30).toBe(10);
    expect(b.d31to60).toBe(20);
    expect(b.d60plus).toBe(30);
    expect(b.total).toBe(60);
  });

  it("subtracts payments and skips fully-paid invoices", () => {
    const items: AgingItem[] = [
      { totalAmount: 100, paid: 40, dueDate: daysAgo(10), issueDate: daysAgo(20) },
      { totalAmount: 50, paid: 50, dueDate: daysAgo(10), issueDate: daysAgo(20) },
    ];
    const b = bucketReceivables(items, asOf);
    expect(b.d1to30).toBe(60);
    expect(b.total).toBe(60);
  });

  it("falls back to issueDate when dueDate is null", () => {
    const items: AgingItem[] = [{ totalAmount: 100, paid: 0, dueDate: null, issueDate: daysAgo(45) }];
    const b = bucketReceivables(items, asOf);
    expect(b.d31to60).toBe(100);
  });

  it("treats exactly-due (0 days past) as current", () => {
    const items: AgingItem[] = [{ totalAmount: 100, paid: 0, dueDate: asOf, issueDate: daysAgo(30) }];
    expect(bucketReceivables(items, asOf).current).toBe(100);
  });
});
