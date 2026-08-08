import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CompaniesTable } from "./companies-table";
import { CustomersTable } from "./customers-table";
import {
  PAGE_SIZE,
  parseCustomerListParams,
  buildCustomerWhere,
  buildCustomerOrderBy,
} from "./query";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const params = parseCustomerListParams(await searchParams);
  const where = buildCustomerWhere(params);

  const [companies, total, customers, activeCompany] = await Promise.all([
    db.company.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { customers: true } } },
    }),
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: buildCustomerOrderBy(params),
      include: { company: true, _count: { select: { vessels: true, bookings: true } } },
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    params.company
      ? db.company.findUnique({ where: { id: params.company }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer relationships, companies, and vessels.
        </p>
      </div>

      <CompaniesTable
        canManage={canManage}
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
          address: company.address,
          city: company.city,
          country: company.country,
          phone: company.phone,
          email: company.email,
          website: company.website,
          notes: company.notes,
          customerCount: company._count.customers,
        }))}
      />

      <CustomersTable
        canManage={canManage}
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          companyName: customer.company?.name ?? null,
          vesselCount: customer._count.vessels,
          bookingCount: customer._count.bookings,
        }))}
        total={total}
        pageSize={PAGE_SIZE}
        params={params}
        activeCompanyName={activeCompany?.name ?? null}
      />
    </div>
  );
}
