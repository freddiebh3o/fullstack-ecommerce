// src/components/admin/new-user-form.tsx
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { apiFetch } from "@/lib/http/apiFetch";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["USER", "SUPERUSER"]),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.input<typeof schema>;

export default function NewUserForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "USER" },
    mode: "onBlur",
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const res = await apiFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!res.ok) {
      const msg = await res.text();
      alert(`Create failed: ${msg}`);
      return;
    }
    router.push("/admin/users");
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
              <FormControl><Input type="email" autoComplete="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Customer</SelectItem>
                    <SelectItem value="SUPERUSER">Superuser</SelectItem>
                  </SelectContent>
                </Select>
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
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
