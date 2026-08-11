import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { QuotationEditor } from "../quotation-editor";

export const metadata: Metadata = { title: "New Quotation" };

export default async function NewQuotationPage() {
  const session = await auth();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "FINANCE_OFFICER") {
    return <AccessDenied message="Quotations are restricted to Admin, Manager, and Finance Officer roles." />;
  }

  const customers = await db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/finance/quotations" className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Quotations
      </Link>
      <QuotationEditor customers={customers} />
    </div>
  );
}
