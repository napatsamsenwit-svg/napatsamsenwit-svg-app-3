import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // รันบนเซิร์ฟเวอร์ของเราเอง (Docker): ตั้ง BUILD_STANDALONE=1 ตอน build ส่วนบน Vercel ไม่ต้องตั้ง
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
