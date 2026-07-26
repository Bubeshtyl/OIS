import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
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
  "RETURNED",
  "DAMAGED",
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

export const ticketStatusEnum = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const questionAnswerTypeEnum = pgEnum("question_answer_type", [
  "TEXT",
  "CHOICE",
]);

export const telegramSessionStepEnum = pgEnum("telegram_session_step", [
  "AWAITING_ACCESS_CODE",
  "AWAITING_TEAM",
  "AWAITING_ANSWER",
  "AWAITING_CONFIRMATION",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  teamId: uuid("team_id").references(() => teams.id),
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

/** Pump daily sales import — standalone, no FKs. Upserted by receipt_no. */
export const dailySales = pgTable("daily_sales", {
  receiptNo: text("receipt_no").primaryKey(),
  startDate: timestamp("start_date", { withTimezone: false }).notNull(),
  endDate: timestamp("end_date", { withTimezone: false }).notNull(),
  product: text("product").notNull(),
  amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
  volumeLitre: numeric("volume_litre", { precision: 14, scale: 3 }).notNull(),
  ratePerLtr: numeric("rate_per_ltr", { precision: 14, scale: 3 }).notNull(),
  mopType: text("mop_type").notNull(),
  dsmName: text("dsm_name").notNull(),
  bayNo: integer("bay_no"),
  nozzleNo: integer("nozzle_no"),
  startTot: numeric("start_tot", { precision: 16, scale: 3 }).notNull(),
  endTot: numeric("end_tot", { precision: 16, scale: 3 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 3 }).notNull(),
  vehicleNo: text("vehicle_no"),
  vehicleSegment: text("vehicle_segment"),
  mobileNo: text("mobile_no"),
  loadedAt: timestamp("loaded_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  telegramChatId: text("telegram_chat_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: userRoleEnum("role").notNull(),
    permission: text("permission").notNull(),
  },
  (table) => [primaryKey({ columns: [table.role, table.permission] })]
);

export const ticketQuestions = pgTable("ticket_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  order: integer("order").notNull().unique(),
  prompt: text("prompt").notNull(),
  answerType: questionAnswerTypeEnum("answer_type").notNull().default("TEXT"),
  choices: jsonb("choices").$type<string[]>(),
  dependsOnQuestionId: uuid("depends_on_question_id"),
  choicesByParent: jsonb("choices_by_parent").$type<Record<string, string[]>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const ticketSettings = pgTable("ticket_settings", {
  id: integer("id").primaryKey().default(1),
  prefix: text("prefix").notNull().default("JCK"),
  paddingWidth: integer("padding_width").notNull().default(6),
  accessCode: text("access_code"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export type TicketAnswer = {
  questionId: string;
  prompt: string;
  answerType: "TEXT" | "CHOICE";
  answer: string;
};

export type TicketQuestionQueueItem = {
  id: string;
  prompt: string;
  answerType: "TEXT" | "CHOICE";
  choices: string[] | null;
  dependsOnQuestionId: string | null;
  choicesByParent: Record<string, string[]> | null;
};

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketSeq: serial("ticket_seq").notNull().unique(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  status: ticketStatusEnum("status").notNull().default("OPEN"),
  answers: jsonb("answers").$type<TicketAnswer[]>().notNull().default([]),
  requesterTelegramUserId: text("requester_telegram_user_id"),
  requesterTelegramChatId: text("requester_telegram_chat_id"),
  requesterName: text("requester_name").notNull(),
  requesterUsername: text("requester_username"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  resolutionNote: text("resolution_note"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const telegramSessions = pgTable("telegram_sessions", {
  chatId: text("chat_id").primaryKey(),
  step: telegramSessionStepEnum("step").notNull().default("AWAITING_TEAM"),
  teamId: uuid("team_id").references(() => teams.id),
  questionQueue: jsonb("question_queue")
    .$type<TicketQuestionQueueItem[]>()
    .notNull()
    .default([]),
  answers: jsonb("answers").$type<TicketAnswer[]>().notNull().default([]),
  codeAttempts: integer("code_attempts").notNull().default(0),
  telegramUserId: text("telegram_user_id").notNull(),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const telegramProcessedUpdates = pgTable("telegram_processed_updates", {
  updateId: text("update_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
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

export const teamsRelations = relations(teams, ({ many }) => ({
  tickets: many(tickets),
  telegramSessions: many(telegramSessions),
  members: many(users),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  team: one(teams, {
    fields: [tickets.teamId],
    references: [teams.id],
  }),
}));

export const telegramSessionsRelations = relations(
  telegramSessions,
  ({ one }) => ({
    team: one(teams, {
      fields: [telegramSessions.teamId],
      references: [teams.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type OilProduct = typeof oilProducts.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type StockBalance = typeof stockBalance.$inferSelect;
export type DailySale = typeof dailySales.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type Location = (typeof locationEnum.enumValues)[number];
export type StockLocation = (typeof stockLocationEnum.enumValues)[number];

export type Team = typeof teams.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type TicketQuestion = typeof ticketQuestions.$inferSelect;
export type TicketSettingsRow = typeof ticketSettings.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TelegramSession = typeof telegramSessions.$inferSelect;
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type QuestionAnswerType =
  (typeof questionAnswerTypeEnum.enumValues)[number];
export type TelegramSessionStep =
  (typeof telegramSessionStepEnum.enumValues)[number];
