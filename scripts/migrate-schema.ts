import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";

config({ path: ".env.local" });
config({ path: ".env" });

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

  await db.execute(sql`
    INSERT INTO ticket_settings (id, prefix, padding_width)
    VALUES (1, 'JCK', 6)
    ON CONFLICT (id) DO NOTHING
  `);

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
    CREATE TABLE IF NOT EXISTS role_permissions (
      role user_role NOT NULL,
      permission text NOT NULL,
      PRIMARY KEY (role, permission)
    )
  `);

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

  console.log("Schema migration applied.");
}

migrateSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
