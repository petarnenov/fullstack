#!/usr/bin/env node
/**
 * Refresh packages/mfe-reporting/openapi-bff.json from a running BFF if it's
 * up; otherwise leave the committed snapshot alone. This keeps
 * `npm run generate:types` working offline — the snapshot is the contract
 * that's checked into git, the refresh is an optional sync step.
 *
 * Unlike @amp/swagger where the TS SoT generates the JSON deterministically,
 * here springdoc-openapi produces the spec from runtime reflection, so this
 * helper is the equivalent "pull the spec from its source" step.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BFF_URL = "http://localhost:8090/v3/api-docs";
const TIMEOUT_MS = 2000;
const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "..", "openapi-bff.json");

const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

try {
  const res = await fetch(BFF_URL, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const spec = await res.json();
  await writeFile(outFile, JSON.stringify(spec, null, 2) + "\n");
  console.log(`[refresh-openapi] refreshed from ${BFF_URL}`);
} catch (err) {
  clearTimeout(t);
  console.log(
    `[refresh-openapi] BFF not reachable (${err.message ?? err}); using committed snapshot at openapi-bff.json`,
  );
}
