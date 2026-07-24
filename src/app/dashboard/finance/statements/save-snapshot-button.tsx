"use client";

import { useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { saveStatementSnapshot } from "./actions";
import type { FinancialStatementType } from "@/generated/prisma/enums";

export function SaveSnapshotButton({
  type,
  periodStart,
  periodEnd,
  data,
}: {
  type: FinancialStatementType;
  periodStart: string;
  periodEnd: string;
  data: unknown;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await saveStatementSnapshot(type, periodStart, periodEnd, data);
          notify.success("Statement saved");
        })
      }
    >
      <Save className="size-4" />
      Save Snapshot
    </Button>
  );
}
