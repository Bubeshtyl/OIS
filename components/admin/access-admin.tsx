"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveRoleAccessAction } from "@/lib/actions/access";
import type { ActionState } from "@/lib/actions/inventory";
import type { NavCatalogItem, NavGroup, Permission } from "@/lib/auth/rbac";
import type { EditableRole } from "@/lib/auth/role-defaults";
import { Button } from "@/components/ui/button";
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
  oil: "Oil Management",
  tickets: "Ticket Management",
  configuration: "Configuration",
};

function RoleAccessForm({
  role,
  catalog,
  granted,
}: {
  role: EditableRole;
  catalog: NavCatalogItem[];
  granted: Permission[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveRoleAccessAction,
    initialState
  );
  const [enabled, setEnabled] = useState(
    () => new Set(catalog.filter((item) => granted.includes(item.permission)).map((i) => i.href))
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  const grouped = catalog.reduce<Record<string, NavCatalogItem[]>>((acc, item) => {
    const key = item.group ?? "top";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  function toggle(href: string, checked: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (checked) next.add(href);
      else next.delete(href);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      {Array.from(enabled).map((href) => (
        <input key={href} type="hidden" name="routes" value={href} />
      ))}

      {(["top", "oil", "tickets", "configuration"] as const).map((key) => {
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
                    <Label htmlFor={`${role}-${item.href}`}>{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.href}</p>
                  </div>
                  <Switch
                    id={`${role}-${item.href}`}
                    checked={enabled.has(item.href)}
                    onCheckedChange={(checked) => toggle(item.href, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Button type="submit" disabled={pending} className="min-h-11">
        Save {role === "MANAGER" ? "Manager" : "Accounts"} access
      </Button>
    </form>
  );
}

export function AccessAdmin({
  catalog,
  permissionsByRole,
}: {
  catalog: NavCatalogItem[];
  permissionsByRole: Record<EditableRole, Permission[]>;
}) {
  return (
    <Tabs defaultValue="MANAGER">
      <TabsList>
        <TabsTrigger value="MANAGER">Manager</TabsTrigger>
        <TabsTrigger value="ACCOUNTS">Accounts</TabsTrigger>
      </TabsList>
      <TabsContent value="MANAGER" className="mt-4">
        <RoleAccessForm
          role="MANAGER"
          catalog={catalog}
          granted={permissionsByRole.MANAGER}
        />
      </TabsContent>
      <TabsContent value="ACCOUNTS" className="mt-4">
        <RoleAccessForm
          role="ACCOUNTS"
          catalog={catalog}
          granted={permissionsByRole.ACCOUNTS}
        />
      </TabsContent>
    </Tabs>
  );
}
