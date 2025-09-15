// src/app/admin/users/[id]/edit/page.tsx
import { db } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ForbiddenPage from "@/app/403/page";
import { ensureSystemRole } from "@/lib/auth/guards/system";
import EditUserForm from "@/components/admin/edit-user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await ensureSystemRole(["SUPERUSER"]);
  if (!guard.allowed) return <ForbiddenPage />;

  const { id } = await params; // Next 15 async params

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) notFound();

  const isSelf = (guard.session.user as any)?.id === user.id;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Edit User</h1>
      <EditUserForm
        id={user.id}
        isSelf={isSelf}
        initial={{ email: user.email, name: user.name ?? "", role: user.role }}
      />
    </div>
  );
}
