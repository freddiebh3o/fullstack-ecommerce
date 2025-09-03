import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
      <div className="rounded-xl border bg-card px-6 py-4 shadow-sm">
        <Spinner />
      </div>
    </div>
  );
}
