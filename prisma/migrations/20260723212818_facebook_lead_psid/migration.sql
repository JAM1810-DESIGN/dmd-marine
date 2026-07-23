-- AlterTable
ALTER TABLE "facebook_leads" ADD COLUMN "psid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "facebook_leads_psid_key" ON "facebook_leads"("psid");
