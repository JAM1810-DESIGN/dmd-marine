-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "requiredFormId" TEXT;

-- AlterTable
ALTER TABLE "project_required_forms" ADD COLUMN     "label" TEXT,
ALTER COLUMN "companyDocumentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "documents_requiredFormId_idx" ON "documents"("requiredFormId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_requiredFormId_fkey" FOREIGN KEY ("requiredFormId") REFERENCES "project_required_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
