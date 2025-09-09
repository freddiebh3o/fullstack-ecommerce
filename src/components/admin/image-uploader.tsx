// src/components/admin/image-uploader.tsx
"use client";

import * as React from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/misc";

type PresignResponse = {
  url: string;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  publicUrl?: string;
  key?: string; // ⬅️ include S3 key for debug display
};

type Props = {
  scope: string;              // "products" | "brands" | ...
  entityId: string;           // product/brand id or "drafts/<uuid>"
  onUploaded: (url: string) => void;
  currentUrl?: string | null; // existing image preview if any
  accept?: string;            // default: "image/*"
  maxBytes?: number;          // default: 10MB
  className?: string;
  onClear?: () => void;
  label?: string;             // optional label above the zone
  debug?: boolean;            // ⬅️ show S3 key + status when true
};

export default function ImageUploader({
  scope,
  entityId,
  onUploaded,
  currentUrl,
  accept = "image/*",
  maxBytes = 10 * 1024 * 1024,
  className,
  onClear,
  label = "Image",
  debug = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // local object URL

  // debug state
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const activePreview = previewUrl || currentUrl || null;

  function resetLocalPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChosen(file: File) {
    setError(null);

    if (file.size > maxBytes) {
      setError(`File is too large. Max ${(maxBytes / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }
    if (accept.startsWith("image/") && !file.type.startsWith("image/")) {
      setError("Please choose an image file (jpeg, png, webp, avif…).");
      return;
    }

    resetLocalPreview();
    setPreviewUrl(URL.createObjectURL(file));
    void upload(file);
  }

  async function upload(file: File) {
    setUploading(true);
    setLastKey(null);
    setLastUrl(null);

    try {
      const presignRes = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          scope,
          entityId,
        }),
      });

      if (!presignRes.ok) {
        setError(await presignRes.text());
        return;
      }

      const presign: PresignResponse = await presignRes.json();
      if (presign.key) setLastKey(presign.key);

      if (presign.method === "POST" && presign.fields) {
        const fd = new FormData();
        Object.entries(presign.fields).forEach(([k, v]) => fd.append(k, v));
        fd.append("file", file);
        const s3Res = await fetch(presign.url, { method: "POST", body: fd });
        if (!s3Res.ok) {
          setError(`Upload failed (${s3Res.status}).`);
          return;
        }
      } else {
        const s3Res = await fetch(presign.url, {
          method: "PUT",
          headers: { "Content-Type": file.type, ...(presign.headers || {}) },
          body: file,
        });
        if (!s3Res.ok) {
          setError(`Upload failed (${s3Res.status}).`);
          return;
        }
      }

      const finalUrl = presign.publicUrl || presign.url.split("?")[0] || null;
      if (!finalUrl) {
        setError("Upload succeeded but no URL was returned.");
        return;
      }

      setLastUrl(finalUrl);
      onUploaded(finalUrl);
    } catch (e: any) {
      setError(e?.message || "Unexpected error during upload.");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileChosen(f);
    e.currentTarget.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileChosen(f);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <div className="text-sm font-medium">{label}</div> : null}

      {/* Single interactive dropzone with preview inside */}
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFilePicker()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative overflow-hidden rounded-md border bg-background aspect-[4/3] group",
          "transition-shadow",
          dragOver && "ring-2 ring-ring ring-offset-2",
          uploading && "opacity-75"
        )}
        aria-label="Upload image"
      >
        {/* Preview background */}
        {activePreview ? (
          <Image
            src={activePreview}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Drag & drop or click to upload
          </div>
        )}

        {/* Top-right toolbar */}
        <div className="absolute right-2 top-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
            }}
            disabled={uploading}
            className="rounded-md bg-background/80 backdrop-blur"
          >
            {uploading ? "Uploading…" : "Choose"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              resetLocalPreview();
              onClear?.();
              setLastKey(null);
              setLastUrl(null);
              setError(null);
            }}
            disabled={uploading}
            className="rounded-md bg-background/80 backdrop-blur"
          >
            Clear
          </Button>
        </div>

        {/* Footer status / errors */}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <div className="flex items-center justify-between rounded-md bg-background/70 px-2 py-1 text-xs backdrop-blur">
            <span className="text-muted-foreground">
              Max {(maxBytes / (1024 * 1024)).toFixed(0)}MB • {accept}
            </span>
            <span
              className={cn("truncate", error ? "text-destructive" : "text-muted-foreground")}
              aria-live="polite"
            >
              {error ? error : uploading ? "Uploading…" : activePreview ? "Ready" : "No image"}
            </span>
          </div>

          {/* Debug line (shows tenant-scoped S3 key + final URL) */}
          {debug && (lastKey || lastUrl) ? (
            <div className="mt-1 rounded-md bg-background/70 px-2 py-1 text-[10px] leading-tight text-muted-foreground backdrop-blur">
              {lastKey ? (
                <div className="truncate" title={lastKey}>
                  <span className="font-medium">S3 key:</span> {lastKey}
                </div>
              ) : null}
              {lastUrl ? (
                <div className="truncate" title={lastUrl}>
                  <span className="font-medium">Public URL:</span> {lastUrl}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />
      </div>
    </div>
  );
}
