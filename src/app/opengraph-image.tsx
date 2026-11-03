import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { ogFonts } from "@/lib/og-font";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: brand.color,
          color: "white",
          fontFamily: "Plex Thai",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            marginBottom: 48,
          }}
        >
          {brand.symbol}
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.3 }}>{brand.name}</div>
        <div style={{ fontSize: 40, lineHeight: 1.5, opacity: 0.85, marginTop: 16 }}>{brand.description}</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
