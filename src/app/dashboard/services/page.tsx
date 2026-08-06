import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CategoriesTable } from "./categories-table";
import { ServicesTable } from "./services-table";
import { RequestsTable } from "./requests-table";

export const metadata: Metadata = { title: "Service Management" };

export default async function ServiceManagementPage() {
  const session = await auth();
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const [categories, services, consultants, requests, forms] = await Promise.all([
    db.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { services: true } } },
    }),
    db.service.findMany({
      orderBy: { order: "asc" },
      include: {
        category: true,
        defaultConsultant: true,
        requiredForms: { include: { companyDocument: true }, orderBy: { order: "asc" } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { service: true },
    }),
    db.companyDocument.findMany({
      where: { category: "FORM" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Service Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage service categories, the service catalog, and view incoming requests.
        </p>
      </div>

      <CategoriesTable
        canManage={canManage}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          order: category.order,
          isActive: category.isActive,
          serviceCount: category._count.services,
        }))}
      />

      <ServicesTable
        canManage={canManage}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        consultants={consultants}
        availableForms={forms}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          categoryId: service.categoryId,
          categoryName: service.category.name,
          parentServiceId: service.parentServiceId,
          overview: service.overview,
          benefits: service.benefits,
          scope: service.scope,
          process: service.process,
          defaultConsultantId: service.defaultConsultantId,
          defaultConsultantName: service.defaultConsultant?.name ?? null,
          order: service.order,
          isActive: service.isActive,
          faq: service.faq,
          requiredForms: service.requiredForms.map((form) => ({
            id: form.id,
            companyDocumentId: form.companyDocumentId,
            title: form.companyDocument.title,
            required: form.required,
            order: form.order,
          })),
        }))}
      />

      <RequestsTable
        requests={requests.map((request) => ({
          id: request.id,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          serviceName: request.service.name,
          status: request.status,
          createdAt: request.createdAt,
        }))}
      />
    </div>
  );
}
