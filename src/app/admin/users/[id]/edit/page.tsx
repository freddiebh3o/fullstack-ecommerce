// src/app/admin/users/[id]/edit/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditUserForm from "@/components/admin/edit-user-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) notFound();

  const isSelf = (session?.user as any)?.id === user.id;

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
