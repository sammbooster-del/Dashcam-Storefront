import { resolveWebsiteWithRetry } from "@workspace/api-client-react";

/** Hostname assignment selects the storefront; the shared admin stays at /admin. */
export async function routeAssignedWebsite() {
  if (/^\/(?:admin|sign-in|sign-up)(?:\/|$)/.test(window.location.pathname)) return false;
  const result = await resolveWebsiteWithRetry();
  if (result.websiteType !== "physical-store") return false;
  const path = window.location.pathname.replace(/^\/+/, "");
  window.location.replace(`/shop/${path}${window.location.search}${window.location.hash}`);
  return true;
}
