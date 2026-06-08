import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { oilProducts, users } from "../lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  const db = getDb();
  const passwordHash = await bcrypt.hash("admin123", 10);

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      name: "Admin",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    });
    console.log("Created admin user: admin / admin123");
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
      .where(eq(oilProducts.name, product.name))
      .limit(1);

    if (!existing) {
      await db.insert(oilProducts).values({
        ...product,
        isActive: true,
      });
      console.log(`Created product: ${product.name}`);
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
