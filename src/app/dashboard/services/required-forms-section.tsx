"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import {
  addServiceRequiredForm,
  removeServiceRequiredForm,
  reorderServiceRequiredForm,
  toggleServiceRequiredFormRequired,
} from "./actions";

export type RequiredFormRow = {
  id: string;
  companyDocumentId: string;
  title: string;
  required: boolean;
  order: number;
};

export function RequiredFormsSection({
  serviceId,
  requiredForms,
  availableForms,
}: {
  serviceId: string;
  requiredForms: RequiredFormRow[];
  availableForms: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");

  const assignedIds = new Set(requiredForms.map((form) => form.companyDocumentId));
  const options = availableForms.filter((form) => !assignedIds.has(form.id));
  const sorted = [...requiredForms].sort((a, b) => a.order - b.order);

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      await addServiceRequiredForm(serviceId, selected);
      setSelected("");
      notify.success("Form added");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeServiceRequiredForm(id);
      notify.success("Form removed");
    });
  }

  function handleToggleRequired(id: string, required: boolean) {
    startTransition(async () => {
      await toggleServiceRequiredFormRequired(id, required);
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderServiceRequiredForm(id, direction);
    });
  }

  return (
    <div className="grid gap-2">
      <Label>Required Forms</Label>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No required forms yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {sorted.map((form, index) => (
            <li key={form.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{form.title}</span>
                <Badge
                  variant={form.required ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleToggleRequired(form.id, !form.required)}
                >
                  {form.required ? "Required" : "Optional"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={isPending || index === 0}
                  onClick={() => handleReorder(form.id, "up")}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={isPending || index === sorted.length - 1}
                  onClick={() => handleReorder(form.id, "down")}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove form"
                  disabled={isPending}
                  onClick={() => handleRemove(form.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {options.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Select a form to add" />
            </SelectTrigger>
            <SelectContent>
              {options.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selected || isPending}
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
