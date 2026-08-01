import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return <AccessDenied message="Only administrators can view the audit log." />;
  }

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          The 200 most recent sensitive actions: sign-ins, account changes, expense approvals, and payments.
        </p>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/10">
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.createdAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {log.user?.name ?? log.user?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
