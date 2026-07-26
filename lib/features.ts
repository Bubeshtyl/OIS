/**
 * Feature flags — env-gated so experimental UI can be turned off or removed cleanly.
 * Unset or any value other than "true" means off.
 */
export function isRbacAccessUiEnabled() {
  return process.env.FEATURE_RBAC_ACCESS_UI === "true";
}
