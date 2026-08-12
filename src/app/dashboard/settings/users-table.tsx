"use client";

import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notify } from "@/lib/notify";
import { updateUserRole, toggleUserActive, deleteUser } from "./actions";
import { CreateUserDialog } from "./create-user-dialog";

const ROLES = ["ADMIN", "MANAGER", "STAFF", "FINANCE_OFFICER"] as const;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

function RoleSelect({ id, role, isSelf }: { id: string; role: string; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isSelf) {
    return <Badge variant="outline">{role.replace(/_/g, " ")}</Badge>;
  }

  return (
    <Select
      value={role}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(async () => {
          await updateUserRole(id, value as (typeof ROLES)[number]);
          notify.success("Role updated");
        });
      }}
    >
      <SelectTrigger size="sm" className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((option) => (
          <SelectItem key={option} value={option}>
            {option.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveToggle({ id, isActive, isSelf }: { id: string; isActive: boolean; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isSelf) {
    return <Badge variant="default">Active</Badge>;
  }

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          await toggleUserActive(id, checked);
          notify.success(checked ? "Account activated" : "Account deactivated");
        });
      }}
    />
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-label={`Delete ${name}`}
      className="text-muted-foreground hover:text-destructive"
      onClick={() => {
        if (!window.confirm(`Delete ${name}? This can't be undone.`)) return;
        startTransition(async () => {
          try {
            await deleteUser(id);
            notify.success("Account deleted");
          } catch (error) {
            notify.error(
              "Couldn't delete",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="rounded-xl border-t-[3px] border-t-neutral-400 bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <div>
          <h2 className="font-heading text-base font-semibold">Staff Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage who can sign in to the dashboard and their role.
          </p>
        </div>
        <CreateUserDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              New Account
            </Button>
          }
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-10 text-right sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {user.name}
                    {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <RoleSelect id={user.id} role={user.role} isSelf={isSelf} />
                </TableCell>
                <TableCell>
                  <ActiveToggle id={user.id} isActive={user.isActive} isSelf={isSelf} />
                </TableCell>
                <TableCell className="text-right">
                  {!isSelf && <DeleteButton id={user.id} name={user.name} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
