-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "documents_invoiceId_idx" ON "documents"("invoiceId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
