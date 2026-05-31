#!/usr/bin/env node
/**
 * Chuyển test_data_inday/*.js → public/data/inday/*.json (phục vụ fetch offline trên web).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readIndayJs(relativePath) {
  const filePath = path.join(root, relativePath);
  const content = fs.readFileSync(filePath, "utf8");
  const fn = new Function(`${content}\nreturn data;`);
  const rows = fn();
  if (!Array.isArray(rows)) {
    throw new Error(`${relativePath}: expected data array`);
  }
  return rows;
}

const pairs = [
  ["test_data_inday/hose_data.js", "public/data/inday/hose.json"],
  ["test_data_inday/vn30_data.js", "public/data/inday/vn30.json"],
];

for (const [src, dest] of pairs) {
  const rows = readIndayJs(src);
  const outDir = path.dirname(path.join(root, dest));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(root, dest), JSON.stringify(rows));
  console.log(`✓ ${src} → ${dest} (${rows.length} rows)`);
}
