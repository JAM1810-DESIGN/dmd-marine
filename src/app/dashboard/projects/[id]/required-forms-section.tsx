"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addProjectRequiredForm,
  removeProjectRequiredForm,
  reorderProjectRequiredForm,
  toggleProjectRequiredFormCompleted,
  toggleProjectRequiredFormRequired,
} from "../actions";

type RequiredFormRow = {
  id: string;
  companyDocumentId: string;
  title: string;
  url: string;
  required: boolean;
  completed: boolean;
  order: number;
};

export function RequiredFormsSection({
  projectId,
  requiredForms,
  availableForms,
  canManage,
}: {
  projectId: string;
  requiredForms: RequiredFormRow[];
  availableForms: { id: string; title: string }[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");

  const assignedIds = new Set(requiredForms.map((form) => form.companyDocumentId));
  const options = availableForms.filter((form) => !assignedIds.has(form.id));
  const sorted = [...requiredForms].sort((a, b) => a.order - b.order);

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      await addProjectRequiredForm(projectId, selected);
      setSelected("");
      notify.success("Form added");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeProjectRequiredForm(projectId, id);
      notify.success("Form removed");
    });
  }

  function handleToggleRequired(id: string, required: boolean) {
    startTransition(async () => {
      await toggleProjectRequiredFormRequired(projectId, id, required);
    });
  }

  function handleToggleCompleted(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleProjectRequiredFormCompleted(projectId, id, completed);
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderProjectRequiredForm(projectId, id, direction);
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Required Forms</h2>
        <p className="text-sm text-muted-foreground">
          Forms and paperwork needed to complete this project.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState className="border-none" title="No required forms yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((form, index) => (
            <li key={form.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                {canManage ? (
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={form.completed}
                    disabled={isPending}
                    onChange={(event) => handleToggleCompleted(form.id, event.target.checked)}
                    aria-label={`Mark ${form.title} completed`}
                  />
                ) : (
                  <Badge variant={form.completed ? "success" : "outline"}>
                    {form.completed ? "Done" : "Pending"}
                  </Badge>
                )}
                <a
                  href={form.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{form.title}</span>
                </a>
                <Badge
                  variant={form.required ? "default" : "outline"}
                  className={canManage ? "cursor-pointer" : undefined}
                  onClick={
                    canManage ? () => handleToggleRequired(form.id, !form.required) : undefined
                  }
                >
                  {form.required ? "Required" : "Optional"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={form.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={`Open ${form.title}`}
                  title="Open"
                >
                  <ExternalLink className="size-4" />
                </a>
                <a
                  href={form.url}
                  download
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={`Download ${form.title}`}
                  title="Download"
                >
                  <Download className="size-4" />
                </a>
                {canManage && (
                  <>
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
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 pt-2">
          <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
            <SelectTrigger size="sm" className="w-[220px]">
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
          <Button type="button" size="sm" disabled={!selected || isPending} onClick={handleAdd}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
