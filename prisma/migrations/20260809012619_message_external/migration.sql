-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "externalEmail" TEXT,
ADD COLUMN     "externalName" TEXT,
ADD COLUMN     "payload" JSONB;
