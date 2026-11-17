import { notFound } from "next/navigation";
import Link from "next/link";
import { db, isDatabaseConfigured } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProductDetailCard } from "@/components/ProductDetailCard";
import { ProductCard } from "@/components/ProductCard";
import { demoCategories, demoProducts } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product = demoProducts.find((item) => item.slug === slug);
  let category = product ? demoCategories.find((item) => item.id === product?.categoryId) : undefined;
  let related = product
    ? demoProducts.filter((item) => item.categoryId === product?.categoryId).slice(0, 7)
    : [];

  if (isDatabaseConfigured) {
    try {
      const [databaseProduct] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
      product = databaseProduct;
      if (databaseProduct) {
        [category] = await db.select().from(categories).where(eq(categories.id, databaseProduct.categoryId)).limit(1);
        related = await db.select().from(products).where(eq(products.categoryId, databaseProduct.categoryId)).limit(7);
      } else {
        category = undefined;
        related = [];
      }
    } catch {
      // Use the built-in catalog while the configured database is unreachable.
      product = demoProducts.find((item) => item.slug === slug);
      category = product ? demoCategories.find((item) => item.id === product?.categoryId) : undefined;
      related = product
        ? demoProducts.filter((item) => item.categoryId === product?.categoryId).slice(0, 7)
        : [];
    }
  }

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {category && (
          <>
            {" / "}
            <Link href={`/category/${category.slug}`} className="hover:underline">
              {category.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <ProductDetailCard product={product} />

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-slate-800">You may also like</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {related
            .filter((p) => p.id !== product.id)
            .slice(0, 6)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </main>
  );
}
