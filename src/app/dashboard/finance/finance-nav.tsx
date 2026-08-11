"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  Banknote,
  Receipt,
  Wallet,
  FileSpreadsheet,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard/finance", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/finance/quotations", label: "Quotations", icon: FileSignature },
  { href: "/dashboard/finance/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/finance/payments", label: "Payments", icon: Banknote },
  { href: "/dashboard/finance/expenses", label: "Expenses", icon: Receipt },
  { href: "/dashboard/finance/budgets", label: "Budgets", icon: Wallet },
  { href: "/dashboard/finance/statements", label: "Statements", icon: FileSpreadsheet },
  { href: "/dashboard/finance/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/finance/settings", label: "Settings", icon: Settings },
];

export function FinanceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px print:hidden">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-accent font-medium text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
