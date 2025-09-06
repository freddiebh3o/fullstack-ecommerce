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
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
  description: z.string().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});
type FormValues = z.input<typeof schema>;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

export default function NewBrandPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const draftIdRef = useRef<string>(crypto.randomUUID());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
    mode: "onBlur",
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!res.ok) { alert(await res.text()); return; }
    const location = res.headers.get("Location");
    router.push(location || "/admin/brands");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">New Brand</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField name="name" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} onBlur={(e) => {
                  field.onBlur();
                  const v = e.currentTarget.value;
                  if (!form.getValues("slug") && v) form.setValue("slug", slugify(v), { shouldValidate: true });
                }}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="slug" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl><Input placeholder="sunlite" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="websiteUrl" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Website (optional)</FormLabel>
              <FormControl><Input placeholder="https://…" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="description" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="logoUrl" control={form.control} render={({ field }) => (
            <FormItem>
              {/* <FormLabel>Logo</FormLabel> */}
              <FormControl>
                <div className="flex flex-col gap-2">
                  {/* <Input placeholder="https://…" {...field} value={field.value ?? ""} /> */}
                  <ImageUploader
                    scope="brands"
                    entityId={`drafts/${draftIdRef.current}`}
                    label="Brand logo"
                    currentUrl={form.getValues("logoUrl") || undefined}
                    onUploaded={(url) => form.setValue("logoUrl", url, { shouldValidate: true })}
                    onClear={() => form.setValue("logoUrl", "", { shouldValidate: true })}
                    className="max-w-md"   // optional width constraint
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/brands")}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
