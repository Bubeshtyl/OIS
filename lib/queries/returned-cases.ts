import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  oilProducts,
  returnedCases,
  type OilProduct,
} from "@/lib/db/schema";

export type OpenReturnedCaseRow = {
  id: string;
  productId: string;
  productName: string;
  dealerSource: string;
  invoice: string;
  /** Original returned cases on the source invoice. */
  casesReturned: number;
  /** Already replaced so far. */
  casesReplaced: number;
  /** Still waiting for replacement. */
  casesPending: number;
  /** ISO timestamp for client serialization. */
  createdAt: string;
  receiveTransactionId: string;
  product: OilProduct;
};

export async function getOpenReturnedCases(
  tenantId: string
): Promise<OpenReturnedCaseRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: returnedCases.id,
      productId: returnedCases.productId,
      productName: oilProducts.name,
      dealerSource: returnedCases.dealerSource,
      invoice: returnedCases.invoice,
      casesReturned: returnedCases.casesReturned,
      casesReplaced: returnedCases.casesReplaced,
      createdAt: returnedCases.createdAt,
      receiveTransactionId: returnedCases.receiveTransactionId,
      product: oilProducts,
    })
    .from(returnedCases)
    .innerJoin(oilProducts, eq(returnedCases.productId, oilProducts.id))
    .where(
      and(
        eq(returnedCases.tenantId, tenantId),
        eq(returnedCases.status, "OPEN")
      )
    )
    .orderBy(asc(returnedCases.createdAt), desc(returnedCases.invoice));

  return rows.map((row) => {
    const casesReplaced = row.casesReplaced ?? 0;
    return {
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      dealerSource: row.dealerSource,
      invoice: row.invoice,
      casesReturned: row.casesReturned,
      casesReplaced,
      casesPending: Math.max(0, row.casesReturned - casesReplaced),
      createdAt: row.createdAt.toISOString(),
      receiveTransactionId: row.receiveTransactionId,
      product: row.product,
    };
  });
}
