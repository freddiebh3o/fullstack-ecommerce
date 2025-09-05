"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ImageUploader({
  scope,
  entityId,
  onUploaded,
}: {
  scope: "products" | "categories" | "brands";
  entityId: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const presign = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          byteLength: file.size,
          scope,
          entityId,
        }),
      });

      if (!presign.ok) {
        const msg = await presign.text();
        alert(`Presign failed: ${msg}`);
        return;
      }

      const { uploadUrl, publicUrl } = await presign.json();

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!put.ok) {
        const msg = await put.text();
        alert(`Upload failed: ${msg}`);
        return;
      }

      onUploaded(publicUrl);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="file" accept="image/*" onChange={handleChange} disabled={busy} />
      <Button type="button" variant="outline" disabled={busy}>
        {busy ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
}
