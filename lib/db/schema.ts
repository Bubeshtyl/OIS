import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const productUnitEnum = pgEnum("product_unit", [
  "litre",
  "millilitre",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "RECEIVE",
  "TRANSFER",
  "SALE",
  "REVERSAL",
]);

export const locationEnum = pgEnum("location", [
  "SUPPLIER",
  "DEPOT",
  "MANAGER",
  "SALE",
]);

export const stockLocationEnum = pgEnum("stock_location", ["DEPOT", "MANAGER"]);

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "ACCOUNTS",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const oilProducts = pgTable("oil_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  unit: productUnitEnum("unit").notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lowStockThreshold: numeric("low_stock_threshold", {
    precision: 12,
    scale: 3,
  }),
  volumePerBox: numeric("volume_per_box", {
    precision: 12,
    scale: 3,
  }),
  packetsPerBox: numeric("packets_per_box", {
    precision: 12,
    scale: 0,
  }),
  volumePerPacket: numeric("volume_per_packet", {
    precision: 12,
    scale: 3,
  }),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => oilProducts.id),
  type: transactionTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  fromLocation: locationEnum("from_location").notNull(),
  toLocation: locationEnum("to_location").notNull(),
  transactionDate: date("transaction_date").notNull(),
  referenceNote: text("reference_note"),
  reversesTransactionId: uuid("reverses_transaction_id"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const stockBalance = pgTable(
  "stock_balance",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => oilProducts.id),
    location: stockLocationEnum("location").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .default("0")
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.location] })]
);

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(inventoryTransactions),
}));

export const oilProductsRelations = relations(oilProducts, ({ many }) => ({
  transactions: many(inventoryTransactions),
  balances: many(stockBalance),
}));

export const inventoryTransactionsRelations = relations(
  inventoryTransactions,
  ({ one }) => ({
    product: one(oilProducts, {
      fields: [inventoryTransactions.productId],
      references: [oilProducts.id],
    }),
    creator: one(users, {
      fields: [inventoryTransactions.createdBy],
      references: [users.id],
    }),
    reversedTransaction: one(inventoryTransactions, {
      fields: [inventoryTransactions.reversesTransactionId],
      references: [inventoryTransactions.id],
    }),
  })
);

export const stockBalanceRelations = relations(stockBalance, ({ one }) => ({
  product: one(oilProducts, {
    fields: [stockBalance.productId],
    references: [oilProducts.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type OilProduct = typeof oilProducts.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type StockBalance = typeof stockBalance.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type Location = (typeof locationEnum.enumValues)[number];
export type StockLocation = (typeof stockLocationEnum.enumValues)[number];
