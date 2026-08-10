"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createRoleAction,
  deleteRoleAction,
  saveRoleAccessAction,
  type AccessRole,
} from "@/lib/actions/access";
import type { ActionState } from "@/lib/actions/inventory";
import type { NavCatalogItem, NavGroup, Permission } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const initialState: ActionState = { success: false };

const groupLabels: Record<NavGroup, string> = {
  analytics: "Analytics",
  oil: "Oil Management",
  taxation: "Taxation",
  staff: "Staff Management",
  customers: "Customer Management",
  tickets: "Ticket Management",
  configuration: "Configuration",
};

function RoleAccessForm({
  role,
  catalog,
  granted,
  onDeleted,
}: {
  role: AccessRole;
  catalog: NavCatalogItem[];
  granted: Permission[];
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveRoleAccessAction,
    initialState
  );
  const [deleting, startDelete] = useTransition();
  const [enabled, setEnabled] = useState(
    () =>
      new Set(
        catalog
          .filter((item) => granted.includes(item.permission))
          .map((i) => i.href)
      )
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  const grouped = catalog.reduce<Record<string, NavCatalogItem[]>>(
    (acc, item) => {
      const key = item.group ?? "top";
      (acc[key] ??= []).push(item);
      return acc;
    },
    {}
  );

  function toggle(href: string, checked: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (checked) next.add(href);
      else next.delete(href);
      return next;
    });
  }

  function handleDelete() {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteRoleAction(role.id);
      if (result.success) {
        toast.success(result.message);
        onDeleted();
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="roleId" value={role.id} />
      {Array.from(enabled).map((href) => (
        <input key={href} type="hidden" name="routes" value={href} />
      ))}

      {(
        ["top", "analytics", "oil", "tickets", "configuration"] as const
      ).map((key) => {
        const items = grouped[key];
        if (!items?.length) return null;
        const title =
          key === "top" ? "General" : groupLabels[key as NavGroup];

        return (
          <div key={key} className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">{title}</p>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.href}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <Label htmlFor={`${role.id}-${item.href}`}>
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.href}</p>
                  </div>
                  <Switch
                    id={`${role.id}-${item.href}`}
                    checked={enabled.has(item.href)}
                    onCheckedChange={(checked) => toggle(item.href, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="min-h-11">
          Save {role.name} access
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={handleDelete}
          className="min-h-11"
        >
          Delete role
        </Button>
      </div>
    </form>
  );
}

function CreateRoleForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createRoleAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="roleName">New role</Label>
        <Input
          id="roleName"
          name="name"
          placeholder="e.g. Cashier"
          required
        />
      </div>
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Creating…" : "Create role"}
      </Button>
    </form>
  );
}

export function AccessAdmin({
  catalog,
  roles,
  permissionsByRoleId,
}: {
  catalog: NavCatalogItem[];
  roles: AccessRole[];
  permissionsByRoleId: Record<string, Permission[]>;
}) {
  const [active, setActive] = useState(roles[0]?.id ?? "");

  useEffect(() => {
    if (roles.length === 0) {
      setActive("");
      return;
    }
    if (!roles.some((role) => role.id === active)) {
      setActive(roles[0].id);
    }
  }, [roles, active]);

  return (
    <div className="space-y-6">
      <CreateRoleForm />

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No custom roles yet. Create a role above, then assign route access and
          users.
        </p>
      ) : (
        <Tabs value={active} onValueChange={setActive}>
          <TabsList>
            {roles.map((role) => (
              <TabsTrigger key={role.id} value={role.id}>
                {role.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="mt-4">
              <RoleAccessForm
                role={role}
                catalog={catalog}
                granted={permissionsByRoleId[role.id] ?? []}
                onDeleted={() => {
                  const next = roles.find((r) => r.id !== role.id);
                  setActive(next?.id ?? "");
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
