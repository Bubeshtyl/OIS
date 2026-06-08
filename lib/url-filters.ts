export function applyUrlFilterUpdates(
  params: URLSearchParams,
  updates: Record<string, string | undefined>,
  options?: { resetPage?: boolean }
) {
  if (options?.resetPage) {
    params.delete("page");
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }
}
