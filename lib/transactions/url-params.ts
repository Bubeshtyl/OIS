export function buildFilterExtraParams(params: {
  recordedBy?: string;
}): Record<string, string> {
  const extra: Record<string, string> = {};
  if (params.recordedBy) extra.recordedBy = params.recordedBy;
  return extra;
}
