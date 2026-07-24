import { z } from "zod";

function noneToNull(value: string | undefined) {
  return value && value !== "none" ? value : null;
}

export const branchSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});
export type BranchInput = z.infer<typeof branchSchema>;

export const vendorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type VendorInput = z.infer<typeof vendorSchema>;

export const expenseCategorySchema = z.object({
  name: z.string().min(2, "Name is required"),
});
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "GCASH",
  "MAYA",
  "CHECK",
  "OTHER",
] as const;

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Please select a category"),
  vendorId: z.string().optional().transform(noneToNull),
  description: z.string().min(1, "Description is required"),
  projectId: z.string().optional().transform(noneToNull),
  bookingId: z.string().optional().transform(noneToNull),
  branchId: z.string().optional().transform(noneToNull),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  taxAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  serviceId: z.string().optional().transform(noneToNull),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  customerId: z.string().optional().transform(noneToNull),
  companyId: z.string().optional().transform(noneToNull),
  vesselId: z.string().optional().transform(noneToNull),
  serviceId: z.string().optional().transform(noneToNull),
  bookingId: z.string().optional().transform(noneToNull),
  projectId: z.string().optional().transform(noneToNull),
  branchId: z.string().optional().transform(noneToNull),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  discountAmount: z.coerce.number().min(0).default(0),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const budgetSchema = z.object({
  name: z.string().min(2, "Name is required"),
  categoryId: z.string().optional().transform(noneToNull),
  branchId: z.string().optional().transform(noneToNull),
  period: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  notes: z.string().optional(),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
