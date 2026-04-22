import fs from "node:fs";
import path from "node:path";
import { swaggerDocument } from "./swagger";

// Written one directory up (packages/swagger/swagger.json) so the npm-script
// `generate:types:*` commands see it at `./swagger.json` when run from this
// package's root.
const swaggerPath = path.join(__dirname, "..", "swagger.json");

fs.writeFileSync(swaggerPath, JSON.stringify(swaggerDocument, null, 2));

console.log(`✓ swagger.json written to ${swaggerPath}`);
