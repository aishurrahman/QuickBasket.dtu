import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    // Supabase Auth owns passwords; this nullable field remains for legacy data only.
    passwordHash: text("password_hash"),
    supabaseAuthId: varchar("supabase_auth_id", { length: 36 }),
    phone: varchar("phone", { length: 20 }),
    role: varchar("role", { length: 20 }).notNull().default("customer"), // customer | admin
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email), uniqueIndex("users_supabase_auth_id_idx").on(table.supabaseAuthId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    emoji: varchar("emoji", { length: 10 }).default("🛒"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description").default(""),
    imageEmoji: varchar("image_emoji", { length: 10 }).default("🛍️"),
    unit: varchar("unit", { length: 40 }).notNull().default("1 unit"),
    mrp: numeric("mrp", { precision: 10, scale: 2 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_category_idx").on(table.categoryId),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 40 }).notNull().default("Home"),
    line1: varchar("line1", { length: 200 }).notNull(),
    line2: varchar("line2", { length: 200 }).default(""),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("addresses_user_idx").on(table.userId)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    description: varchar("description", { length: 200 }).default(""),
    discountType: varchar("discount_type", { length: 10 }).notNull().default("flat"), // flat | percent
    discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
    minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }).notNull().default("0"),
    maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("coupons_code_idx").on(table.code)],
);

export const pincodes = pgTable(
  "pincodes",
  {
    id: serial("id").primaryKey(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    area: varchar("area", { length: 120 }).notNull(),
    deliverable: boolean("deliverable").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("pincodes_pincode_idx").on(table.pincode)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("placed"),
    // placed | confirmed | packed | out_for_delivery | delivered | cancelled
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    handlingFee: numeric("handling_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    couponCode: varchar("coupon_code", { length: 40 }),
    address: jsonb("address").notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cod"),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    etaMinutes: integer("eta_minutes").notNull().default(10),
    placedAt: timestamp("placed_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("orders_user_idx").on(table.userId), uniqueIndex("orders_user_idempotency_idx").on(table.userId, table.idempotencyKey)],
);

export const budgetSettings = pgTable(
  "budget_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    perOrderLimit: numeric("per_order_limit", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("budget_settings_user_idx").on(table.userId)],
);

// Refund entries are recorded only after an external provider confirms the
// refund. QuickBasket does not execute real refunds without a provider.
export const refunds = pgTable(
  "refunds",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    providerReference: varchar("provider_reference", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("refunds_provider_reference_idx").on(table.providerReference), index("refunds_order_idx").on(table.orderId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    name: varchar("name", { length: 180 }).notNull(),
    unit: varchar("unit", { length: 40 }).notNull().default("1 unit"),
    imageEmoji: varchar("image_emoji", { length: 10 }).default("🛍️"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

// Demo eligibility review only. A real credit decision must come from an
// authorized lending partner; a TrustScore is never an approval decision.
export const emiReviews = pgTable(
  "emi_reviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    historyStartAt: timestamp("history_start_at").notNull(),
    reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
    status: varchar("status", { length: 24 }).notNull(), // under_review; legacy demo statuses are never treated as lender approvals
    trustScore: integer("trust_score").notNull(),
    demoLimit: numeric("demo_limit", { precision: 10, scale: 2 }).notNull().default("0"),
    ruleSummary: jsonb("rule_summary").notNull(),
  },
  (table) => [uniqueIndex("emi_reviews_user_idx").on(table.userId)],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 24 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    providerReference: varchar("provider_reference", { length: 120 }),
    idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_records_idempotency_idx").on(table.idempotencyKey), index("payment_records_user_idx").on(table.userId)],
);

export const smartBasketFeedback = pgTable(
  "smart_basket_feedback",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 16 }).notNull(), // accepted | edited | dismissed
    quantity: integer("quantity"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("smart_basket_feedback_user_idx").on(table.userId)],
);
