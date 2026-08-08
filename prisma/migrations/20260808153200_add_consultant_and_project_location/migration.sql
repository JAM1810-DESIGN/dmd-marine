-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "baseLocation" TEXT;
