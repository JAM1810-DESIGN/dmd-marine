import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactHistoryFormDialog } from "./contact-history-form-dialog";

type ContactHistoryRow = {
  id: string;
  type: string;
  summary: string;
  occurredAt: Date;
  createdByName: string | null;
};

export function ContactHistorySection({
  customerId,
  entries,
  canManage,
}: {
  customerId: string;
  entries: ContactHistoryRow[];
  canManage: boolean;
}) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-heading text-base font-semibold">Contact History</h2>
        {canManage && (
          <ContactHistoryFormDialog
            customerId={customerId}
            trigger={
              <Button size="sm" variant="outline">
                <MessageSquarePlus className="size-4" />
                Log Contact
              </Button>
            }
          />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No contact history yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{entry.type.replace(/_/g, " ")}</Badge>
                <span className="text-xs text-muted-foreground">
                  {entry.occurredAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {entry.createdByName && ` · ${entry.createdByName}`}
                </span>
              </div>
              <p className="text-sm text-foreground">{entry.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
