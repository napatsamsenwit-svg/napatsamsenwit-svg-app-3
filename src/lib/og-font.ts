import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Generated images (icons, link preview) have no Thai glyphs by default, so they
// load the bundled IBM Plex Sans Thai file. Only characters in this font render.
export async function ogFonts() {
  const data = await readFile(join(process.cwd(), "src/assets/fonts/IBMPlexSansThai-SemiBold.ttf"));
  return [{ name: "Plex Thai", data, style: "normal" as const, weight: 600 as const }];
}
