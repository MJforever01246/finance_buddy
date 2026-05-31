/**
 * Khởi chạy Next.js dev trên port đã chọn (DEV_PORT / PORT) hoặc port trống từ 3000.
 * Dùng cho `npm run dev` và Tauri `beforeDevCommand`.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { devUrlForPort, resolveDevPort } from "./lib/pick-port.mjs";
import { root } from "./lib/tauri-env.mjs";

const portFile = path.join(root, ".dev-port");

async function main() {
  const port = await resolveDevPort();
  const devUrl = devUrlForPort(port);

  process.env.DEV_PORT = String(port);
  process.env.PORT = String(port);

  fs.writeFileSync(portFile, `${port}\n`, "utf8");

  if (process.env.TAURI_DEV !== "1") {
    console.log(`\n  ▲ Next.js dev`);
    console.log(`  - Local: ${devUrl.replace("127.0.0.1", "localhost")}\n`);
  } else {
    console.log(`[next-dev] ${devUrl}`);
  }

  const nextBin =
    process.platform === "win32"
      ? path.join(root, "node_modules", ".bin", "next.cmd")
      : path.join(root, "node_modules", ".bin", "next");

  const r = spawnSync(nextBin, ["dev", "-p", String(port)], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  process.exit(r.status ?? 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
