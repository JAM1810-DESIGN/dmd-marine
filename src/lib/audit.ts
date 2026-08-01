import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const ipAddress = await getClientIp().catch(() => null);
  await db.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata ?? undefined,
      ipAddress,
    },
  });
}
