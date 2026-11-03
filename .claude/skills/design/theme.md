# Theme presets

Read this once, when setting up the theme at the start of `build` or when the learner asks to change colours or style. Edit the existing tokens in `src/app/globals.css`; never hard-code colours in components.

## Primary colour

| Colour | `--primary` (light) | `--primary-foreground` | `brand.color` (hex, for icons and link preview) |
|---|---|---|---|
| เขียว | `oklch(0.56 0.14 155)` | `oklch(0.985 0 0)` | `#16a34a` |
| ฟ้า | `oklch(0.55 0.17 255)` | `oklch(0.985 0 0)` | `#2563eb` |
| ชมพู | `oklch(0.62 0.19 5)` | `oklch(0.985 0 0)` | `#db2777` |
| ม่วง | `oklch(0.53 0.2 295)` | `oklch(0.985 0 0)` | `#7c3aed` |

For an "Other" colour, pick an oklch value with lightness 0.5–0.6 and chroma 0.13–0.2, and the closest hex.

Also set `--ring` to the same hue, and `--chart-1..5` to the primary hue plus 2–3 clearly different hues (keep lightness 0.55–0.75) so chart slices are easy to tell apart.

## Style presets

Apply on top of the colour. `<hue>` is the hue of the chosen primary (155, 255, 5, 295).

| Style | What to change |
|---|---|
| มินิมอล สะอาดตา | White background, neutral greys, `--radius: 0.625rem`, thin borders, plenty of white space, one accent colour only. |
| พาสเทล น่ารัก | `--background: oklch(0.985 0.012 <hue>)`; `--secondary`, `--accent`, `--muted` as soft tints `oklch(0.95 0.03 <hue>)`; lighter primary `oklch(0.72 0.12 <hue>)` with **dark** `--primary-foreground: oklch(0.25 0.05 <hue>)` for contrast; `--radius: 1rem`. |
| โหมดมืด เท่ ๆ | Add `dark` to the `<html>` className in `layout.tsx`. In `.dark`, tint background and card slightly (`oklch(0.17 0.015 <hue>)` / `oklch(0.21 0.02 <hue>)`), brighter primary `oklch(0.72 0.15 <hue>)` with dark `--primary-foreground`. Near-white text, not pure white on pure black. |
| สีสด สนุก | Primary chroma +0.03, a coloured hero or summary card (`bg-primary text-primary-foreground`), `--radius: 0.875rem`, icons inside tinted circles. Still one main colour plus one accent: "fun" comes from shapes and contrast, not from many colours. |

After changing the theme, check text contrast on primary buttons and on muted text (at least 4.5:1).
