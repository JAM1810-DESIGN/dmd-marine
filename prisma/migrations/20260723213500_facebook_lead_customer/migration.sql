-- AlterTable
ALTER TABLE "facebook_leads" ADD COLUMN "customerId" TEXT;

-- CreateIndex
CREATE INDEX "facebook_leads_customerId_idx" ON "facebook_leads"("customerId");

-- AddForeignKey
ALTER TABLE "facebook_leads" ADD CONSTRAINT "facebook_leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
