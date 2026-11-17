import { db, isDatabaseConfigured } from "@/db";
import { products } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { ProductCard } from "@/components/ProductCard";
import { demoProducts } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let rows = query
    ? demoProducts.filter(
        (product) =>
          product.isActive &&
          `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  if (query && isDatabaseConfigured) {
    try {
      rows = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(ilike(products.name, `%${query}%`), ilike(products.description, `%${query}%`)),
          ),
        );
    } catch {
      // Use the built-in catalog while the configured database is unreachable.
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">
        {query ? (
          <>
            Search results for <span className="text-emerald-700">&ldquo;{query}&rdquo;</span>
          </>
        ) : (
          "Search products"
        )}
      </h1>

      {query && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No products found. Try searching for something else, like &ldquo;milk&rdquo; or &ldquo;chips&rdquo;.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {rows.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
