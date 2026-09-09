import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { oilProducts, tenants, users } from "../lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  const db = getDb();
  const passwordHash = await bcrypt.hash("prime123", 10);
  const slug = process.env.SEED_TENANT_SLUG?.trim();

  const [tenant] = slug
    ? await db
        .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1)
    : await db
        .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
        .from(tenants)
        .orderBy(asc(tenants.createdAt))
        .limit(1);

  if (!tenant) {
    throw new Error(
      slug
        ? `Tenant slug "${slug}" not found. Create the station from Platform first.`
        : "No stations found. Create one from Platform (/platform), then re-run seed."
    );
  }

  const existingPrime = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.isPrime, true)))
    .limit(1);

  if (existingPrime.length === 0) {
    const existingAdminUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, "prime"))
      .limit(1);

    if (existingAdminUsername.length === 0) {
      await db.insert(users).values({
        tenantId: tenant.id,
        roleId: null,
        name: "Prime",
        username: "prime",
        passwordHash,
        isPlatformAdmin: false,
        isPrime: true,
        isActive: true,
      });
      console.log(
        `Created Prime user for ${tenant.name} (${tenant.slug}): prime / prime123`
      );
    } else {
      await db
        .update(users)
        .set({
          isPrime: true,
          roleId: null,
          tenantId: tenant.id,
        })
        .where(eq(users.id, existingAdminUsername[0]!.id));
      console.log(
        `Promoted existing 'prime' user to Prime for ${tenant.name}.`
      );
    }
  } else {
    console.log("Prime user already exists, skipping.");
  }

  const sampleProducts = [
    {
      name: "Castrol 5W-30 (Bike)",
      unit: "litre" as const,
      costPrice: "120.00",
      sellingPrice: "150.00",
      lowStockThreshold: "5",
    },
    {
      name: "Mobil 10W-40 (Car)",
      unit: "litre" as const,
      costPrice: "180.00",
      sellingPrice: "200.00",
      lowStockThreshold: "8",
    },
    {
      name: "Servo 20W-50 (Bike)",
      unit: "litre" as const,
      costPrice: "100.00",
      sellingPrice: "130.00",
      lowStockThreshold: "5",
    },
    {
      name: "Shell Helix 5W-40 (Car)",
      unit: "litre" as const,
      costPrice: "220.00",
      sellingPrice: "260.00",
      lowStockThreshold: "6",
    },
    {
      name: "Gulf Pride 20W-40 (Universal)",
      unit: "litre" as const,
      costPrice: "90.00",
      sellingPrice: "110.00",
      lowStockThreshold: "10",
    },
  ];

  for (const product of sampleProducts) {
    const [existing] = await db
      .select()
      .from(oilProducts)
      .where(
        and(
          eq(oilProducts.tenantId, tenant.id),
          eq(oilProducts.name, product.name)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(oilProducts).values({
        tenantId: tenant.id,
        ...product,
        isActive: true,
      });
    }
  }

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
