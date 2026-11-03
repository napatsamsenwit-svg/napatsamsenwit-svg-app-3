import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { ogFonts } from "@/lib/og-font";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F6FA",
          color: "#1C244B",
          fontFamily: "Plex Thai",
        }}
      >
        <img src={src} width={760} height={168} alt="" />
        <div style={{ fontSize: 40, lineHeight: 1.5, marginTop: 40, opacity: 0.85 }}>วางแผนธุรกิจ 13 หัวข้อด้วย AI</div>
        <div style={{ fontSize: 28, marginTop: 8, opacity: 0.6 }}>by CSR Consulting Group</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
