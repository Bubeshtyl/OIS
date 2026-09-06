export const FOOTFALL_ALL_KEY = "all";

export type FootfallChartPoint = { label: string; count: number };

/** One Apply load: axis labels + per-product series + pre-aggregated All. */
export type FootfallTabDataset = {
  labels: string[];
  /** product name → counts aligned to labels */
  byProduct: Record<string, number[]>;
  /** Sum across products, aligned to labels */
  all: number[];
};

export function buildFootfallTabDataset(
  labels: string[],
  rows: Array<{ label: string; product: string; count: number }>
): FootfallTabDataset {
  const labelIndex = new Map(labels.map((label, index) => [label, index]));
  const byProduct: Record<string, number[]> = {};

  for (const row of rows) {
    const index = labelIndex.get(row.label);
    if (index == null) continue;
    const product = row.product.trim();
    if (!product) continue;
    if (!byProduct[product]) {
      byProduct[product] = labels.map(() => 0);
    }
    byProduct[product][index] += row.count;
  }

  const all = labels.map((_, index) =>
    Object.values(byProduct).reduce((sum, counts) => sum + (counts[index] ?? 0), 0)
  );

  return { labels, byProduct, all };
}

export function footfallPointsForTab(
  dataset: FootfallTabDataset,
  product: string | undefined
): FootfallChartPoint[] {
  const counts =
    product && dataset.byProduct[product]
      ? dataset.byProduct[product]
      : dataset.all;
  return dataset.labels.map((label, index) => ({
    label,
    count: counts[index] ?? 0,
  }));
}
