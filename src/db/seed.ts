import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { db, pool } from "@/db";
import { categories, products, coupons, pincodes } from "@/db/schema";
import { slugify } from "@/lib/api-utils";
import { sql } from "drizzle-orm";

type CategorySeed = {
  name: string;
  emoji: string;
  products: { name: string; emoji: string; unit: string; mrp: number; price: number }[];
};

const CATALOG: CategorySeed[] = [
  {
    name: "Fruits & Vegetables",
    emoji: "🥦",
    products: [
      { name: "Fresh Banana", emoji: "🍌", unit: "6 pcs", mrp: 60, price: 48 },
      { name: "Alphonso Mango", emoji: "🥭", unit: "1 kg", mrp: 220, price: 189 },
      { name: "Red Apple (Shimla)", emoji: "🍎", unit: "4 pcs", mrp: 180, price: 149 },
      { name: "Tomato", emoji: "🍅", unit: "1 kg", mrp: 50, price: 38 },
      { name: "Onion", emoji: "🧅", unit: "1 kg", mrp: 45, price: 36 },
      { name: "Potato", emoji: "🥔", unit: "1 kg", mrp: 40, price: 32 },
      { name: "Spinach Bunch", emoji: "🥬", unit: "1 bunch", mrp: 25, price: 20 },
      { name: "Cucumber", emoji: "🥒", unit: "500 g", mrp: 30, price: 24 },
      { name: "Broccoli", emoji: "🥦", unit: "1 pc", mrp: 60, price: 49 },
      { name: "Carrot", emoji: "🥕", unit: "500 g", mrp: 40, price: 32 },
      { name: "Capsicum", emoji: "🫑", unit: "500 g", mrp: 55, price: 45 },
      { name: "Lemon", emoji: "🍋", unit: "6 pcs", mrp: 30, price: 24 },
    ],
  },
  {
    name: "Dairy & Breakfast",
    emoji: "🥛",
    products: [
      { name: "Toned Milk", emoji: "🥛", unit: "1 L", mrp: 68, price: 64 },
      { name: "Farm Eggs", emoji: "🥚", unit: "6 pcs", mrp: 90, price: 78 },
      { name: "Brown Bread", emoji: "🍞", unit: "400 g", mrp: 55, price: 48 },
      { name: "Paneer", emoji: "🧊", unit: "200 g", mrp: 95, price: 85 },
      { name: "Butter", emoji: "🧈", unit: "100 g", mrp: 58, price: 54 },
      { name: "Greek Yogurt", emoji: "🍨", unit: "400 g", mrp: 110, price: 99 },
      { name: "Corn Flakes", emoji: "🌽", unit: "500 g", mrp: 150, price: 129 },
      { name: "Fresh Curd", emoji: "🥣", unit: "400 g", mrp: 45, price: 39 },
      { name: "Cheese Slices", emoji: "🧀", unit: "200 g", mrp: 120, price: 105 },
      { name: "Rolled Oats", emoji: "🌾", unit: "500 g", mrp: 180, price: 155 },
      { name: "Pure Ghee", emoji: "🫙", unit: "500 ml", mrp: 320, price: 289 },
      { name: "Mozzarella Cheese", emoji: "🍕", unit: "200 g", mrp: 160, price: 139 },
    ],
  },
  {
    name: "Snacks & Munchies",
    emoji: "🍿",
    products: [
      { name: "Potato Chips", emoji: "🍟", unit: "90 g", mrp: 30, price: 28 },
      { name: "Salted Namkeen", emoji: "🥨", unit: "200 g", mrp: 65, price: 59 },
      { name: "Choco Cookies", emoji: "🍪", unit: "150 g", mrp: 45, price: 40 },
      { name: "Popcorn Butter", emoji: "🍿", unit: "70 g", mrp: 40, price: 35 },
      { name: "Peanut Butter", emoji: "🍯", unit: "340 g", mrp: 220, price: 199 },
      { name: "Mixed Dry Fruits", emoji: "🌰", unit: "250 g", mrp: 280, price: 249 },
      { name: "Roasted Makhana", emoji: "🪷", unit: "100 g", mrp: 120, price: 99 },
      { name: "Masala Peanuts", emoji: "🥜", unit: "200 g", mrp: 80, price: 69 },
      { name: "Nachos", emoji: "🌮", unit: "150 g", mrp: 65, price: 55 },
      { name: "Dark Chocolate", emoji: "🍫", unit: "100 g", mrp: 110, price: 95 },
      { name: "Trail Mix", emoji: "🍇", unit: "200 g", mrp: 150, price: 129 },
      { name: "Cheese Crackers", emoji: "🍘", unit: "150 g", mrp: 70, price: 59 },
    ],
  },
  {
    name: "Cold Drinks & Juices",
    emoji: "🥤",
    products: [
      { name: "Cola Can", emoji: "🥤", unit: "300 ml", mrp: 45, price: 40 },
      { name: "Orange Juice", emoji: "🧃", unit: "1 L", mrp: 120, price: 109 },
      { name: "Packaged Water", emoji: "💧", unit: "1 L", mrp: 20, price: 18 },
      { name: "Energy Drink", emoji: "⚡", unit: "250 ml", mrp: 110, price: 99 },
      { name: "Mango Shake", emoji: "🍹", unit: "250 ml", mrp: 40, price: 35 },
      { name: "Fresh Lemonade", emoji: "🍸", unit: "500 ml", mrp: 60, price: 49 },
      { name: "Coconut Water", emoji: "🥥", unit: "200 ml", mrp: 50, price: 42 },
      { name: "Peach Iced Tea", emoji: "🧋", unit: "350 ml", mrp: 45, price: 39 },
      { name: "Apple Juice", emoji: "🍏", unit: "1 L", mrp: 130, price: 115 },
      { name: "Club Soda", emoji: "🥂", unit: "750 ml", mrp: 35, price: 30 },
      { name: "Sweet Lassi", emoji: "🍶", unit: "200 ml", mrp: 30, price: 25 },
      { name: "Flavored Milk", emoji: "🍼", unit: "200 ml", mrp: 35, price: 29 },
    ],
  },
  {
    name: "Bakery & Biscuits",
    emoji: "🍪",
    products: [
      { name: "Chocolate Cake", emoji: "🍰", unit: "250 g", mrp: 180, price: 159 },
      { name: "Marie Biscuits", emoji: "🥠", unit: "250 g", mrp: 35, price: 30 },
      { name: "Croissant", emoji: "🥐", unit: "2 pcs", mrp: 70, price: 62 },
      { name: "Donut Pack", emoji: "🍩", unit: "4 pcs", mrp: 120, price: 105 },
      { name: "Rusk Pack", emoji: "🥖", unit: "200 g", mrp: 45, price: 39 },
      { name: "Whole Wheat Bread", emoji: "🥯", unit: "400 g", mrp: 60, price: 52 },
      { name: "Cream Biscuits", emoji: "🥮", unit: "120 g", mrp: 30, price: 25 },
      { name: "Banana Cake", emoji: "🎂", unit: "200 g", mrp: 90, price: 78 },
      { name: "Garlic Bread", emoji: "🧄", unit: "250 g", mrp: 100, price: 89 },
      { name: "Khari Biscuits", emoji: "🥧", unit: "200 g", mrp: 55, price: 48 },
      { name: "Sandwich Bread", emoji: "🥪", unit: "400 g", mrp: 50, price: 44 },
      { name: "Chocolate Muffins", emoji: "🧁", unit: "4 pcs", mrp: 120, price: 99 },
    ],
  },
  {
    name: "Personal Care",
    emoji: "🧴",
    products: [
      { name: "Shampoo", emoji: "🚿", unit: "180 ml", mrp: 150, price: 132 },
      { name: "Toothpaste", emoji: "🪥", unit: "100 g", mrp: 55, price: 49 },
      { name: "Face Wash", emoji: "🫧", unit: "100 g", mrp: 120, price: 105 },
      { name: "Hand Sanitizer", emoji: "🙌", unit: "200 ml", mrp: 90, price: 79 },
      { name: "Body Soap", emoji: "🧼", unit: "125 g", mrp: 45, price: 39 },
      { name: "Hair Conditioner", emoji: "💇", unit: "180 ml", mrp: 165, price: 145 },
      { name: "Daily Moisturizer", emoji: "🌿", unit: "100 ml", mrp: 140, price: 119 },
      { name: "Body Lotion", emoji: "🧴", unit: "200 ml", mrp: 220, price: 189 },
      { name: "Nourishing Hair Oil", emoji: "🌺", unit: "200 ml", mrp: 130, price: 112 },
      { name: "Fresh Deodorant", emoji: "🌸", unit: "150 ml", mrp: 199, price: 169 },
      { name: "Gentle Handwash", emoji: "🤲", unit: "200 ml", mrp: 85, price: 72 },
      { name: "Cotton Buds", emoji: "☁️", unit: "100 pcs", mrp: 45, price: 38 },
    ],
  },
  {
    name: "Home & Cleaning",
    emoji: "🧹",
    products: [
      { name: "Dish Wash Liquid", emoji: "🍽️", unit: "500 ml", mrp: 110, price: 95 },
      { name: "Floor Cleaner", emoji: "🪣", unit: "1 L", mrp: 150, price: 132 },
      { name: "Laundry Detergent", emoji: "🧺", unit: "1 kg", mrp: 210, price: 185 },
      { name: "Garbage Bags", emoji: "🗑️", unit: "30 pcs", mrp: 95, price: 85 },
      { name: "Toilet Cleaner", emoji: "🚽", unit: "500 ml", mrp: 90, price: 79 },
      { name: "Scrub Sponges", emoji: "🧽", unit: "3 pcs", mrp: 45, price: 38 },
      { name: "Glass Cleaner", emoji: "🪟", unit: "500 ml", mrp: 110, price: 95 },
      { name: "Liquid Laundry Detergent", emoji: "👕", unit: "1 L", mrp: 180, price: 155 },
      { name: "Paper Towels", emoji: "🧻", unit: "2 rolls", mrp: 90, price: 78 },
      { name: "Air Freshener", emoji: "🌼", unit: "220 ml", mrp: 160, price: 139 },
      { name: "Surface Disinfectant", emoji: "🦠", unit: "500 ml", mrp: 95, price: 82 },
      { name: "Facial Tissue Box", emoji: "📦", unit: "100 pulls", mrp: 65, price: 55 },
    ],
  },
  {
    name: "Atta, Rice & Dal",
    emoji: "🌾",
    products: [
      { name: "Wheat Atta", emoji: "🫓", unit: "5 kg", mrp: 260, price: 235 },
      { name: "Basmati Rice", emoji: "🍚", unit: "5 kg", mrp: 480, price: 429 },
      { name: "Toor Dal", emoji: "🫘", unit: "1 kg", mrp: 160, price: 142 },
      { name: "Moong Dal", emoji: "🫛", unit: "1 kg", mrp: 150, price: 135 },
      { name: "Cooking Oil", emoji: "🛢️", unit: "1 L", mrp: 180, price: 159 },
      { name: "Sugar", emoji: "🍬", unit: "1 kg", mrp: 50, price: 44 },
      { name: "Chana Dal", emoji: "🟠", unit: "1 kg", mrp: 140, price: 125 },
      { name: "Chickpeas", emoji: "🧆", unit: "1 kg", mrp: 130, price: 115 },
      { name: "Poha", emoji: "🥡", unit: "500 g", mrp: 55, price: 48 },
      { name: "Sooji", emoji: "🧂", unit: "1 kg", mrp: 60, price: 52 },
      { name: "Besan", emoji: "🟡", unit: "1 kg", mrp: 95, price: 84 },
      { name: "Brown Rice", emoji: "🍙", unit: "1 kg", mrp: 140, price: 125 },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  await db.execute(sql`TRUNCATE TABLE order_items, orders, addresses, products, categories, coupons, pincodes, users RESTART IDENTITY CASCADE`);

  for (let i = 0; i < CATALOG.length; i++) {
    const cat = CATALOG[i];
    const [row] = await db
      .insert(categories)
      .values({ name: cat.name, slug: slugify(cat.name), emoji: cat.emoji, sortOrder: i })
      .returning();

    await db.insert(products).values(
      cat.products.map((p) => ({
        categoryId: row.id,
        name: p.name,
        slug: slugify(p.name) + "-" + row.id,
        description: `Fresh ${p.name} delivered in minutes.`,
        imageEmoji: p.emoji,
        unit: p.unit,
        mrp: p.mrp.toFixed(2),
        price: p.price.toFixed(2),
        stock: 100 + Math.floor(Math.random() * 100),
        isActive: true,
      })),
    );
  }

  await db.insert(coupons).values([
    {
      code: "WELCOME50",
      description: "Flat ₹50 off on your first order",
      discountType: "flat",
      discountValue: "50.00",
      minOrderValue: "199.00",
      maxDiscount: null,
      isActive: true,
      expiresAt: null,
    },
    {
      code: "SAVE10",
      description: "10% off up to ₹60",
      discountType: "percent",
      discountValue: "10.00",
      minOrderValue: "299.00",
      maxDiscount: "60.00",
      isActive: true,
      expiresAt: null,
    },
  ]);

  await db.insert(pincodes).values([
    { pincode: "110001", area: "Connaught Place, Delhi", deliverable: true },
    { pincode: "110016", area: "Hauz Khas, Delhi", deliverable: true },
    { pincode: "400001", area: "Fort, Mumbai", deliverable: true },
    { pincode: "400050", area: "Bandra, Mumbai", deliverable: true },
    { pincode: "560001", area: "MG Road, Bengaluru", deliverable: true },
    { pincode: "560034", area: "Koramangala, Bengaluru", deliverable: true },
    { pincode: "700001", area: "BBD Bagh, Kolkata", deliverable: false },
  ]);

  console.log("Seed complete!");
  console.log("Create customer accounts through Supabase Auth in the QuickBasket register page.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
