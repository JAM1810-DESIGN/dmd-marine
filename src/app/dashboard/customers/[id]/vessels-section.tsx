"use client";

import { Pencil, Plus, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VesselFormDialog } from "./vessel-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";

type VesselRow = {
  id: string;
  name: string;
  imoNumber: string | null;
  type: string | null;
  flag: string | null;
};

export function VesselsSection({
  customerId,
  vessels,
  canManage,
}: {
  customerId: string;
  vessels: VesselRow[];
  canManage: boolean;
}) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-blue-500 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-heading text-base font-semibold">Vessels</h2>
        {canManage && (
          <VesselFormDialog
            customerId={customerId}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Add Vessel
              </Button>
            }
          />
        )}
      </div>

      {vessels.length === 0 ? (
        <EmptyState className="border-none" title="No vessels on file" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {vessels.map((vessel) => (
            <li key={vessel.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Ship className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{vessel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[vessel.type, vessel.flag, vessel.imoNumber && `IMO ${vessel.imoNumber}`]
                      .filter(Boolean)
                      .join(" · ") || "No further details"}
                  </p>
                </div>
              </div>
              {canManage && (
                <VesselFormDialog
                  customerId={customerId}
                  vessel={vessel}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Edit vessel">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
