"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createRoleAction,
  deleteRoleAction,
  saveRoleAccessAction,
  saveStaffAccessAction,
  type AccessRole,
} from "@/lib/actions/access";
import type { ActionState } from "@/lib/actions/inventory";
import type { NavCatalogItem, NavGroup, Permission } from "@/lib/auth/rbac";
import type { StaffMember } from "@/lib/staff/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const initialState: ActionState = { success: false };

const groupLabels: Record<NavGroup, string> = {
  "shift-closing": "Shift Closing",
  analytics: "Analytics",
  oil: "Oil / Lubes",
  "invoice-purchase": "Invoice Purchase",
  taxation: "Taxation",
  staff: "Staff Management",
  customers: "Customer Management",
  tickets: "Ticket Management",
  configuration: "Configuration",
};

const GROUP_ORDER = [
  "top",
  "shift-closing",
  "invoice-purchase",
  "oil",
  "analytics",
  "taxation",
  "staff",
  "customers",
  "tickets",
  "configuration",
] as const;

function hrefsForPermissions(
  catalog: NavCatalogItem[],
  granted: Permission[]
) {
  return new Set(
    catalog
      .filter((item) => granted.includes(item.permission))
      .map((item) => item.href)
  );
}

function RouteAccessFields({
  roleId,
  catalog,
  enabled,
  onToggle,
}: {
  roleId: string;
  catalog: NavCatalogItem[];
  enabled: Set<string>;
  onToggle: (href: string, checked: boolean) => void;
}) {
  const grouped = catalog.reduce<Record<string, NavCatalogItem[]>>(
    (acc, item) => {
      const key = item.group ?? "top";
      (acc[key] ??= []).push(item);
      return acc;
    },
    {}
  );

  return (
    <>
      {Array.from(enabled).map((href) => (
        <input key={href} type="hidden" name="routes" value={href} />
      ))}
      {GROUP_ORDER.map((key) => {
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
                  <Label htmlFor={`${roleId}-${item.href}`}>
                    {item.label}
                  </Label>
                  <Switch
                    id={`${roleId}-${item.href}`}
                    checked={enabled.has(item.href)}
                    onCheckedChange={(checked) => onToggle(item.href, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

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
    () => hrefsForPermissions(catalog, granted)
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

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
      <RouteAccessFields
        roleId={role.id}
        catalog={catalog}
        enabled={enabled}
        onToggle={toggle}
      />
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
        <Input id="roleName" name="name" required />
      </div>
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Creating…" : "Create role"}
      </Button>
    </form>
  );
}

function StaffAccessEditor({
  staffMember,
  staff,
  assignableRoles,
  catalog,
  permissionsByRoleId,
  adminRoleId,
  onStaffChange,
}: {
  staffMember: StaffMember;
  staff: StaffMember[];
  assignableRoles: AccessRole[];
  catalog: NavCatalogItem[];
  permissionsByRoleId: Record<string, Permission[]>;
  adminRoleId: string | null;
  onStaffChange: (staffId: string) => void;
}) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(staffMember.roleId ?? "");
  const [enabled, setEnabled] = useState(() =>
    hrefsForPermissions(
      catalog,
      permissionsByRoleId[staffMember.roleId ?? ""] ?? []
    )
  );
  const [state, formAction, pending] = useActionState(
    saveStaffAccessAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/staff");
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  function handleRoleChange(value: string | null) {
    if (!value) return;
    setRoleId(value);
    setEnabled(
      hrefsForPermissions(catalog, permissionsByRoleId[value] ?? [])
    );
  }

  function toggle(href: string, checked: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (checked) next.add(href);
      else next.delete(href);
      return next;
    });
  }

  const isAdminRole = Boolean(adminRoleId && roleId === adminRoleId);
  const staffItems = staff.map((member) => ({
    value: member.id,
    label: member.isActive ? member.name : `${member.name} (Inactive)`,
  }));
  const roleItems = assignableRoles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="staffId" value={staffMember.id} />
      <input type="hidden" name="roleId" value={roleId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Staff</Label>
          <Select
            value={staffMember.id}
            onValueChange={(value) => value && onStaffChange(value)}
            items={staffItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.isActive ? member.name : `${member.name} (Inactive)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={roleId || undefined}
            onValueChange={handleRoleChange}
            items={roleItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {roleId && !isAdminRole ? (
        <RouteAccessFields
          roleId={roleId}
          catalog={catalog}
          enabled={enabled}
          onToggle={toggle}
        />
      ) : null}

      <Button
        type="submit"
        disabled={pending || !roleId}
        className="min-h-11"
      >
        Save staff access
      </Button>
    </form>
  );
}

function StaffAccessForm({
  staff,
  assignableRoles,
  catalog,
  permissionsByRoleId,
  adminRoleId,
}: {
  staff: StaffMember[];
  assignableRoles: AccessRole[];
  catalog: NavCatalogItem[];
  permissionsByRoleId: Record<string, Permission[]>;
  adminRoleId: string | null;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const selectedStaff =
    staff.find((member) => member.id === staffId) ?? staff[0] ?? null;

  if (!selectedStaff) {
    return <p className="text-sm text-muted-foreground">No staff yet.</p>;
  }

  return (
    <StaffAccessEditor
      key={selectedStaff.id}
      staffMember={selectedStaff}
      staff={staff}
      assignableRoles={assignableRoles}
      catalog={catalog}
      permissionsByRoleId={permissionsByRoleId}
      adminRoleId={adminRoleId}
      onStaffChange={setStaffId}
    />
  );
}

export function AccessAdmin({
  catalog,
  roles,
  assignableRoles,
  permissionsByRoleId,
  staff,
  adminRoleId,
}: {
  catalog: NavCatalogItem[];
  roles: AccessRole[];
  assignableRoles: AccessRole[];
  permissionsByRoleId: Record<string, Permission[]>;
  staff: StaffMember[];
  adminRoleId: string | null;
}) {
  const [active, setActive] = useState(roles[0]?.id ?? "");
  const activeRoleId = roles.some((role) => role.id === active)
    ? active
    : (roles[0]?.id ?? "");

  return (
    <Tabs defaultValue="staff" className="space-y-6">
      <TabsList>
        <TabsTrigger value="staff">Staff</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
      </TabsList>

      <TabsContent value="staff" className="mt-4">
        <StaffAccessForm
          staff={staff}
          assignableRoles={assignableRoles}
          catalog={catalog}
          permissionsByRoleId={permissionsByRoleId}
          adminRoleId={adminRoleId}
        />
      </TabsContent>

      <TabsContent value="roles" className="mt-4 space-y-6">
        <CreateRoleForm />

        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom roles yet.
          </p>
        ) : (
          <Tabs value={activeRoleId} onValueChange={setActive}>
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
      </TabsContent>
    </Tabs>
  );
}
