-- CreateEnum
CREATE TYPE "CompanyDocumentCategory" AS ENUM ('DOCUMENT', 'FORM');

-- CreateTable
CREATE TABLE "company_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "CompanyDocumentCategory" NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_documents_category_idx" ON "company_documents"("category");

-- AddForeignKey
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
