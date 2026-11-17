import Link from "next/link";
import { notFound } from "next/navigation";
import { db, isDatabaseConfigured } from "@/db";
import { categories, products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ProductCard } from "@/components/ProductCard";
import { demoCategories, demoProducts } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let allCategories = demoCategories;
  let category = allCategories.find((item) => item.slug === slug);
  let rows = demoProducts.filter((product) => product.categoryId === category?.id);

  if (isDatabaseConfigured) {
    try {
      const databaseCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));
      const databaseCategory = databaseCategories.find((item) => item.slug === slug);
      allCategories = databaseCategories;
      category = databaseCategory;
      rows = databaseCategory
        ? await db
            .select()
            .from(products)
            .where(eq(products.categoryId, databaseCategory.id))
            .orderBy(asc(products.name))
        : [];
    } catch {
      // Use the built-in catalog while the configured database is unreachable.
      allCategories = demoCategories;
      category = allCategories.find((item) => item.slug === slug);
      rows = demoProducts.filter((product) => product.categoryId === category?.id);
    }
  }

  if (!category) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap gap-2">
        {allCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              cat.slug === slug
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat.emoji} {cat.name}
          </Link>
        ))}
      </div>

      <h1 className="mb-4 text-xl font-extrabold text-slate-800">
        {category.emoji} {category.name}
      </h1>

      {rows.length === 0 ? (
        <p className="text-slate-500">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {rows.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
