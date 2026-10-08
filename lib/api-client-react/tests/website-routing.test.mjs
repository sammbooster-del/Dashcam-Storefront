// Run from the workspace root: node lib/api-client-react/tests/website-routing.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Reuse the workspace's existing build tool without adding a test dependency.
const require = createRequire(new URL("../../../artifacts/api-server/package.json", import.meta.url));
const { build } = require("esbuild");
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/website-routing.ts", import.meta.url))],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  banner: { js: `import { createRequire } from "node:module"; const require = createRequire(${JSON.stringify(fileURLToPath(new URL("../../../artifacts/api-server/package.json", import.meta.url)))});` },
});
const { resolveWebsiteWithRetry } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const realFetch = globalThis.fetch;
const assignment = { configured: true, websiteType: "physical-store", previewPath: "/shop/" };
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json" },
});
const fast = { delayMs: 1, timeoutMs: 50 };

try {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/website-resolution");
    assert.equal(options.cache, "no-store");
    calls++;
    if (calls === 1) throw new TypeError("Network disconnected");
    if (calls === 2) return json({ error: "Restarting" }, 503);
    return json(assignment);
  };
  assert.deepEqual(await resolveWebsiteWithRetry(fast), assignment);
  assert.equal(calls, 3, "Transient network/server failures must recover");

  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ error: "Unauthorized" }, 401);
  };
  await assert.rejects(resolveWebsiteWithRetry(fast), error => error.status === 401);
  assert.equal(calls, 1, "Permission failures must not be retried or bypassed");

  calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    if (calls === 1) return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError")), { once: true });
    });
    return json(assignment);
  };
  assert.deepEqual(await resolveWebsiteWithRetry({ ...fast, timeoutMs: 5 }), assignment);
  assert.equal(calls, 2, "A hung request must time out and recover");

  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json(calls === 1 ? { configured: true, websiteType: "unknown" } : assignment);
  };
  assert.deepEqual(await resolveWebsiteWithRetry(fast), assignment);
  assert.equal(calls, 2, "Invalid routing responses must never select a default store");

  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ error: "Unavailable" }, 503);
  };
  await assert.rejects(resolveWebsiteWithRetry({ ...fast, attempts: 2 }), error => error.status === 503);
  assert.equal(calls, 2, "Retries must be bounded");

  let signal;
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return json(assignment);
  };
  await resolveWebsiteWithRetry({ ...fast, timeoutMs: 5 });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(signal.aborted, false, "Successful requests must clear their timeout");
  console.log("PASS: startup recovery, request timeout, permission protection, response validation, bounded retries and timer cleanup.");
} finally {
  globalThis.fetch = realFetch;
}
