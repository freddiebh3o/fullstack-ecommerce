// src/components/admin/index/admin-index-shell.tsx
import * as React from "react";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode; // safe to keep; Link is serializable
  children: React.ReactNode;
};

export default function AdminIndexShell({
  title,
  description,
  action,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>

      {children}
    </div>
  );
}
