import { describe, it, expect } from "vitest";
import { invoiceSchema, paymentSchema, expenseSchema, budgetSchema } from "./finance";

describe("invoiceSchema", () => {
  const base = {
    issueDate: "2026-08-10",
    items: [{ description: "Survey", unitPrice: 1000 }],
  };

  it("accepts a minimal valid invoice and defaults line fields", () => {
    const parsed = invoiceSchema.parse(base);
    expect(parsed.items[0]).toMatchObject({ quantity: 1, taxRate: 0 });
    expect(parsed.discountAmount).toBe(0);
  });

  it("rejects an invoice with no line items", () => {
    expect(invoiceSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it('maps "none" relation ids to null', () => {
    const parsed = invoiceSchema.parse({ ...base, customerId: "none" });
    expect(parsed.customerId).toBeNull();
  });

  it("rejects a missing issue date", () => {
    expect(invoiceSchema.safeParse({ items: base.items }).success).toBe(false);
  });
});

describe("paymentSchema", () => {
  it("rejects a non-positive amount", () => {
    expect(
      paymentSchema.safeParse({ paymentDate: "2026-08-10", amount: 0, method: "CASH" }).success,
    ).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    expect(
      paymentSchema.safeParse({ paymentDate: "2026-08-10", amount: 10, method: "BITCOIN" }).success,
    ).toBe(false);
  });

  it("coerces a numeric string amount", () => {
    const parsed = paymentSchema.parse({ paymentDate: "2026-08-10", amount: "250.50", method: "GCASH" });
    expect(parsed.amount).toBe(250.5);
  });
});

describe("expenseSchema", () => {
  it("requires a category", () => {
    expect(
      expenseSchema.safeParse({ expenseDate: "2026-08-10", description: "Fuel", amount: 100, paymentMethod: "CASH" })
        .success,
    ).toBe(false);
  });
});

describe("budgetSchema", () => {
  it("rejects an invalid period", () => {
    expect(
      budgetSchema.safeParse({ name: "Ops", period: "WEEKLY", periodStart: "a", periodEnd: "b", amount: 10 }).success,
    ).toBe(false);
  });
});
