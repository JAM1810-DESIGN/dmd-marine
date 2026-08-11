"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Download, ExternalLink, FileText, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  addCustomProjectRequiredForm,
  renameProjectRequiredForm,
  removeProjectRequiredForm,
  reorderProjectRequiredForm,
  toggleProjectRequiredFormRequired,
} from "../actions";

type RequiredFormRow = {
  id: string;
  companyDocumentId: string | null;
  title: string;
  templateUrl: string | null;
  required: boolean;
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
  const [custom, setCustom] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const assignedIds = new Set(requiredForms.map((f) => f.companyDocumentId).filter(Boolean));
  const options = availableForms.filter((f) => !assignedIds.has(f.id));
  const sorted = [...requiredForms].sort((a, b) => a.order - b.order);

  function addFromLibrary() {
    if (!selected) return;
    startTransition(async () => {
      await addProjectRequiredForm(projectId, selected);
      setSelected("");
      notify.success("Form added");
    });
  }

  function addCustom() {
    if (!custom.trim()) return;
    startTransition(async () => {
      const result = await addCustomProjectRequiredForm(projectId, custom);
      if (result.error) notify.error(result.error);
      else {
        setCustom("");
        notify.success("Form added");
      }
    });
  }

  function saveRename(id: string) {
    if (!editValue.trim()) return;
    startTransition(async () => {
      const result = await renameProjectRequiredForm(projectId, id, editValue);
      if (result.error) notify.error(result.error);
      else {
        setEditingId(null);
        notify.success("Renamed");
      }
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Required Forms</h2>
        <p className="text-sm text-muted-foreground">
          Itemized list for this project — add, rename, or delete.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState className="border-none" title="No required forms yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((form, index) => (
            <li key={form.id} className="flex items-center justify-between gap-3 px-4 py-3">
              {editingId === form.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(form.id)}
                    className="h-8"
                  />
                  <Button size="icon-sm" variant="ghost" aria-label="Save" disabled={isPending} onClick={() => saveRename(form.id)}>
                    <Check className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditingId(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">{form.title}</span>
                  <Badge
                    variant={form.required ? "default" : "outline"}
                    className={canManage ? "cursor-pointer" : undefined}
                    onClick={canManage ? () => startTransition(() => toggleProjectRequiredFormRequired(projectId, form.id, !form.required)) : undefined}
                  >
                    {form.required ? "Required" : "Optional"}
                  </Badge>
                  {form.templateUrl && (
                    <>
                      <a href={form.templateUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Open template" title="Open blank form">
                        <ExternalLink className="size-4" />
                      </a>
                      <a href={form.templateUrl} download className="text-muted-foreground hover:text-foreground" aria-label="Download template" title="Download blank form">
                        <Download className="size-4" />
                      </a>
                    </>
                  )}
                </div>
              )}

              {canManage && editingId !== form.id && (
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={isPending || index === 0} onClick={() => startTransition(() => reorderProjectRequiredForm(projectId, form.id, "up"))}>
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={isPending || index === sorted.length - 1} onClick={() => startTransition(() => reorderProjectRequiredForm(projectId, form.id, "down"))}>
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Rename" onClick={() => { setEditingId(form.id); setEditValue(form.title); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete" disabled={isPending} onClick={() => startTransition(async () => { await removeProjectRequiredForm(projectId, form.id); notify.success("Form removed"); })}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-2 border-t border-border p-4">
          {options.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selected} onValueChange={(value) => setSelected(typeof value === "string" ? value : "")}>
                <SelectTrigger size="sm" className="w-[220px]">
                  <SelectValue placeholder="Add from library…" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" disabled={!selected || isPending} onClick={addFromLibrary}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Or type a new form name…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              className="h-8 w-[220px]"
            />
            <Button type="button" size="sm" disabled={!custom.trim() || isPending} onClick={addCustom}>
              <Plus className="size-4" />
              Add form
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
