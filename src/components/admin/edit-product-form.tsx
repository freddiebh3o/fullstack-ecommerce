// src/components/admin/edit-product-form.tsx
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import CategorySelect from "./category-select";
import ImageUploader from "@/components/admin/image-uploader";
import BrandSelect from "@/components/admin/brand-select";
import { apiFetch } from "@/lib/http/apiFetch";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categorySlug: z.string().optional().or(z.literal("")),
  brandSlug: z.string().optional().or(z.literal("")),
});
type FormValues = z.input<typeof schema>;

export default function EditProductForm({
  id,
  initial,
  categories,
  brands,
}: {
  id: string;
  initial: FormValues;
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
    mode: "onBlur",
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const res = await apiFetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);

    if (!res.ok) {
      const msg = await res.text();
      alert(`Save failed: ${msg}`);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price */}
        <FormField
          control={form.control}
          name="priceCents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (in pence)</FormLabel>
              <FormControl>
                <Input
                  className="bg-background"
                  type="number"
                  inputMode="numeric"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Currency */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input className="bg-background" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image + uploader */}
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex flex-col gap-2">
                  <ImageUploader
                    scope="products"
                    currentUrl={form.getValues("imageUrl") || undefined}
                    entityId={id}
                    onUploaded={(url) => form.setValue("imageUrl", url, { shouldValidate: true })}
                    onClear={() => form.setValue("imageUrl", "", { shouldValidate: true })}
                    debug
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categorySlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <CategorySelect field={field} options={categories} placeholder="Select a category" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Brand */}
        <FormField
          control={form.control}
          name="brandSlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <BrandSelect field={field} options={brands} placeholder="Select a brand" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="rounded-md">
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")} className="rounded-md">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
