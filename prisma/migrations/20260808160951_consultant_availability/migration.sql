-- CreateEnum
CREATE TYPE "ConsultantAvailability" AS ENUM ('AVAILABLE', 'NOT_AVAILABLE', 'ONBOARD');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availability" "ConsultantAvailability" NOT NULL DEFAULT 'AVAILABLE';
