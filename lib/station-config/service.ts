import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  fuelProducts,
  stationNozzles,
  stationPumps,
  type FuelProduct,
  type StationNozzle,
  type StationPump,
} from "@/lib/db/schema";
import { ensureStationPumpSerialSchema } from "@/lib/station-config/ensure-schema";

export interface NozzleWithProduct extends StationNozzle {
  product?: FuelProduct | null;
}

export interface PumpWithNozzles extends StationPump {
  nozzles: NozzleWithProduct[];
}

export interface StationLayout {
  products: FuelProduct[];
  pumps: PumpWithNozzles[];
}

const DEFAULT_PRODUCTS = [
  { name: "Diesel (HSD)", code: "HSD", color: "amber", sortOrder: 1 },
  { name: "Petrol (MS)", code: "MS", color: "emerald", sortOrder: 2 },
  { name: "Speed", code: "SPEED", color: "blue", sortOrder: 3 },
];

/**
 * Configuration synchronized with master station spreadsheet:
 * HSD:   P1N2, P2N4, P3N1, P4N2
 * MS:    P1N1, P2N3, P3N5, P4N6, P5N3, P6N1
 * SPEED: P3N3, P4N4, P5N4, P6N2
 *
 * Machine serials (6AM slip accordion):
 * 202206000654 → P1, P2
 * M2446157     → P3, P4
 * 202206000650 → P5, P6
 */
const DEFAULT_PUMP_NOZZLE_CONFIG = [
  {
    pumpNumber: 1,
    name: "Pump 1",
    serialNumber: "202206000654",
    nozzles: [
      { nozzleNumber: 1, name: "Nozzle 1", productCode: "MS" },
      { nozzleNumber: 2, name: "Nozzle 2", productCode: "HSD" },
    ],
  },
  {
    pumpNumber: 2,
    name: "Pump 2",
    serialNumber: "202206000654",
    nozzles: [
      { nozzleNumber: 3, name: "Nozzle 3", productCode: "MS" },
      { nozzleNumber: 4, name: "Nozzle 4", productCode: "HSD" },
    ],
  },
  {
    pumpNumber: 3,
    name: "Pump 3",
    serialNumber: "M2446157",
    nozzles: [
      { nozzleNumber: 1, name: "Nozzle 1", productCode: "HSD" },
      { nozzleNumber: 3, name: "Nozzle 3", productCode: "SPEED" },
      { nozzleNumber: 5, name: "Nozzle 5", productCode: "MS" },
    ],
  },
  {
    pumpNumber: 4,
    name: "Pump 4",
    serialNumber: "M2446157",
    nozzles: [
      { nozzleNumber: 2, name: "Nozzle 2", productCode: "HSD" },
      { nozzleNumber: 4, name: "Nozzle 4", productCode: "SPEED" },
      { nozzleNumber: 6, name: "Nozzle 6", productCode: "MS" },
    ],
  },
  {
    pumpNumber: 5,
    name: "Pump 5",
    serialNumber: "202206000650",
    nozzles: [
      { nozzleNumber: 3, name: "Nozzle 3", productCode: "MS" },
      { nozzleNumber: 4, name: "Nozzle 4", productCode: "SPEED" },
    ],
  },
  {
    pumpNumber: 6,
    name: "Pump 6",
    serialNumber: "202206000650",
    nozzles: [
      { nozzleNumber: 1, name: "Nozzle 1", productCode: "MS" },
      { nozzleNumber: 2, name: "Nozzle 2", productCode: "SPEED" },
    ],
  },
];

export async function seedStationDefaultLayout(
  tenantId: string
): Promise<StationLayout> {
  await ensureStationPumpSerialSchema();
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Delete existing config for this tenant
    await tx.delete(stationNozzles).where(eq(stationNozzles.tenantId, tenantId));
    await tx.delete(stationPumps).where(eq(stationPumps.tenantId, tenantId));
    await tx.delete(fuelProducts).where(eq(fuelProducts.tenantId, tenantId));

    // 2. Insert default fuel products
    const insertedProducts: Record<string, FuelProduct> = {};
    for (const prod of DEFAULT_PRODUCTS) {
      const [p] = await tx
        .insert(fuelProducts)
        .values({
          tenantId,
          name: prod.name,
          code: prod.code,
          color: prod.color,
          sortOrder: prod.sortOrder,
          isActive: true,
        })
        .returning();
      if (p.code) {
        insertedProducts[p.code] = p;
      }
    }

    // 3. Insert default pumps and nozzles
    const resultPumps: PumpWithNozzles[] = [];
    for (const pumpCfg of DEFAULT_PUMP_NOZZLE_CONFIG) {
      const [pump] = await tx
        .insert(stationPumps)
        .values({
          tenantId,
          pumpNumber: pumpCfg.pumpNumber,
          name: pumpCfg.name,
          serialNumber: pumpCfg.serialNumber,
          sortOrder: pumpCfg.pumpNumber,
          isActive: true,
        })
        .returning();

      const pumpNozzles: NozzleWithProduct[] = [];
      for (const [idx, nz] of pumpCfg.nozzles.entries()) {
        const prod = nz.productCode ? insertedProducts[nz.productCode] : null;
        const [nozzle] = await tx
          .insert(stationNozzles)
          .values({
            tenantId,
            pumpId: pump.id,
            nozzleNumber: nz.nozzleNumber,
            name: nz.name,
            productId: prod ? prod.id : null,
            sortOrder: idx + 1,
            isActive: true,
          })
          .returning();

        pumpNozzles.push({
          ...nozzle,
          product: prod || null,
        });
      }

      resultPumps.push({
        ...pump,
        nozzles: pumpNozzles,
      });
    }

    return {
      products: Object.values(insertedProducts),
      pumps: resultPumps,
    };
  });
}

export async function getStationLayout(tenantId: string): Promise<StationLayout> {
  await ensureStationPumpSerialSchema();
  const db = getDb();

  const [productsList, pumpsList, nozzlesList] = await Promise.all([
    db
      .select()
      .from(fuelProducts)
      .where(eq(fuelProducts.tenantId, tenantId))
      .orderBy(asc(fuelProducts.sortOrder), asc(fuelProducts.name)),
    db
      .select()
      .from(stationPumps)
      .where(eq(stationPumps.tenantId, tenantId))
      .orderBy(asc(stationPumps.pumpNumber), asc(stationPumps.name)),
    db
      .select()
      .from(stationNozzles)
      .where(eq(stationNozzles.tenantId, tenantId))
      .orderBy(asc(stationNozzles.nozzleNumber), asc(stationNozzles.sortOrder)),
  ]);

  // If station has no pumps yet, auto-seed with standard defaults
  if (pumpsList.length === 0) {
    return await seedStationDefaultLayout(tenantId);
  }

  const productsMap = new Map<string, FuelProduct>(
    productsList.map((p) => [p.id, p])
  );

  const nozzlesByPump = new Map<string, NozzleWithProduct[]>();
  for (const nozzle of nozzlesList) {
    const list = nozzlesByPump.get(nozzle.pumpId) ?? [];
    list.push({
      ...nozzle,
      product: nozzle.productId ? productsMap.get(nozzle.productId) ?? null : null,
    });
    nozzlesByPump.set(nozzle.pumpId, list);
  }

  const pumpsWithNozzles: PumpWithNozzles[] = pumpsList.map((pump) => ({
    ...pump,
    nozzles: (nozzlesByPump.get(pump.id) ?? []).sort(
      (a, b) => a.nozzleNumber - b.nozzleNumber || a.sortOrder - b.sortOrder
    ),
  }));

  return {
    products: productsList,
    pumps: pumpsWithNozzles,
  };
}

export type MachineSlipGroup = {
  id: string;
  title: string;
  machineNumber: string;
  nozzles: Array<{ id: string; label: string; nozzleNumber: number }>;
};

/** Group active pumps by serial number for the 6AM slip accordion. */
export function buildMachineSlipGroups(
  pumps: PumpWithNozzles[]
): MachineSlipGroup[] {
  const bySerial = new Map<string, PumpWithNozzles[]>();

  for (const pump of pumps) {
    if (!pump.isActive) continue;
    const serial = pump.serialNumber?.trim();
    if (!serial) continue;
    const list = bySerial.get(serial) ?? [];
    list.push(pump);
    bySerial.set(serial, list);
  }

  return [...bySerial.entries()]
    .sort((a, b) => {
      const aMin = Math.min(...a[1].map((p) => p.pumpNumber));
      const bMin = Math.min(...b[1].map((p) => p.pumpNumber));
      return aMin - bMin;
    })
    .map(([serial, groupPumps]) => {
      const nozzles = groupPumps
        .flatMap((pump) =>
          pump.nozzles
            .filter((n) => n.isActive)
            .map((n) => ({
              id: `${serial}-p${pump.pumpNumber}-n${n.nozzleNumber}`,
              label: `P${pump.pumpNumber} · N${n.nozzleNumber}`,
              nozzleNumber: n.nozzleNumber,
            }))
        )
        .sort((a, b) => a.nozzleNumber - b.nozzleNumber);

      return {
        id: `serial-${serial}`,
        title: serial,
        machineNumber: serial,
        nozzles,
      };
    })
    .filter((group) => group.nozzles.length > 0);
}
