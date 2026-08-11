import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet, Receipt, TrendingUp, ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { EditProjectButton } from "./edit-project-button";
import { DocumentsSection } from "./documents-section";
import { SchedulesSection } from "./schedules-section";
import { RequiredFormsSection } from "./required-forms-section";

export const metadata: Metadata = { title: "Project" };

const php = (amount: number) =>
  amount.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const [project, customers, vessels, consultants, forms] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        customer: true,
        vessel: true,
        service: true,
        consultant: true,
        booking: true,
        documents: { orderBy: { createdAt: "desc" } },
        schedules: { orderBy: { startAt: "asc" }, include: { consultant: true } },
        requiredForms: {
          orderBy: { order: "asc" },
          include: { companyDocument: true, documents: { orderBy: { createdAt: "desc" } } },
        },
        invoices: { orderBy: { issueDate: "desc" } },
        expenses: { orderBy: { expenseDate: "desc" }, include: { category: { select: { name: true } } } },
      },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.vessel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, baseLocations: true, address: true },
    }),
    db.companyDocument.findMany({
      where: { category: "FORM" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const services = await db.service.findMany({
    where: { OR: [{ isActive: true }, ...(project?.serviceId ? [{ id: project.serviceId }] : [])] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const billed = project.invoices
    .filter((invoice) => invoice.status !== "CANCELLED")
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const spent = project.expenses
    .filter((expense) => expense.paymentStatus === "APPROVED" || expense.paymentStatus === "PAID")
    .reduce((sum, expense) => sum + Number(expense.amount) + Number(expense.taxAmount), 0);
  const margin = billed - spent;

  const formsTotal = project.requiredForms.length;
  const formsDone = project.requiredForms.filter((form) => form.completed).length;
  const progress = formsTotal > 0 ? Math.round((formsDone / formsTotal) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
            <Badge variant="outline">{project.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.customer?.name ?? "No customer"}
            {project.vessel && ` · ${project.vessel.name}`}
            {project.service && ` · ${project.service.name}`}
          </p>
          <p className="text-sm text-muted-foreground">Consultant: {project.consultant.name}</p>
          {project.description && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        {canManage && (
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              customerId: project.customerId,
              vesselId: project.vesselId,
              serviceId: project.serviceId,
              consultantId: project.consultantId,
              status: project.status,
              startDate: project.startDate ? project.startDate.toISOString() : null,
              endDate: project.endDate ? project.endDate.toISOString() : null,
              description: project.description,
              location: project.location,
            }}
            customers={customers}
            vessels={vessels}
            services={services}
            consultants={consultants}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} tone="success" label="Revenue billed" value={php(billed)} subtitle="Non-cancelled invoices" />
        <StatCard icon={Receipt} tone="primary" label="Expenses" value={php(spent)} subtitle="Approved or paid" />
        <StatCard icon={TrendingUp} tone={margin >= 0 ? "accent" : "primary"} label="Margin" value={php(margin)} />
        <StatCard
          icon={ListChecks}
          tone="info"
          label="Forms progress"
          value={progress === null ? "—" : `${progress}%`}
          subtitle={formsTotal > 0 ? `${formsDone} of ${formsTotal} done` : "No required forms"}
        />
      </div>

      <SchedulesSection
        projectId={project.id}
        projectName={project.name}
        consultantId={project.consultantId}
        consultants={consultants}
        canManage={canManage}
        schedules={project.schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          type: schedule.type,
          startAt: schedule.startAt.toISOString(),
          endAt: schedule.endAt.toISOString(),
          consultantName: schedule.consultant.name,
        }))}
      />

      <RequiredFormsSection
        projectId={project.id}
        canManage={canManage}
        availableForms={forms}
        requiredForms={project.requiredForms.map((form) => ({
          id: form.id,
          companyDocumentId: form.companyDocumentId,
          title: form.companyDocument?.title ?? form.label ?? "Untitled form",
          templateUrl: form.companyDocument?.url ?? null,
          required: form.required,
          order: form.order,
        }))}
      />

      <DocumentsSection
        projectId={project.id}
        canManage={canManage}
        storageConfigured={isStorageConfigured}
        items={project.requiredForms.map((form) => ({
          id: form.id,
          title: form.companyDocument?.title ?? form.label ?? "Untitled form",
          required: form.required,
          completed: form.completed,
          attachments: form.documents.map((doc) => ({ id: doc.id, fileName: doc.fileName, url: doc.url })),
        }))}
        otherDocuments={project.documents
          .filter((doc) => doc.requiredFormId === null)
          .map((doc) => ({
            id: doc.id,
            fileName: doc.fileName,
            url: doc.url,
            category: doc.category,
            sizeBytes: doc.sizeBytes,
          }))}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Invoices</h2>
            <p className="text-sm text-muted-foreground">Billing tied to this project.</p>
          </div>
          {project.invoices.length === 0 ? (
            <EmptyState className="border-none" title="No invoices yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {project.invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/dashboard/finance/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
                  >
                    <div>
                      <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{shortDate(invoice.issueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{php(Number(invoice.totalAmount))}</p>
                      <Badge variant="outline">{invoice.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="p-4">
            <h2 className="font-heading text-base font-semibold">Expenses</h2>
            <p className="text-sm text-muted-foreground">Costs charged to this project.</p>
          </div>
          {project.expenses.length === 0 ? (
            <EmptyState className="border-none" title="No expenses yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {project.expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.category.name} · {shortDate(expense.expenseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {php(Number(expense.amount) + Number(expense.taxAmount))}
                    </p>
                    <Badge variant="outline">{expense.paymentStatus.replace(/_/g, " ")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
