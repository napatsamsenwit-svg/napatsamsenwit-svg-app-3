import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { ogFonts } from "@/lib/og-font";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
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
          fontSize: 300,
          borderRadius: 112,
        }}
      >
        {brand.symbol}
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
