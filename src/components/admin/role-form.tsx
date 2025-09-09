"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const keyRegex = /^[a-z0-9._-]+$/;

const baseSchema = {
  name: z.string().min(2, "Name is required"),
  description: z.string().trim().optional(),
  permissionKeys: z.array(z.string()).min(1, "Select at least one permission"),
};

const createSchema = z.object({
  ...baseSchema,
  key: z.string().min(2).regex(keyRegex, "Use a-z, 0-9, dot, underscore, hyphen"),
});
const editSchema = z.object(baseSchema);

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

type Props = {
  mode: "create" | "edit";
  allPermissions: { key: string; name: string }[];
  initial:
    | null
    | {
        id: string;
        key: string;
        name: string;
        builtin: boolean;
        description: string | null;
        permissionKeys: string[];
        members?: number;
      };
};

function slugifyKey(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export default function RoleForm({ mode, allPermissions, initial }: Props) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const defaultPerms = useMemo<string[]>(
    () => initial?.permissionKeys ?? [],
    [initial?.permissionKeys]
  );

  const form = useForm<any>({
    resolver: zodResolver(mode === "create" ? createSchema : editSchema),
    defaultValues:
      mode === "create"
        ? ({ name: "", key: "", description: "", permissionKeys: [] } as CreateValues)
        : ({
            name: initial?.name ?? "",
            description: initial?.description ?? "",
            permissionKeys: defaultPerms,
          } as EditValues),
    mode: "onBlur",
  });

  async function onSubmit(values: CreateValues | EditValues) {
    setSaving(true);
    try {
      const res =
        mode === "create"
          ? await fetch("/api/admin/roles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            })
          : await fetch(`/api/admin/roles/${initial!.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });

      let msg = "Failed to save role.";
      try {
        const body = await res.json();
        if (!res.ok) {
          msg = body?.error?.message ?? msg;
          throw new Error(msg);
        }
      } catch (e: any) {
        if (!res.ok) throw e;
      }

      toast({ message: "Saved" });
      router.push("/admin/roles");
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", message: e.message ?? "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm("Delete this role? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/roles/${initial.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error?.message ?? "Delete failed");
      }
      toast({ message: "Deleted" });
      router.push("/admin/roles");
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", message: e.message ?? "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  // Auto-slug key on name input (create mode only)
  function handleNameBlur() {
    if (mode !== "create") return;
    const currName = form.getValues("name") as string;
    const currKey = form.getValues("key") as string;
    if (!currKey && currName) {
      form.setValue("key", slugifyKey(currName));
    }
  }

  const builtin = initial?.builtin ?? false;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input className="bg-background" {...field} onBlur={(e) => { field.onBlur(); handleNameBlur(); }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Key (create only) */}
        {mode === "create" ? (
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key</FormLabel>
                <FormControl>
                  <Input className="bg-background font-mono" placeholder="catalog-manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="grid gap-1">
            <div className="text-sm font-medium">Key</div>
            <div className="rounded-md border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {initial?.key}
            </div>
          </div>
        )}

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input className="bg-background" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Permissions checklist */}
        <div className="grid gap-2">
          <div className="text-sm font-medium">Permissions</div>
          <div className="rounded-md border p-3">
            <ul className="grid gap-2">
              {allPermissions.map((p) => {
                const checked = (form.watch("permissionKeys") as string[]).includes(p.key);
                return (
                  <li key={p.key} className="flex items-center gap-2">
                    <input
                      id={`perm_${p.key}`}
                      type="checkbox"
                      className="size-4"
                      checked={checked}
                      onChange={(e) => {
                        const curr = new Set(form.getValues("permissionKeys") as string[]);
                        if (e.target.checked) curr.add(p.key);
                        else curr.delete(p.key);
                        form.setValue("permissionKeys", Array.from(curr), { shouldValidate: true });
                      }}
                    />
                    <label htmlFor={`perm_${p.key}`} className="text-sm">
                      <span className="font-mono text-xs mr-2 rounded border px-1 py-[1px]">{p.key}</span>
                      {p.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <FormMessage>
            {/* RHF displays errors attached to permissionKeys via the field above */}
          </FormMessage>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-muted-foreground text-xs">
            {builtin ? "Built-in roles cannot be deleted." : null}
          </div>

          <div className="flex gap-2">
            {mode === "edit" && !builtin && (
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={onDelete}
                className="rounded-md"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button type="submit" disabled={saving} className="rounded-md">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
