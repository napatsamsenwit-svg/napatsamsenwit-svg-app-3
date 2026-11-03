import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { ogFonts } from "@/lib/og-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.color,
          color: "white",
          fontFamily: "Plex Thai",
          fontSize: 110,
        }}
      >
        {brand.symbol}
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
