import { db } from '@/lib/db';
import Image from 'next/image';

export default async function HomePage() {
  const products = await db.product.findMany({
    include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
    orderBy: { createdAt: 'desc' },
  });

  // Infer the exact return type
  type ProductWithRelations = Awaited<ReturnType<typeof db.product.findMany>>[number];

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Products</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: ProductWithRelations) => {
          const img = p.images[0];
          return (
            <div key={p.id} className="rounded-xl border p-4">
              {img && (
                <Image
                  src={img.url}
                  alt={img.alt ?? p.name}
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-lg"
                />
              )}
              <div className="mt-3 font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">
                {p.category?.name ?? 'Uncategorized'}
              </div>
              <div className="mt-2 font-semibold">
                £{(p.priceCents / 100).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
