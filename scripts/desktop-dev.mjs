/**
 * Desktop dev: chọn port trống, ghi devUrl cho Tauri, rồi `tauri dev`.
 */
import fs from "fs";
import path from "path";
import { devUrlForPort, resolveDevPort } from "./lib/pick-port.mjs";
import { root, runTauri } from "./lib/tauri-env.mjs";

const overlayPath = path.join(root, "src-tauri", "tauri.dev.conf.json");
const portFile = path.join(root, ".dev-port");

async function main() {
  const port = await resolveDevPort();
  const devUrl = devUrlForPort(port);

  fs.writeFileSync(portFile, `${port}\n`, "utf8");
  fs.writeFileSync(
    overlayPath,
    `${JSON.stringify({ build: { devUrl } }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\n[desktop:dev] Port trống: ${port}`);
  console.log(`[desktop:dev] Next dev  → ${devUrl.replace("127.0.0.1", "localhost")}`);
  console.log(`[desktop:dev] Tauri URL → ${devUrl}\n`);

  runTauri(["dev", "-c", overlayPath], {
    DEV_PORT: String(port),
    PORT: String(port),
    TAURI_DEV: "1",
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
