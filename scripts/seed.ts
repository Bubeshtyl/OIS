import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { oilProducts, roles, tenants, users } from "../lib/db/schema";
import { SYSTEM_ADMIN_ROLE_NAME } from "../lib/auth/role-defaults";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  const db = getDb();
  const passwordHash = await bcrypt.hash("admin123", 10);
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

  const [adminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(eq(roles.tenantId, tenant.id), eq(roles.name, SYSTEM_ADMIN_ROLE_NAME))
    )
    .limit(1);

  if (!adminRole) {
    throw new Error(
      `Admin role not found for station "${tenant.name}". Recreate the station from Platform.`
    );
  }

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      tenantId: tenant.id,
      roleId: adminRole.id,
      name: "Admin",
      username: "admin",
      passwordHash,
      isPlatformAdmin: false,
      isActive: true,
    });
    console.log(
      `Created admin user for ${tenant.name} (${tenant.slug}): admin / admin123`
    );
  } else {
    console.log("Admin user already exists, skipping.");
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
        ...product,
        tenantId: tenant.id,
        isActive: true,
      });
      console.log(`Created product: ${product.name}`);
    }
  }

  console.log(`Seed complete for ${tenant.name}.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
