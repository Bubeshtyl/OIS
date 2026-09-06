import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
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

/** Lifecycle of cases returned on a receive invoice (awaiting replacement, etc.). */
export const returnCaseStatusEnum = pgEnum("return_case_status", [
  "OPEN",
  "REPLACED",
  "CLOSED",
]);

export const returnCaseEventTypeEnum = pgEnum("return_case_event_type", [
  "RECORDED",
  "UPDATED",
  "REPLACEMENT_LINKED",
  "CLOSED",
]);

export const shiftClosingEntityTypeEnum = pgEnum("shift_closing_entity_type", [
  "daily_rsp",
  "machine_slip_entry",
  "interim_shift_closing",
]);

export const shiftClosingEditRequestStatusEnum = pgEnum(
  "shift_closing_edit_request_status",
  ["pending", "approved", "rejected", "cancelled"]
);

export const shiftClosingLedgerEventTypeEnum = pgEnum(
  "shift_closing_ledger_event_type",
  ["created", "edit_requested", "edit_approved", "edit_rejected"]
);

export const locationEnum = pgEnum("location", [
  "SUPPLIER",
  "DEPOT",
  "MANAGER",
  "SALE",
]);

export const stockLocationEnum = pgEnum("stock_location", ["DEPOT", "MANAGER"]);

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

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  phone: text("phone"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [unique("roles_tenant_name_unique").on(table.tenantId, table.name)]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permission] })]
);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  roleId: uuid("role_id").references(() => roles.id),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  joiningDate: date("joining_date"),
  primaryPhone: text("primary_phone"),
  secondaryPhone: text("secondary_phone"),
  doorNo: text("door_no"),
  street: text("street"),
  area: text("area"),
  townCity: text("town_city"),
  district: text("district"),
  pincode: text("pincode"),
  aadharNumber: text("aadhar_number"),
  guardianName: text("guardian_name"),
  guardianRelationship: text("guardian_relationship"),
  guardianPhone: text("guardian_phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

export const oilProducts = pgTable("oil_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => oilProducts.id),
  type: transactionTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  fromLocation: locationEnum("from_location").notNull(),
  toLocation: locationEnum("to_location").notNull(),
  transactionDate: date("transaction_date").notNull(),
  referenceNote: text("reference_note"),
  dealerSource: text("dealer_source"),
  taxableValue: numeric("taxable_value", { precision: 12, scale: 2 }),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }),
  landingPrice: numeric("landing_price", { precision: 12, scale: 4 }),
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
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
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
  (table) => [
    primaryKey({ columns: [table.tenantId, table.productId, table.location] }),
  ]
);

/** Cases returned on a receive invoice — tracked for any dealer (BPCL or other). */
export const returnedCases = pgTable("returned_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => oilProducts.id),
  receiveTransactionId: uuid("receive_transaction_id")
    .notNull()
    .references(() => inventoryTransactions.id, { onDelete: "cascade" })
    .unique(),
  /** Dealer identifier, e.g. "BPCL" or another supplier name. */
  dealerSource: text("dealer_source").notNull(),
  invoice: text("invoice").notNull(),
  /** Original returned case count on the source invoice. */
  casesReturned: integer("cases_returned").notNull(),
  /** Cumulative cases already replaced (can be partial across multiple invoices). */
  casesReplaced: integer("cases_replaced").default(0).notNull(),
  status: returnCaseStatusEnum("status").default("OPEN").notNull(),
  replacementReceiveTransactionId: uuid(
    "replacement_receive_transaction_id"
  ).references(() => inventoryTransactions.id, { onDelete: "set null" }),
  replacementInvoice: text("replacement_invoice"),
  replacedAt: timestamp("replaced_at", { withTimezone: true }),
  notes: text("notes"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

/** Event log for returned-case lifecycle (recorded, updated, replacement linked, closed). */
export const returnedCaseEvents = pgTable("returned_case_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  returnedCaseId: uuid("returned_case_id")
    .notNull()
    .references(() => returnedCases.id, { onDelete: "cascade" }),
  eventType: returnCaseEventTypeEnum("event_type").notNull(),
  detail: text("detail"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

/** Pump daily sales import — upserted by (tenant_id, receipt_no). */
export const dailySales = pgTable(
  "daily_sales",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    receiptNo: text("receipt_no").notNull(),
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
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.receiptNo] }),
  ]
);

export const dailySalesUploads = pgTable("daily_sales_uploads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  total: integer("total").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

/** BPCL MS / HSD fuel purchase invoices (manual entry). */
export const msHsdInvoices = pgTable(
  "ms_hsd_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceNo: text("invoice_no").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    vatStaxCessTotal: numeric("vat_stax_cess_total", {
      precision: 14,
      scale: 2,
    }).notNull(),
    roundingOff: numeric("rounding_off", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("ms_hsd_invoices_tenant_invoice_unique").on(
      table.tenantId,
      table.invoiceNo
    ),
    index("ms_hsd_invoices_tenant_date_idx").on(
      table.tenantId,
      table.invoiceDate
    ),
  ]
);

export const msHsdInvoiceLines = pgTable("ms_hsd_invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => msHsdInvoices.id, { onDelete: "cascade" }),
  lineOrder: integer("line_order").notNull().default(0),
  product: text("product").notNull(),
  quantityKl: numeric("quantity_kl", { precision: 12, scale: 3 }).notNull(),
  ratePerKl: numeric("rate_per_kl", { precision: 14, scale: 2 }).notNull(),
  totalValue: numeric("total_value", { precision: 14, scale: 2 }).notNull(),
  dlyTaxableCharge: numeric("dly_taxable_charge", {
    precision: 14,
    scale: 2,
  })
    .notNull()
    .default("0"),
  vatLstRate: numeric("vat_lst_rate", { precision: 8, scale: 2 }).notNull(),
  vatLstAmount: numeric("vat_lst_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  additionalVat: numeric("additional_vat", {
    precision: 14,
    scale: 2,
  })
    .notNull()
    .default("0"),
});

/** BPCL LFR (License Fee Recovery) tax invoices (manual entry). */
export const lfrInvoices = pgTable(
  "lfr_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceNo: text("invoice_no").notNull(),
    invoiceDate: date("invoice_date").notNull(),
    description: text("description").notNull(),
    itemCodeText: text("item_code_text").notNull(),
    hsnSac: text("hsn_sac").notNull(),
    taxableAmount: numeric("taxable_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    cgstRate: numeric("cgst_rate", { precision: 8, scale: 2 }).notNull(),
    cgstAmount: numeric("cgst_amount", { precision: 14, scale: 2 }).notNull(),
    sgstRate: numeric("sgst_rate", { precision: 8, scale: 2 }).notNull(),
    sgstAmount: numeric("sgst_amount", { precision: 14, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("lfr_invoices_tenant_invoice_unique").on(
      table.tenantId,
      table.invoiceNo
    ),
  ]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    telegramChatId: text("telegram_chat_id").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [unique("teams_tenant_name_unique").on(table.tenantId, table.name)]
);

export const ticketQuestions = pgTable("ticket_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
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

export const ticketSettings = pgTable(
  "ticket_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    prefix: text("prefix").notNull().default("JCK"),
    paddingWidth: integer("padding_width").notNull().default(6),
    accessCode: text("access_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [unique("ticket_settings_tenant_unique").on(table.tenantId)]
);

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
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
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

export const fuelProducts = pgTable(
  "fuel_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    color: text("color"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("fuel_products_tenant_name_unique").on(table.tenantId, table.name),
  ]
);

export const stationPumps = pgTable(
  "station_pumps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pumpNumber: integer("pump_number").notNull(),
    name: text("name").notNull(),
    /** Machine serial shown on 6AM slip accordion (shared across pumps on the same machine). */
    serialNumber: text("serial_number"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("station_pumps_tenant_pump_number_unique").on(
      table.tenantId,
      table.pumpNumber
    ),
  ]
);

export const stationNozzles = pgTable(
  "station_nozzles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pumpId: uuid("pump_id")
      .notNull()
      .references(() => stationPumps.id, { onDelete: "cascade" }),
    nozzleNumber: integer("nozzle_number").notNull(),
    name: text("name").notNull(),
    productId: uuid("product_id").references(() => fuelProducts.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("station_nozzles_pump_nozzle_number_unique").on(
      table.pumpId,
      table.nozzleNumber
    ),
  ]
);

export const dailyRspPrices = pgTable(
  "daily_rsp_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    priceDate: date("price_date").notNull(),
    hsdPrice: numeric("hsd_price", { precision: 10, scale: 2 }).notNull(),
    msPrice: numeric("ms_price", { precision: 10, scale: 2 }).notNull(),
    speedPrice: numeric("speed_price", { precision: 10, scale: 2 }).notNull(),
    recordedBy: uuid("recorded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("daily_rsp_prices_tenant_date_unique").on(
      table.tenantId,
      table.priceDate
    ),
  ]
);

export const machineSlipEntries = pgTable(
  "machine_slip_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    machineNumber: text("machine_number").notNull(),
    nozzleNumber: integer("nozzle_number").notNull(),
    reading: numeric("reading", { precision: 14, scale: 3 }).notNull(),
    recordedBy: uuid("recorded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    unique("machine_slip_entries_tenant_date_machine_nozzle_unique").on(
      table.tenantId,
      table.entryDate,
      table.machineNumber,
      table.nozzleNumber
    ),
  ]
);

export const interimShiftClosings = pgTable(
  "interim_shift_closings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pumpId: uuid("pump_id").references(() => stationPumps.id, {
      onDelete: "set null",
    }),
    pumpNumber: integer("pump_number").notNull(),
    pumpName: text("pump_name").notNull(),
    staffId: uuid("staff_id").references(() => users.id, {
      onDelete: "set null",
    }),
    shiftDate: timestamp("shift_date", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    totalGross: numeric("total_gross", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    totalTest: numeric("total_test", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    totalNetLitres: numeric("total_net_litres", { precision: 14, scale: 3 })
      .default("0")
      .notNull(),
    totalSalesAmount: numeric("total_sales_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    totalCollected: numeric("total_collected", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    difference: numeric("difference", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    paymentCollections: jsonb("payment_collections"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  }
);

export const shiftClosingEditRequests = pgTable(
  "shift_closing_edit_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: shiftClosingEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    status: shiftClosingEditRequestStatusEnum("status")
      .notNull()
      .default("pending"),
    proposedData: jsonb("proposed_data").notNull(),
    requestNote: text("request_note"),
    reviewNote: text("review_note"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  }
);

export const shiftClosingLedgerEvents = pgTable(
  "shift_closing_ledger_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: shiftClosingEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: shiftClosingLedgerEventTypeEnum("event_type").notNull(),
    detail: text("detail"),
    editRequestId: uuid("edit_request_id").references(
      () => shiftClosingEditRequests.id,
      { onDelete: "set null" }
    ),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  }
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  }
);

export const interimNozzleReadings = pgTable(
  "interim_nozzle_readings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftClosingId: uuid("shift_closing_id")
      .notNull()
      .references(() => interimShiftClosings.id, { onDelete: "cascade" }),
    nozzleId: uuid("nozzle_id").references(() => stationNozzles.id, {
      onDelete: "set null",
    }),
    nozzleName: text("nozzle_name").notNull(),
    openingReading: numeric("opening_reading", { precision: 16, scale: 3 }).notNull(),
    closingReading: numeric("closing_reading", { precision: 16, scale: 3 }).notNull(),
    testVolume: numeric("test_volume", { precision: 12, scale: 3 })
      .default("0")
      .notNull(),
    netVolume: numeric("net_volume", { precision: 14, scale: 3 }).notNull(),
    ratePerLitre: numeric("rate_per_litre", { precision: 10, scale: 2 }),
    salesAmount: numeric("sales_amount", { precision: 14, scale: 2 }),
  }
);

export const interimPaymentCollections = pgTable(
  "interim_payment_collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftClosingId: uuid("shift_closing_id")
      .notNull()
      .references(() => interimShiftClosings.id, { onDelete: "cascade" }),
    cashAmount: numeric("cash_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    cashDenominations: jsonb("cash_denominations"),
    pinelabsCard: numeric("pinelabs_card", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    pinelabsUpi: numeric("pinelabs_upi", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    pinelabsAlp: numeric("pinelabs_alp", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    pos: numeric("pos", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    qr: numeric("qr", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    ufill: numeric("ufill", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    bill: numeric("bill", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    expenses: numeric("expenses", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    totalCollected: numeric("total_collected", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  }
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  roles: many(roles),
  users: many(users),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  permissions: many(rolePermissions),
  users: many(users),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  transactions: many(inventoryTransactions),
}));

export const oilProductsRelations = relations(oilProducts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [oilProducts.tenantId],
    references: [tenants.id],
  }),
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
    returnedCase: one(returnedCases, {
      fields: [inventoryTransactions.id],
      references: [returnedCases.receiveTransactionId],
    }),
  })
);

export const returnedCasesRelations = relations(
  returnedCases,
  ({ one, many }) => ({
    product: one(oilProducts, {
      fields: [returnedCases.productId],
      references: [oilProducts.id],
    }),
    receiveTransaction: one(inventoryTransactions, {
      fields: [returnedCases.receiveTransactionId],
      references: [inventoryTransactions.id],
    }),
    events: many(returnedCaseEvents),
  })
);

export const returnedCaseEventsRelations = relations(
  returnedCaseEvents,
  ({ one }) => ({
    returnedCase: one(returnedCases, {
      fields: [returnedCaseEvents.returnedCaseId],
      references: [returnedCases.id],
    }),
  })
);

export const stockBalanceRelations = relations(stockBalance, ({ one }) => ({
  product: one(oilProducts, {
    fields: [stockBalance.productId],
    references: [oilProducts.id],
  }),
}));

export const msHsdInvoicesRelations = relations(msHsdInvoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [msHsdInvoices.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [msHsdInvoices.createdBy],
    references: [users.id],
  }),
  lines: many(msHsdInvoiceLines),
}));

export const msHsdInvoiceLinesRelations = relations(
  msHsdInvoiceLines,
  ({ one }) => ({
    invoice: one(msHsdInvoices, {
      fields: [msHsdInvoiceLines.invoiceId],
      references: [msHsdInvoices.id],
    }),
  })
);

export const lfrInvoicesRelations = relations(lfrInvoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [lfrInvoices.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [lfrInvoices.createdBy],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [teams.tenantId],
    references: [tenants.id],
  }),
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

export const fuelProductsRelations = relations(fuelProducts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [fuelProducts.tenantId],
    references: [tenants.id],
  }),
  nozzles: many(stationNozzles),
}));

export const stationPumpsRelations = relations(stationPumps, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stationPumps.tenantId],
    references: [tenants.id],
  }),
  nozzles: many(stationNozzles),
}));

export const stationNozzlesRelations = relations(stationNozzles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stationNozzles.tenantId],
    references: [tenants.id],
  }),
  pump: one(stationPumps, {
    fields: [stationNozzles.pumpId],
    references: [stationPumps.id],
  }),
  product: one(fuelProducts, {
    fields: [stationNozzles.productId],
    references: [fuelProducts.id],
  }),
}));

export const dailyRspPricesRelations = relations(dailyRspPrices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dailyRspPrices.tenantId],
    references: [tenants.id],
  }),
  recorder: one(users, {
    fields: [dailyRspPrices.recordedBy],
    references: [users.id],
  }),
}));

export const machineSlipEntriesRelations = relations(
  machineSlipEntries,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [machineSlipEntries.tenantId],
      references: [tenants.id],
    }),
    recorder: one(users, {
      fields: [machineSlipEntries.recordedBy],
      references: [users.id],
    }),
  })
);

export const interimShiftClosingsRelations = relations(
  interimShiftClosings,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [interimShiftClosings.tenantId],
      references: [tenants.id],
    }),
    pump: one(stationPumps, {
      fields: [interimShiftClosings.pumpId],
      references: [stationPumps.id],
    }),
    staff: one(users, {
      fields: [interimShiftClosings.staffId],
      references: [users.id],
      relationName: "interimShiftClosingStaff",
    }),
    creator: one(users, {
      fields: [interimShiftClosings.createdBy],
      references: [users.id],
      relationName: "interimShiftClosingCreator",
    }),
    nozzles: many(interimNozzleReadings),
    paymentCollection: one(interimPaymentCollections),
  })
);

export const interimNozzleReadingsRelations = relations(
  interimNozzleReadings,
  ({ one }) => ({
    shiftClosing: one(interimShiftClosings, {
      fields: [interimNozzleReadings.shiftClosingId],
      references: [interimShiftClosings.id],
    }),
    nozzle: one(stationNozzles, {
      fields: [interimNozzleReadings.nozzleId],
      references: [stationNozzles.id],
    }),
  })
);

export const interimPaymentCollectionsRelations = relations(
  interimPaymentCollections,
  ({ one }) => ({
    shiftClosing: one(interimShiftClosings, {
      fields: [interimPaymentCollections.shiftClosingId],
      references: [interimShiftClosings.id],
    }),
  })
);

export const shiftClosingEditRequestsRelations = relations(
  shiftClosingEditRequests,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [shiftClosingEditRequests.tenantId],
      references: [tenants.id],
    }),
    requester: one(users, {
      fields: [shiftClosingEditRequests.requestedBy],
      references: [users.id],
      relationName: "shiftClosingEditRequester",
    }),
    reviewer: one(users, {
      fields: [shiftClosingEditRequests.reviewedBy],
      references: [users.id],
      relationName: "shiftClosingEditReviewer",
    }),
  })
);

export const shiftClosingLedgerEventsRelations = relations(
  shiftClosingLedgerEvents,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [shiftClosingLedgerEvents.tenantId],
      references: [tenants.id],
    }),
    editRequest: one(shiftClosingEditRequests, {
      fields: [shiftClosingLedgerEvents.editRequestId],
      references: [shiftClosingEditRequests.id],
    }),
    creator: one(users, {
      fields: [shiftClosingLedgerEvents.createdBy],
      references: [users.id],
    }),
  })
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [pushSubscriptions.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type User = typeof users.$inferSelect;
export type OilProduct = typeof oilProducts.$inferSelect;
export type FuelProduct = typeof fuelProducts.$inferSelect;
export type StationPump = typeof stationPumps.$inferSelect;
export type StationNozzle = typeof stationNozzles.$inferSelect;
export type DailyRspPrice = typeof dailyRspPrices.$inferSelect;
export type MachineSlipEntry = typeof machineSlipEntries.$inferSelect;
export type InterimShiftClosing = typeof interimShiftClosings.$inferSelect;
export type InterimNozzleReading = typeof interimNozzleReadings.$inferSelect;
export type InterimPaymentCollection = typeof interimPaymentCollections.$inferSelect;
export type ShiftClosingEditRequest =
  typeof shiftClosingEditRequests.$inferSelect;
export type ShiftClosingLedgerEvent =
  typeof shiftClosingLedgerEvents.$inferSelect;
export type ShiftClosingEntityType =
  (typeof shiftClosingEntityTypeEnum.enumValues)[number];
export type ShiftClosingEditRequestStatus =
  (typeof shiftClosingEditRequestStatusEnum.enumValues)[number];
export type ShiftClosingLedgerEventType =
  (typeof shiftClosingLedgerEventTypeEnum.enumValues)[number];
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type StockBalance = typeof stockBalance.$inferSelect;
export type ReturnedCase = typeof returnedCases.$inferSelect;
export type ReturnedCaseEvent = typeof returnedCaseEvents.$inferSelect;
export type ReturnCaseStatus = (typeof returnCaseStatusEnum.enumValues)[number];
export type ReturnCaseEventType =
  (typeof returnCaseEventTypeEnum.enumValues)[number];
export type DailySale = typeof dailySales.$inferSelect;
export type MsHsdInvoice = typeof msHsdInvoices.$inferSelect;
export type MsHsdInvoiceLine = typeof msHsdInvoiceLines.$inferSelect;
export type LfrInvoice = typeof lfrInvoices.$inferSelect;
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
