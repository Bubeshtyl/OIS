import { config } from "dotenv";
import { createTenantWithAdmin, listTenants } from "../lib/tenants/service";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const existing = await listTenants();
  if (existing.length > 0) {
    console.log(
      `Station(s) already exist: ${existing.map((t) => t.slug).join(", ")}. Skipping.`
    );
    process.exit(0);
  }

  const { tenant, adminUser } = await createTenantWithAdmin({
    name: "Demo Station",
    slug: "demo-station",
    adminName: "Admin",
    adminUsername: "admin",
    adminPassword: "admin123",
    addressLine1: "1 Demo Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    phone: "9999999999",
  });

  console.log(
    `Created station "${tenant.name}" (${tenant.slug}) with admin ${adminUser.username} / admin123`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
