import { resolveWebsite } from "./generated/api";
import type { WebsiteResolution } from "./generated/api.schemas";
import { ApiError } from "./custom-fetch";

/** A server restart must not leave an otherwise valid storefront permanently blocked. */
export async function resolveWebsiteWithRetry({
  attempts = 6,
  delayMs = 750,
  timeoutMs = 5000,
}: { attempts?: number; delayMs?: number; timeoutMs?: number } = {}): Promise<WebsiteResolution> {
  let lastError: unknown = new Error("Website routing is unavailable.");
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await resolveWebsite({ signal: controller.signal, cache: "no-store" });
      if (
        typeof result.configured !== "boolean" ||
        !["existing", "physical-store"].includes(result.websiteType)
      ) {
        throw new Error("The website routing response is invalid.");
      }
      return result;
    } catch (error) {
      lastError = error;
      // Do not retry permission/input failures or fall back to the wrong website.
      if (error instanceof ApiError && error.status < 500 && ![404, 408, 429].includes(error.status)) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
    if (attempt + 1 < attempts) {
      await new Promise(resolve => setTimeout(resolve, Math.min(delayMs * 2 ** attempt, 3000)));
    }
  }
  throw lastError;
}
