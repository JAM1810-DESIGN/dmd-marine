"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { isFaqArray, type FaqItem } from "@/lib/faq";
import { createService, updateService } from "./actions";
import { RequiredFormsSection, type RequiredFormRow } from "./required-forms-section";

type ServiceRecord = {
  id: string;
  name: string;
  categoryId: string;
  parentServiceId: string | null;
  overview: string | null;
  benefits: string | null;
  scope: string | null;
  process: string | null;
  defaultConsultantId: string | null;
  order: number;
  faq: unknown;
  requiredForms: RequiredFormRow[];
};

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  categories,
  consultants,
  topLevelServices,
  availableForms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceRecord;
  categories: { id: string; name: string }[];
  consultants: { id: string; name: string }[];
  topLevelServices: { id: string; name: string }[];
  availableForms: { id: string; title: string }[];
}) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  // Reset via the `key` prop on the parent (per service id / "new"), not an effect.
  const [faqItems, setFaqItems] = useState<FaqItem[]>(() =>
    isFaqArray(service?.faq) ? service.faq : [],
  );

  const parentOptions = topLevelServices.filter((option) => option.id !== service?.id);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = service
        ? await updateService(service.id, {}, formData)
        : await createService({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      setError(undefined);
      notify.success(service ? "Service updated" : "Service created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={service?.name} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={service?.categoryId} required>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="parentServiceId">Parent Service</Label>
            <Select name="parentServiceId" defaultValue={service?.parentServiceId ?? "none"}>
              <SelectTrigger id="parentServiceId" className="w-full">
                <SelectValue placeholder="None (top-level service)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level service)</SelectItem>
                {parentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="overview">Overview</Label>
            <Textarea id="overview" name="overview" defaultValue={service?.overview ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="benefits">Benefits</Label>
            <Textarea id="benefits" name="benefits" defaultValue={service?.benefits ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Textarea id="scope" name="scope" defaultValue={service?.scope ?? ""} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="process">Process</Label>
            <Textarea id="process" name="process" defaultValue={service?.process ?? ""} rows={3} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="defaultConsultantId">Default Consultant</Label>
              <Select name="defaultConsultantId" defaultValue={service?.defaultConsultantId ?? "none"}>
                <SelectTrigger id="defaultConsultantId" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="order">Display Order</Label>
              <Input id="order" name="order" type="number" defaultValue={service?.order ?? 0} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>FAQ</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqItems((items) => [...items, { question: "", answer: "" }])}
              >
                <Plus className="size-4" />
                Add Question
              </Button>
            </div>

            {faqItems.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(event) =>
                      setFaqItems((items) =>
                        items.map((it, i) =>
                          i === index ? { ...it, question: event.target.value } : it,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove question"
                    onClick={() => setFaqItems((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Answer"
                  rows={2}
                  value={item.answer}
                  onChange={(event) =>
                    setFaqItems((items) =>
                      items.map((it, i) => (i === index ? { ...it, answer: event.target.value } : it)),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <input type="hidden" name="faq" value={JSON.stringify(faqItems)} readOnly />

          {service && (
            <RequiredFormsSection
              serviceId={service.id}
              requiredForms={service.requiredForms}
              availableForms={availableForms}
            />
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="self-end">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
