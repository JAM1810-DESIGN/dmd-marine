"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { createExpenseCategory, toggleExpenseCategoryActive } from "./actions";

type CategoryRow = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleExpenseCategoryActive(id, checked);
          notify.success(checked ? "Category activated" : "Category deactivated");
        });
      }}
    />
  );
}

export function ExpenseCategoriesTable({
  categories,
  canManage,
}: {
  categories: CategoryRow[];
  canManage: boolean;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createExpenseCategory({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setName("");
      notify.success("Category added");
    });
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="p-4">
        <h2 className="font-heading text-base font-semibold">Expense Categories</h2>
        <p className="text-sm text-muted-foreground">
          23 default categories are seeded — add custom ones as needed.
        </p>
      </div>

      {canManage && (
        <form action={handleCreate} className="flex items-end gap-2 px-4 pb-4">
          <Input
            name="name"
            placeholder="New category name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="sm:w-64"
            required
          />
          <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>
      )}
      {error && <p className="px-4 pb-2 text-sm font-medium text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium text-foreground">{category.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{category.isDefault ? "Default" : "Custom"}</Badge>
              </TableCell>
              <TableCell>
                {canManage ? (
                  <ActiveToggle id={category.id} isActive={category.isActive} />
                ) : (
                  <Badge variant={category.isActive ? "default" : "outline"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
