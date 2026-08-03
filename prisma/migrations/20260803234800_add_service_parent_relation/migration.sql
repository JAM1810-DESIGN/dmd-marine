-- AlterTable
ALTER TABLE "services" ADD COLUMN     "parentServiceId" TEXT;

-- CreateIndex
CREATE INDEX "services_parentServiceId_idx" ON "services"("parentServiceId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_parentServiceId_fkey" FOREIGN KEY ("parentServiceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
