// src/components/admin/new-member-form.tsx
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const schema = z.object({
  email: z.string().email(),
  name: z.string().trim().optional(),
  roleKey: z.string().min(2),
  password: z.string().min(8).optional(),
});
type FormValues = z.input<typeof schema>;

export default function NewMemberForm({ roles }: { roles: { key: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "", roleKey: "EDITOR", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const res = await fetch(`/api/admin/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!res.ok) {
      const msg = await res.text();
      alert(`Failed: ${msg}`);
      return;
    }
    router.push("/admin/members");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <select
          className="rounded-md border bg-background px-2 py-2"
          {...field}
        >
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.name}</option>
          ))}
        </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temp Password (optional)</FormLabel>
              <FormControl><Input className="bg-background" type="password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="rounded-md">
            {saving ? "Saving..." : "Add member"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/members")} className="rounded-md">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
