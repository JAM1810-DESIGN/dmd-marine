"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  addServiceRequiredForm,
  removeServiceRequiredForm,
  reorderServiceRequiredForm,
  toggleServiceRequiredFormRequired,
  uploadServiceRequiredForm,
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
  storageConfigured = true,
}: {
  serviceId: string;
  requiredForms: RequiredFormRow[];
  availableForms: { id: string; title: string }[];
  storageConfigured?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<"FORM" | "DOCUMENT">("FORM");
  const [uploading, startUpload] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

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

  function handleUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      notify.error("Choose a file first.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", uploadTitle);
    fd.set("category", uploadCategory);
    startUpload(async () => {
      const result = await uploadServiceRequiredForm(serviceId, fd);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      notify.success("Uploaded & attached");
      setUploadTitle("");
      if (fileInput.current) fileInput.current.value = "";
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
              <SelectValue placeholder="Select an existing form to add" />
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

      {/* Upload a brand-new form/document and attach it in one step. */}
      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">Upload a new form or document</p>
        {storageConfigured ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Title (defaults to file name)"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                className="h-9"
              />
              <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v === "DOCUMENT" ? "DOCUMENT" : "FORM")}>
                <SelectTrigger size="sm" className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORM">Form</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={handleUpload}>
                <Upload className="size-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            File storage isn&apos;t configured. Set the Cloudinary env vars to upload new forms here.
          </p>
        )}
      </div>
    </div>
  );
}
