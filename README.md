# OIS — Oil Station Inventory Management

Petrol station oil inventory app for tracking supplier receipts, depot-to-manager transfers, and daily sales. Inventory changes only via transaction forms (or explicit SQL against the ledger) — never by editing stock numbers directly.

## Stack

- Next.js 16 (App Router)
- Drizzle ORM + Supabase PostgreSQL
- shadcn/ui + Tailwind CSS
- iron-session + bcrypt auth
- Zod validation, Recharts dashboard

## Default credentials (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@station.com | admin123 | ADMIN |

Change the admin password after first login in production.

## Setup

1. **Clone and install**

```bash
cd OIS
npm install
```

2. **Configure environment**

```bash
cp .env.example .env.local
```

Set `SESSION_SECRET` to a random string (32+ characters).

In the [Supabase](https://supabase.com) dashboard, open **Settings → Database → Connection string**, choose **URI**, and copy the strings below into `.env.local` (replace `[password]` with your database password):

| Variable | Connection type | Port | Used for |
|----------|-----------------|------|----------|
| `DATABASE_URL` | **Transaction pooler** (recommended) | 6543 | Next.js app runtime (serverless) |
| `DATABASE_MIGRATIONS_URL` | **Direct connection** or **Session pooler** (optional but recommended) | 5432 | `npm run db:push`, `db:generate`, one-off scripts |

Example:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_MIGRATIONS_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
SESSION_SECRET=your-long-random-secret
```

If you skip `DATABASE_MIGRATIONS_URL`, `db:push` uses `DATABASE_URL` — use a direct or session pooler string for migrations if the transaction pooler fails.

3. **Push schema and seed**

```bash
npm run db:push
npm run db:seed
```

4. **Run dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to Supabase |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:seed` | Seed admin user + sample products |
| `npm run db:reconcile` | Recompute stock_balance from ledger |

## Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access + product/user management + reversals |
| **MANAGER** | Receive, transfer, sales, dashboard, reports |
| **ACCOUNTS** | Read-only dashboard + reports |

## Three inventory segments

1. **Receive** — Supplier → Depot (Segment 1)
2. **Transfer** — Depot → Oil Manager (Segment 2)
3. **Sales** — Oil Manager → Sold, daily totals only (Segment 3)

## Locale

- Currency: INR (₹) with `en-IN` formatting
- Timezone: IST (`Asia/Kolkata`) for “today” KPIs and default dates

## App motto

> Inventory is updated via the UI or via SQL if required.

Every stock change creates an `inventory_transactions` row and updates the `stock_balance` cache in the same database transaction.
