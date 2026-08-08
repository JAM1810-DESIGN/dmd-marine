/*
  Warnings:

  - You are about to drop the column `baseLocation` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "baseLocation",
ADD COLUMN     "baseLocations" TEXT[] DEFAULT ARRAY[]::TEXT[];
