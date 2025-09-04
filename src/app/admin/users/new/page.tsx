// src/app/admin/users/new/page.tsx
import NewUserForm from "@/components/admin/new-user-form";

export default function NewUserPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Create User</h1>
      <NewUserForm />
    </div>
  );
}
