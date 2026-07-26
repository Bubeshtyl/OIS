export function formatTicketNumberWithSettings(
  seq: number,
  prefix: string,
  paddingWidth: number
): string {
  return `${prefix}-${String(seq).padStart(paddingWidth, "0")}`;
}
