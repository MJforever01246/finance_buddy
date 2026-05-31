/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export chỉ khi build Tauri; tránh lỗi bootstrap script trong dev
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
