import net from "net";

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    // 0.0.0.0 — khớp cách Next.js bind (tránh báo “trống” khi 3000 đã bị chiếm)
    server.listen(port, "0.0.0.0");
  });
}

/**
 * Chọn port trống đầu tiên từ `start` (mặc định 3000 → 3001 → …).
 * @param {number} [start]
 * @param {number} [maxAttempts]
 */
export async function pickPort(start = 3000, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `Không tìm thấy port trống trong dải ${start}–${start + maxAttempts - 1}`,
  );
}

/**
 * Port đã gán (DEV_PORT / PORT) hoặc tự chọn từ 3000.
 */
export async function resolveDevPort() {
  const fromEnv = process.env.DEV_PORT || process.env.PORT;
  if (fromEnv) {
    const port = Number.parseInt(fromEnv, 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new Error(`Port không hợp lệ: ${fromEnv}`);
    }
    if (!(await isPortFree(port))) {
      throw new Error(`Port ${port} đang bị chiếm — chọn port khác hoặc dừng process đang chạy.`);
    }
    return port;
  }
  return pickPort(3000);
}

/**
 * @param {number} port
 */
export function devUrlForPort(port) {
  return `http://127.0.0.1:${port}`;
}
