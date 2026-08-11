"use client";

import { useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import { toggleCategoryActive } from "./actions";
import { CategoryFormDialog } from "./category-form-dialog";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  isActive: boolean;
  serviceCount: number;
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleCategoryActive(id, checked);
          notify.success(checked ? "Category activated" : "Category deactivated");
        });
      }}
    />
  );
}

export function CategoriesTable({
  categories,
  canManage,
}: {
  categories: CategoryRow[];
  canManage: boolean;
}) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-teal-500 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Group services and control what&apos;s shown on the website.
          </p>
        </div>
        {canManage && (
          <CategoryFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                New Category
              </Button>
            }
          />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <div className="font-medium text-foreground">{category.name}</div>
                <div className="text-xs text-muted-foreground">/{category.slug}</div>
              </TableCell>
              <TableCell>{category.serviceCount}</TableCell>
              <TableCell>
                {canManage ? (
                  <ActiveToggle id={category.id} isActive={category.isActive} />
                ) : (
                  <Badge variant={category.isActive ? "default" : "outline"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {canManage && (
                  <CategoryFormDialog
                    category={category}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Edit category">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
