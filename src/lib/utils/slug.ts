// src/lib/utils/slug.ts
export function slugify(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }
  