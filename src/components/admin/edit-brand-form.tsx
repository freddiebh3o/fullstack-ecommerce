"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import ImageUploader from "@/components/admin/image-uploader";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});
type FormValues = z.input<typeof schema>;

export default function EditBrandForm({ id, initial }: { id: string; initial: FormValues }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: "onBlur" });
  const entityIdRef = useRef<string>(id);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const res = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!res.ok) { alert(await res.text()); return; }
    router.push("/admin/brands");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="slug" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="websiteUrl" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Website</FormLabel>
            <FormControl><Input placeholder="https://…" {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="logoUrl" control={form.control} render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="flex flex-col gap-2">
                <ImageUploader
                  scope="brands"
                  currentUrl={form.getValues("logoUrl") || undefined}
                  entityId={entityIdRef.current}
                  label="Brand logo"
                  onUploaded={(url) => form.setValue("logoUrl", url, { shouldValidate: true })}
                  onClear={() => form.setValue("logoUrl", "", { shouldValidate: true })}
                  className="max-w-md"   // optional width constraint
                  debug
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/brands")}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
