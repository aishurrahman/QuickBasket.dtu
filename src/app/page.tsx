import Link from "next/link";
import { db, isDatabaseConfigured } from "@/db";
import { categories, products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ProductCard } from "@/components/ProductCard";
import { demoCategories, demoProducts } from "@/lib/demo-catalog";
import { SmartBasket } from "@/components/SmartBasket";
import { HeroCarousel } from "@/components/HeroCarousel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let allCategories = demoCategories;
  let sections = demoCategories.slice(0, 5).map((category) => ({
    category,
    products: demoProducts.filter((product) => product.categoryId === category.id).slice(0, 6),
  }));
  let usingDemoCatalog = true;

  if (isDatabaseConfigured) {
    try {
      const databaseCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));
      const databaseSections = await Promise.all(
        databaseCategories.slice(0, 5).map(async (category) => ({
          category,
          products: await db
            .select()
            .from(products)
            .where(eq(products.categoryId, category.id))
            .orderBy(asc(products.name))
            .limit(6),
        })),
      );
      allCategories = databaseCategories;
      sections = databaseSections;
      usingDemoCatalog = false;
    } catch {
      // Keep the storefront available with the demo catalog while the database is offline.
    }
  }

  return (
    <main>
      <HeroCarousel categoryHref={allCategories[0] ? `/category/${allCategories[0].slug}` : "#shop"} />

      {usingDemoCatalog && (
        <p className="mx-auto max-w-6xl px-4 pt-4 text-sm text-amber-800">
          Demo catalog is shown because the database is unavailable. Sign-in, checkout, and admin features need a valid database connection.
        </p>
      )}

      <SmartBasket />

      <section id="shop" className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-3 text-lg font-bold text-slate-800">Shop by Category</h2>
        <div className="motion-stagger grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {allCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="motion-rise-in flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
            >
              <span className="motion-category-icon text-3xl">{cat.emoji}</span>
              <span className="text-xs font-semibold text-slate-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {sections.map(({ category, products: categoryProducts }, index) => (
        <section key={category.id} className="motion-rise-in mx-auto max-w-6xl px-4 py-5" style={{ animationDelay: `${index * 90}ms` }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {category.emoji} {category.name}
            </h2>
            <Link href={`/category/${category.slug}`} className="text-sm font-bold text-emerald-700 hover:underline">
              See all →
            </Link>
          </div>
          <div className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
