import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import {
  ADMIN_PERMISSIONS,
  LEGACY_ROLE_PERMISSIONS,
  SYSTEM_ADMIN_ROLE_NAME,
} from "../lib/auth/role-defaults";

config({ path: ".env.local" });
config({ path: ".env" });

type Db = ReturnType<typeof getDb>;

async function migrateSchema() {
  const db = getDb();

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS volume_per_box numeric(12, 3)
  `);

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS packets_per_box numeric(12, 0)
  `);

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS volume_per_packet numeric(12, 3)
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE product_unit ADD VALUE IF NOT EXISTS 'millilitre';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'RETURNED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DAMAGED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) THEN
        ALTER TABLE users RENAME COLUMN email TO username;
        UPDATE users SET username = 'admin' WHERE username = 'admin@station.com';
      END IF;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE question_answer_type AS ENUM ('TEXT', 'CHOICE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE telegram_session_step AS ENUM ('AWAITING_TEAM', 'AWAITING_ANSWER', 'AWAITING_CONFIRMATION');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      telegram_chat_id text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ticket_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "order" integer NOT NULL UNIQUE,
      prompt text NOT NULL,
      answer_type question_answer_type NOT NULL DEFAULT 'TEXT',
      choices jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ticket_settings (
      id integer PRIMARY KEY DEFAULT 1,
      prefix text NOT NULL DEFAULT 'JCK',
      padding_width integer NOT NULL DEFAULT 6,
      access_code text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Legacy singleton seed. Multi-tenant ticket_settings uses uuid id — skip then.
  try {
    await db.execute(sql`
      INSERT INTO ticket_settings (id, prefix, padding_width)
      VALUES (1, 'JCK', 6)
      ON CONFLICT (id) DO NOTHING
    `);
  } catch {
    // ignore type mismatch after multi-tenant migration
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_seq serial NOT NULL UNIQUE,
      team_id uuid NOT NULL REFERENCES teams(id),
      status ticket_status NOT NULL DEFAULT 'OPEN',
      answers jsonb NOT NULL DEFAULT '[]',
      requester_telegram_user_id text,
      requester_telegram_chat_id text,
      requester_name text NOT NULL,
      requester_username text,
      created_by_user_id uuid REFERENCES users(id),
      resolution_note text,
      notified_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_sessions (
      chat_id text PRIMARY KEY,
      step telegram_session_step NOT NULL DEFAULT 'AWAITING_TEAM',
      team_id uuid REFERENCES teams(id),
      question_queue jsonb NOT NULL DEFAULT '[]',
      answers jsonb NOT NULL DEFAULT '[]',
      code_attempts integer NOT NULL DEFAULT 0,
      telegram_user_id text NOT NULL,
      telegram_username text,
      telegram_first_name text,
      telegram_last_name text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_processed_updates (
      update_id text PRIMARY KEY,
      processed_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE ticket_settings
    ADD COLUMN IF NOT EXISTS access_code text
  `);

  await db.execute(sql`
    ALTER TABLE telegram_sessions
    ADD COLUMN IF NOT EXISTS code_attempts integer NOT NULL DEFAULT 0
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE telegram_session_step ADD VALUE IF NOT EXISTS 'AWAITING_ACCESS_CODE';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    ALTER TABLE tickets
    ALTER COLUMN requester_telegram_user_id DROP NOT NULL
  `);

  await db.execute(sql`
    ALTER TABLE tickets
    ALTER COLUMN requester_telegram_chat_id DROP NOT NULL
  `);

  await db.execute(sql`
    ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id)
  `);

  await db.execute(sql`
    ALTER TABLE ticket_questions
    ADD COLUMN IF NOT EXISTS depends_on_question_id uuid
  `);

  await db.execute(sql`
    ALTER TABLE ticket_questions
    ADD COLUMN IF NOT EXISTS choices_by_parent jsonb
  `);

  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_sales (
      receipt_no text PRIMARY KEY,
      start_date timestamp NOT NULL,
      end_date timestamp NOT NULL,
      product text NOT NULL,
      amount numeric(14, 3) NOT NULL,
      volume_litre numeric(14, 3) NOT NULL,
      rate_per_ltr numeric(14, 3) NOT NULL,
      mop_type text NOT NULL,
      dsm_name text NOT NULL,
      bay_no integer,
      nozzle_no integer,
      start_tot numeric(16, 3) NOT NULL,
      end_tot numeric(16, 3) NOT NULL,
      discount_amount numeric(14, 3) NOT NULL DEFAULT 0,
      net_amount numeric(14, 3) NOT NULL,
      vehicle_no text,
      vehicle_segment text,
      mobile_no text,
      loaded_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_sales_uploads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name text NOT NULL,
      uploaded_by uuid REFERENCES users(id),
      inserted integer NOT NULL DEFAULT 0,
      updated integer NOT NULL DEFAULT 0,
      total integer NOT NULL DEFAULT 0,
      skipped integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role user_role NOT NULL,
      permission text NOT NULL,
      PRIMARY KEY (role, permission)
    )
  `);

  // Legacy role_permissions (role enum). Multi-tenant uses (role_id, permission).
  try {
    await db.execute(sql`
      INSERT INTO role_permissions (role, permission)
      VALUES
        ('MANAGER', 'dashboard:read'),
        ('MANAGER', 'receive:write'),
        ('MANAGER', 'transfer:write'),
        ('MANAGER', 'sales:write'),
        ('MANAGER', 'reports:read'),
        ('MANAGER', 'file-upload:read'),
        ('MANAGER', 'daily-sales:read'),
        ('MANAGER', 'sales-data-analytics:read'),
        ('MANAGER', 'tickets:read'),
        ('MANAGER', 'tickets:manage'),
        ('ACCOUNTS', 'dashboard:read'),
        ('ACCOUNTS', 'reports:read'),
        ('ACCOUNTS', 'file-upload:read'),
        ('ACCOUNTS', 'daily-sales:read'),
        ('ACCOUNTS', 'sales-data-analytics:read'),
        ('ACCOUNTS', 'tickets:read')
      ON CONFLICT (role, permission) DO NOTHING
    `);
  } catch {
    // ignore after multi-tenant migration renamed/replaced this table
  }

  console.log("Legacy schema migration applied.");

  await migrateToMultiTenant(db);

  console.log("Schema migration applied.");
}

// ---------------------------------------------------------------------------
// Multi-tenant migration
//
// Everything below is idempotent: it inspects information_schema/pg_catalog
// before altering anything, so re-running this script after a partial or
// full previous run is always safe.
// ---------------------------------------------------------------------------

async function tableExists(db: Db, table: string): Promise<boolean> {
  const rows = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists
  `);
  return Boolean(rows[0]?.exists);
}

async function columnExists(
  db: Db,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `);
  return Boolean(rows[0]?.exists);
}

async function columnDataType(
  db: Db,
  table: string,
  column: string
): Promise<string | null> {
  const rows = await db.execute<{ data_type: string }>(sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `);
  return rows[0]?.data_type ?? null;
}

async function primaryKeyInfo(
  db: Db,
  table: string
): Promise<{ constraintName: string; columns: string[] } | null> {
  const rows = await db.execute<{
    constraint_name: string;
    column_name: string;
  }>(sql`
    SELECT tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${table}
      AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position
  `);

  if (rows.length === 0) return null;

  return {
    constraintName: rows[0]!.constraint_name,
    columns: rows.map((row) => row.column_name),
  };
}

/** Finds a single/composite UNIQUE constraint whose column set matches exactly. */
async function findUniqueConstraint(
  db: Db,
  table: string,
  columns: string[]
): Promise<string | null> {
  const rows = await db.execute<{
    constraint_name: string;
    column_name: string;
  }>(sql`
    SELECT tc.constraint_name, kcu.column_name, kcu.ordinal_position
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${table}
      AND tc.constraint_type = 'UNIQUE'
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `);

  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const cols = grouped.get(row.constraint_name) ?? [];
    cols.push(row.column_name);
    grouped.set(row.constraint_name, cols);
  }

  for (const [name, cols] of grouped) {
    if (cols.length === columns.length && cols.every((c, i) => c === columns[i])) {
      return name;
    }
  }
  return null;
}

async function constraintExists(db: Db, name: string): Promise<boolean> {
  const rows = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = ${name}
    ) AS exists
  `);
  return Boolean(rows[0]?.exists);
}

async function dropConstraintIfExists(db: Db, table: string, name: string) {
  await db.execute(
    sql`ALTER TABLE ${sql.identifier(table)} DROP CONSTRAINT IF EXISTS ${sql.identifier(name)}`
  );
}

/** Only used when migrating pre-tenant data that still has NULL tenant_id. */
async function ensureLegacyMigrationTenant(db: Db): Promise<string> {
  const existing = await db.execute<{ id: string }>(sql`
    SELECT id FROM tenants WHERE slug = 'legacy-migration' LIMIT 1
  `);
  if (existing.length > 0) return existing[0]!.id;

  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO tenants (slug, name, onboarding_complete, is_active)
    VALUES ('legacy-migration', 'Legacy Migration', true, true)
    RETURNING id
  `);
  console.log(
    "Created temporary 'Legacy Migration' tenant to hold pre-tenant data. Rename or replace it from Platform."
  );
  return inserted[0]!.id;
}

async function needsLegacyTenantBackfill(
  db: Db,
  tenantScopedTables: string[]
): Promise<boolean> {
  if (await columnExists(db, "users", "role")) {
    return true;
  }

  for (const table of tenantScopedTables) {
    if (!(await tableExists(db, table))) continue;
    if (!(await columnExists(db, table, "tenant_id"))) continue;
    const rows = await db.execute<{ has_null: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM ${sql.identifier(table)} WHERE tenant_id IS NULL
      ) AS has_null
    `);
    if (rows[0]?.has_null) return true;
  }

  return false;
}

async function ensureSystemRole(
  db: Db,
  tenantId: string,
  name: string
): Promise<string> {
  const existing = await db.execute<{ id: string }>(sql`
    SELECT id FROM roles WHERE tenant_id = ${tenantId} AND name = ${name} LIMIT 1
  `);
  if (existing.length > 0) return existing[0]!.id;

  const inserted = await db.execute<{ id: string }>(sql`
    INSERT INTO roles (tenant_id, name, is_system)
    VALUES (${tenantId}, ${name}, true)
    RETURNING id
  `);
  return inserted[0]!.id;
}

async function grantPermission(db: Db, roleId: string, permission: string) {
  await db.execute(sql`
    INSERT INTO role_permissions (role_id, permission)
    VALUES (${roleId}, ${permission})
    ON CONFLICT (role_id, permission) DO NOTHING
  `);
}

/** Reads permissions for a legacy MANAGER/ACCOUNTS role from the pre-tenant
 * role_permissions_legacy table when present, otherwise falls back to the
 * hard-coded defaults that used to be seeded by this script. */
async function legacyPermissionsFor(
  db: Db,
  role: "MANAGER" | "ACCOUNTS"
): Promise<string[]> {
  if (await tableExists(db, "role_permissions_legacy")) {
    const rows = await db.execute<{ permission: string }>(sql`
      SELECT permission FROM role_permissions_legacy WHERE role::text = ${role}
    `);
    if (rows.length > 0) {
      return rows.map((row) => row.permission);
    }
  }
  return LEGACY_ROLE_PERMISSIONS[role];
}

async function addTenantIdColumn(db: Db, table: string) {
  await db.execute(
    sql`ALTER TABLE ${sql.identifier(table)} ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE`
  );
}

async function backfillTenantId(db: Db, table: string, tenantId: string) {
  await db.execute(
    sql`UPDATE ${sql.identifier(table)} SET tenant_id = ${tenantId} WHERE tenant_id IS NULL`
  );
}

async function setTenantIdNotNull(db: Db, table: string) {
  await db.execute(
    sql`ALTER TABLE ${sql.identifier(table)} ALTER COLUMN tenant_id SET NOT NULL`
  );
}

async function migrateToMultiTenant(db: Db) {
  // a. tenants
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      address_line1 text,
      address_line2 text,
      city text,
      state text,
      pincode text,
      phone text,
      onboarding_complete boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
  `);

  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at timestamptz
  `);

  // b. roles
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name text NOT NULL,
      is_system boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT roles_tenant_name_unique UNIQUE (tenant_id, name)
    )
  `);

  // c. rename the old (role, permission) role_permissions table out of the way
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'role_permissions'
          AND column_name = 'role'
          AND udt_name = 'user_role'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_permissions_legacy'
      ) THEN
        ALTER TABLE role_permissions RENAME TO role_permissions_legacy;
      END IF;
    END
    $$;
  `);

  // d. new role_permissions keyed by role_id
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission text NOT NULL,
      PRIMARY KEY (role_id, permission)
    )
  `);

  // e. tenant/role columns on users
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id)
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false
  `);

  // f. tenant_id on every tenant-scoped business table
  const tenantScopedTables = [
    "oil_products",
    "inventory_transactions",
    "stock_balance",
    "daily_sales",
    "daily_sales_uploads",
    "teams",
    "ticket_questions",
    "tickets",
    "telegram_sessions",
  ];
  for (const table of tenantScopedTables) {
    await addTenantIdColumn(db, table);
  }

  // g–j. Only create a migration tenant when pre-tenant rows still need a home.
  // Fresh / already-migrated DBs skip this so "Default Station" is never recreated.
  const shouldBackfill = await needsLegacyTenantBackfill(db, tenantScopedTables);
  let migrationTenantId: string | null = null;
  let adminRoleId: string | null = null;

  if (shouldBackfill) {
    migrationTenantId = await ensureLegacyMigrationTenant(db);

    adminRoleId = await ensureSystemRole(
      db,
      migrationTenantId,
      SYSTEM_ADMIN_ROLE_NAME
    );
    const managerRoleId = await ensureSystemRole(
      db,
      migrationTenantId,
      "Manager"
    );
    const accountsRoleId = await ensureSystemRole(
      db,
      migrationTenantId,
      "Accounts"
    );

    for (const permission of ADMIN_PERMISSIONS) {
      await grantPermission(db, adminRoleId, permission);
    }

    const managerPermissions = await legacyPermissionsFor(db, "MANAGER");
    for (const permission of managerPermissions) {
      await grantPermission(db, managerRoleId, permission);
    }

    const accountsPermissions = await legacyPermissionsFor(db, "ACCOUNTS");
    for (const permission of accountsPermissions) {
      await grantPermission(db, accountsRoleId, permission);
    }

    for (const table of tenantScopedTables) {
      await backfillTenantId(db, table, migrationTenantId);
    }

    if (await columnExists(db, "users", "role")) {
      const roleToRoleId: Record<string, string> = {
        ADMIN: adminRoleId,
        MANAGER: managerRoleId,
        ACCOUNTS: accountsRoleId,
      };

      for (const [legacyRole, roleId] of Object.entries(roleToRoleId)) {
        await db.execute(sql`
          UPDATE users
          SET role_id = COALESCE(role_id, ${roleId}),
              tenant_id = COALESCE(tenant_id, ${migrationTenantId})
          WHERE role::text = ${legacyRole}
        `);
      }
    }
  }

  // k. daily_sales primary key -> (tenant_id, receipt_no)
  const dailySalesPk = await primaryKeyInfo(db, "daily_sales");
  if (
    dailySalesPk &&
    dailySalesPk.columns.length === 1 &&
    dailySalesPk.columns[0] === "receipt_no"
  ) {
    if (migrationTenantId) {
      await backfillTenantId(db, "daily_sales", migrationTenantId);
    }
    await dropConstraintIfExists(db, "daily_sales", dailySalesPk.constraintName);
    await db.execute(sql`
      ALTER TABLE daily_sales ADD PRIMARY KEY (tenant_id, receipt_no)
    `);
  }

  // l. stock_balance primary key -> (tenant_id, product_id, location)
  const stockBalancePk = await primaryKeyInfo(db, "stock_balance");
  if (
    stockBalancePk &&
    stockBalancePk.columns.length === 2 &&
    stockBalancePk.columns.includes("product_id") &&
    stockBalancePk.columns.includes("location")
  ) {
    if (migrationTenantId) {
      await backfillTenantId(db, "stock_balance", migrationTenantId);
    }
    await dropConstraintIfExists(db, "stock_balance", stockBalancePk.constraintName);
    await db.execute(sql`
      ALTER TABLE stock_balance ADD PRIMARY KEY (tenant_id, product_id, location)
    `);
  }

  // m. teams: unique(name) -> unique(tenant_id, name)
  const teamsNameUnique = await findUniqueConstraint(db, "teams", ["name"]);
  if (teamsNameUnique) {
    await dropConstraintIfExists(db, "teams", teamsNameUnique);
  }
  if (!(await constraintExists(db, "teams_tenant_name_unique"))) {
    await db.execute(sql`
      ALTER TABLE teams ADD CONSTRAINT teams_tenant_name_unique UNIQUE (tenant_id, name)
    `);
  }

  // n. ticket_questions: "order" is no longer globally unique (per-tenant instead)
  const ticketQuestionsOrderUnique = await findUniqueConstraint(db, "ticket_questions", [
    "order",
  ]);
  if (ticketQuestionsOrderUnique) {
    await dropConstraintIfExists(db, "ticket_questions", ticketQuestionsOrderUnique);
  }

  // o. ticket_settings: single integer-keyed row -> uuid-keyed row per tenant
  const ticketSettingsIdType = await columnDataType(db, "ticket_settings", "id");
  if (ticketSettingsIdType === "integer" && migrationTenantId) {
    if (!(await columnExists(db, "ticket_settings", "tenant_id"))) {
      await db.execute(sql`
        ALTER TABLE ticket_settings ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
      `);
    }
    await backfillTenantId(db, "ticket_settings", migrationTenantId);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_settings_new (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        prefix text NOT NULL DEFAULT 'JCK',
        padding_width integer NOT NULL DEFAULT 6,
        access_code text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ticket_settings_tenant_unique UNIQUE (tenant_id)
      )
    `);

    await db.execute(sql`
      INSERT INTO ticket_settings_new (tenant_id, prefix, padding_width, access_code, updated_at)
      SELECT tenant_id, prefix, padding_width, access_code, updated_at
      FROM ticket_settings
      WHERE tenant_id IS NOT NULL
      ON CONFLICT (tenant_id) DO NOTHING
    `);

    await db.execute(sql`DROP TABLE ticket_settings`);
    await db.execute(sql`ALTER TABLE ticket_settings_new RENAME TO ticket_settings`);
  }

  // p. tenant_id NOT NULL on business tables (daily_sales/stock_balance already
  // enforced via their new primary keys; users/telegram_sessions stay nullable)
  const tablesRequiringNotNullTenant = [
    "oil_products",
    "inventory_transactions",
    "daily_sales_uploads",
    "teams",
    "ticket_questions",
    "tickets",
  ];
  for (const table of tablesRequiringNotNullTenant) {
    await setTenantIdNotNull(db, table);
  }

  // q. drop the legacy enum-based role column now that role_id is populated
  if (await columnExists(db, "users", "role")) {
    await db.execute(sql`ALTER TABLE users DROP COLUMN role`);
  }

  // r. drop the legacy role_permissions table
  await db.execute(sql`DROP TABLE IF EXISTS role_permissions_legacy`);

  // s. platform admin + safety net for the seed tenant's admin user
  const platformAdminUsername = process.env.PLATFORM_ADMIN_USERNAME || "platform";

  const existingPlatformAdmin = await db.execute<{ id: string }>(sql`
    SELECT id FROM users WHERE is_platform_admin = true LIMIT 1
  `);

  if (existingPlatformAdmin.length === 0) {
    const candidate = await db.execute<{ id: string }>(sql`
      SELECT id FROM users WHERE username = ${platformAdminUsername} LIMIT 1
    `);

    if (candidate.length > 0) {
      await db.execute(sql`
        UPDATE users SET is_platform_admin = true WHERE id = ${candidate[0]!.id}
      `);
      console.log(`Promoted existing user '${platformAdminUsername}' to platform admin.`);
    } else {
      const passwordHash = await bcrypt.hash("platform123", 10);
      await db.execute(sql`
        INSERT INTO users (name, username, password_hash, tenant_id, role_id, is_platform_admin, is_active)
        VALUES ('Platform Admin', ${platformAdminUsername}, ${passwordHash}, NULL, NULL, true, true)
      `);
      console.log(
        `Created platform admin user '${platformAdminUsername}' / platform123 — change this password immediately.`
      );
    }
  } else {
    console.log("Platform admin already exists, skipping.");
  }

  // Keep a legacy admin user tied to the migration tenant when one was created.
  if (migrationTenantId && adminRoleId) {
    await db.execute(sql`
      UPDATE users
      SET tenant_id = COALESCE(tenant_id, ${migrationTenantId}),
          role_id = COALESCE(role_id, ${adminRoleId})
      WHERE username = 'admin' AND is_platform_admin = false
    `);
  }

  // t. BPCL receive money fields on inventory_transactions
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS dealer_source text
  `);
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS taxable_value numeric(12, 2)
  `);
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS cgst_amount numeric(12, 2)
  `);
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS sgst_amount numeric(12, 2)
  `);
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS discount_amount numeric(12, 2)
  `);
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    ADD COLUMN IF NOT EXISTS landing_price numeric(12, 4)
  `);

  // u. drop unused rate_per_unit from BPCL receive lines
  await db.execute(sql`
    ALTER TABLE inventory_transactions
    DROP COLUMN IF EXISTS rate_per_unit
  `);

  // v. Generic returned-cases tracking (any dealer via dealer_source)
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE return_case_status AS ENUM ('OPEN', 'REPLACED', 'CLOSED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE return_case_event_type AS ENUM (
        'RECORDED',
        'UPDATED',
        'REPLACEMENT_LINKED',
        'CLOSED'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS returned_cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES oil_products(id),
      receive_transaction_id uuid NOT NULL UNIQUE
        REFERENCES inventory_transactions(id) ON DELETE CASCADE,
      dealer_source text NOT NULL,
      invoice text NOT NULL,
      cases_returned integer NOT NULL,
      cases_replaced integer NOT NULL DEFAULT 0,
      status return_case_status NOT NULL DEFAULT 'OPEN',
      replacement_receive_transaction_id uuid
        REFERENCES inventory_transactions(id) ON DELETE SET NULL,
      replacement_invoice text,
      replaced_at timestamptz,
      notes text,
      created_by uuid NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS returned_case_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      returned_case_id uuid NOT NULL
        REFERENCES returned_cases(id) ON DELETE CASCADE,
      event_type return_case_event_type NOT NULL,
      detail text,
      created_by uuid NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS returned_cases_tenant_invoice_idx
      ON returned_cases (tenant_id, invoice)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS returned_cases_tenant_dealer_idx
      ON returned_cases (tenant_id, dealer_source)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS returned_cases_tenant_status_idx
      ON returned_cases (tenant_id, status)
  `);

  await db.execute(sql`
    ALTER TABLE returned_cases
    ADD COLUMN IF NOT EXISTS cases_replaced integer NOT NULL DEFAULT 0
  `);
  // If a row was already marked REPLACED before cases_replaced existed, treat all as replaced.
  await db.execute(sql`
    UPDATE returned_cases
    SET cases_replaced = cases_returned
    WHERE status = 'REPLACED' AND cases_replaced = 0
  `);

  // Migrate legacy bpcl_returned_cases → returned_cases (if present)
  if (await tableExists(db, "bpcl_returned_cases")) {
    await db.execute(sql`
      INSERT INTO returned_cases (
        id,
        tenant_id,
        product_id,
        receive_transaction_id,
        dealer_source,
        invoice,
        cases_returned,
        status,
        replacement_receive_transaction_id,
        replacement_invoice,
        replaced_at,
        notes,
        created_by,
        created_at,
        updated_at
      )
      SELECT
        id,
        tenant_id,
        product_id,
        receive_transaction_id,
        'BPCL',
        invoice,
        cases_returned,
        status::text::return_case_status,
        replacement_receive_transaction_id,
        replacement_invoice,
        replaced_at,
        notes,
        created_by,
        created_at,
        updated_at
      FROM bpcl_returned_cases
      ON CONFLICT (receive_transaction_id) DO NOTHING
    `);

    if (await tableExists(db, "bpcl_returned_case_events")) {
      await db.execute(sql`
        INSERT INTO returned_case_events (
          id,
          tenant_id,
          returned_case_id,
          event_type,
          detail,
          created_by,
          created_at
        )
        SELECT
          e.id,
          e.tenant_id,
          e.returned_case_id,
          e.event_type::text::return_case_event_type,
          e.detail,
          e.created_by,
          e.created_at
        FROM bpcl_returned_case_events e
        WHERE EXISTS (
          SELECT 1 FROM returned_cases r WHERE r.id = e.returned_case_id
        )
        ON CONFLICT (id) DO NOTHING
      `);
      await db.execute(sql`DROP TABLE IF EXISTS bpcl_returned_case_events`);
    }

    await db.execute(sql`DROP TABLE IF EXISTS bpcl_returned_cases`);
    await db.execute(sql`DROP TYPE IF EXISTS bpcl_return_event_type`);
    await db.execute(sql`DROP TYPE IF EXISTS bpcl_return_status`);
  }

  // Backfill returned cases previously stored in reference_note as "Returned: N"
  const legacyReturned = await db.execute(sql`
    SELECT
      t.id,
      t.tenant_id,
      t.product_id,
      t.dealer_source,
      t.reference_note,
      t.created_by,
      t.created_at
    FROM inventory_transactions t
    WHERE t.type = 'RECEIVE'
      AND t.reference_note ILIKE '%Returned:%'
      AND NOT EXISTS (
        SELECT 1
        FROM returned_cases r
        WHERE r.receive_transaction_id = t.id
      )
  `);

  for (const row of legacyReturned as unknown as Array<{
    id: string;
    tenant_id: string;
    product_id: string;
    dealer_source: string | null;
    reference_note: string | null;
    created_by: string;
    created_at: Date;
  }>) {
    const note = row.reference_note ?? "";
    const returnedMatch = note.match(/^Returned:\s*(\d+)/im);
    const casesReturned = returnedMatch ? Number(returnedMatch[1]) : 0;
    if (!Number.isInteger(casesReturned) || casesReturned < 1) continue;

    const invoiceMatch = note.match(/^Invoice:\s*(.+)$/im);
    const invoice = invoiceMatch?.[1]?.trim() || "UNKNOWN";
    const dealerSource =
      row.dealer_source?.trim() ||
      note.match(/^Supplier:\s*(.+)$/im)?.[1]?.trim() ||
      "UNKNOWN";

    await db.execute(sql`
      WITH inserted AS (
        INSERT INTO returned_cases (
          tenant_id,
          product_id,
          receive_transaction_id,
          dealer_source,
          invoice,
          cases_returned,
          status,
          created_by,
          created_at,
          updated_at
        )
        VALUES (
          ${row.tenant_id},
          ${row.product_id},
          ${row.id},
          ${dealerSource},
          ${invoice},
          ${casesReturned},
          'OPEN',
          ${row.created_by},
          ${row.created_at},
          now()
        )
        ON CONFLICT (receive_transaction_id) DO NOTHING
        RETURNING id, tenant_id, created_by, created_at
      )
      INSERT INTO returned_case_events (
        tenant_id,
        returned_case_id,
        event_type,
        detail,
        created_by,
        created_at
      )
      SELECT
        inserted.tenant_id,
        inserted.id,
        'RECORDED',
        'Backfilled from receive note',
        inserted.created_by,
        inserted.created_at
      FROM inserted
    `);
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ms_hsd_invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_no text NOT NULL,
      invoice_date date NOT NULL,
      vat_stax_cess_total numeric(14, 2) NOT NULL,
      rounding_off numeric(14, 2) NOT NULL DEFAULT 0,
      total_amount numeric(14, 2) NOT NULL,
      created_by uuid NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ms_hsd_invoices_tenant_invoice_unique UNIQUE (tenant_id, invoice_no)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ms_hsd_invoice_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id uuid NOT NULL REFERENCES ms_hsd_invoices(id) ON DELETE CASCADE,
      line_order integer NOT NULL DEFAULT 0,
      product text NOT NULL,
      quantity_kl numeric(12, 3) NOT NULL,
      rate_per_kl numeric(14, 2) NOT NULL,
      total_value numeric(14, 2) NOT NULL,
      dly_taxable_charge numeric(14, 2) NOT NULL DEFAULT 0,
      vat_lst_rate numeric(8, 2) NOT NULL,
      vat_lst_amount numeric(14, 2) NOT NULL,
      additional_vat numeric(14, 2) NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS ms_hsd_invoices_tenant_date_idx
      ON ms_hsd_invoices (tenant_id, invoice_date)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS ms_hsd_invoice_lines_invoice_idx
      ON ms_hsd_invoice_lines (invoice_id)
  `);

  console.log("Multi-tenant migration applied.");
}

migrateSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
