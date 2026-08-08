import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DocumentsTable } from "./documents-table";

export const metadata: Metadata = { title: "Documents & Forms" };

export default async function DocumentsPage() {
  const session = await auth();
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const documents = await db.companyDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      _count: { select: { serviceAssignments: true, projectAssignments: true } },
    },
  });

  const uploaders = Array.from(
    new Map(
      documents
        .filter((doc) => doc.uploadedBy)
        .map((doc) => [doc.uploadedBy!.id, doc.uploadedBy!.name]),
    ),
  ).map(([id, name]) => ({ id, name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documents &amp; Forms</h1>
        <p className="text-sm text-muted-foreground">
          Company documents and downloadable forms.
        </p>
      </div>

      <DocumentsTable
        canManage={canManage}
        uploaders={uploaders}
        documents={documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
          fileName: doc.fileName,
          url: doc.url,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          uploaderId: doc.uploadedBy?.id ?? null,
          uploaderName: doc.uploadedBy?.name ?? null,
          serviceCount: doc._count.serviceAssignments,
          projectCount: doc._count.projectAssignments,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
