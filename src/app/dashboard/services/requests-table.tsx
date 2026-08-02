import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

type RequestRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  status: string;
  createdAt: Date;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  NEW: "default",
  REVIEWING: "secondary",
  SCHEDULED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export function RequestsTable({ requests }: { requests: RequestRow[] }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Recent Requests</h2>
        <p className="text-sm text-muted-foreground">
          Booking requests submitted through the website. Full scheduling and
          status management lands in the Bookings module (Phase 5).
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState className="border-none" title="No service requests yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{request.customerName}</div>
                  <div className="text-xs text-muted-foreground">{request.customerEmail}</div>
                </TableCell>
                <TableCell>{request.serviceName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[request.status] ?? "outline"}>
                    {request.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {request.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
