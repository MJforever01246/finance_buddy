import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export { root };

export function prependCargoPath() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const cargoBin = path.join(home, ".cargo", "bin");
  const cargoExe =
    process.platform === "win32"
      ? path.join(cargoBin, "cargo.exe")
      : path.join(cargoBin, "cargo");

  if (home && fs.existsSync(cargoExe)) {
    process.env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH}`;
  }
}

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [extraEnv]
 */
export function runTauri(args, extraEnv = {}) {
  prependCargoPath();

  const binDir = path.join(root, "node_modules", ".bin");
  const tauriBin =
    process.platform === "win32"
      ? path.join(binDir, "tauri.cmd")
      : path.join(binDir, "tauri");

  const r = spawnSync(tauriBin, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });

  process.exit(r.status ?? 1);
}
