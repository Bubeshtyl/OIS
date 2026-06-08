export function buildFilterExtraParams(params: {
  product?: string;
  recordedBy?: string;
  search?: string;
  page?: number;
}): Record<string, string> {
  const extra: Record<string, string> = {};
  if (params.product) extra.product = params.product;
  if (params.recordedBy) extra.recordedBy = params.recordedBy;
  if (params.search) extra.search = params.search;
  if (params.page && params.page > 1) extra.page = String(params.page);
  return extra;
}
