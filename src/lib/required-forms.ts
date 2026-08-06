import { db } from "@/lib/db";

export async function copyServiceRequiredFormsToProject(projectId: string, serviceId: string) {
  const templates = await db.serviceRequiredForm.findMany({ where: { serviceId } });
  if (templates.length === 0) return;

  await db.projectRequiredForm.createMany({
    data: templates.map((t) => ({
      projectId,
      companyDocumentId: t.companyDocumentId,
      required: t.required,
      order: t.order,
    })),
  });
}
