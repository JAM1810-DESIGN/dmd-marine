-- CreateTable
CREATE TABLE "service_required_forms" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "companyDocumentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_required_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_required_forms" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyDocumentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "project_required_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_required_forms_serviceId_idx" ON "service_required_forms"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_required_forms_serviceId_companyDocumentId_key" ON "service_required_forms"("serviceId", "companyDocumentId");

-- CreateIndex
CREATE INDEX "project_required_forms_projectId_idx" ON "project_required_forms"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_required_forms_projectId_companyDocumentId_key" ON "project_required_forms"("projectId", "companyDocumentId");

-- AddForeignKey
ALTER TABLE "service_required_forms" ADD CONSTRAINT "service_required_forms_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_required_forms" ADD CONSTRAINT "service_required_forms_companyDocumentId_fkey" FOREIGN KEY ("companyDocumentId") REFERENCES "company_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_required_forms" ADD CONSTRAINT "project_required_forms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_required_forms" ADD CONSTRAINT "project_required_forms_companyDocumentId_fkey" FOREIGN KEY ("companyDocumentId") REFERENCES "company_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
