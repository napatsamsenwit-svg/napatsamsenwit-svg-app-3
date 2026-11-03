---
name: design
description: Design guidelines for everything the learner sees in their app (theme, app identity and link preview, mobile and desktop layout, empty/loading/skeleton/error states, sample data, charts, Thai type and wording, colour, forms, accessibility, screenshot review). Use whenever you build or change any screen or component, set up the theme, or the learner asks to make it prettier or says it looks wrong (สวยขึ้น, ปรับหน้าตา, เปลี่ยนสี, ดูไม่สวย, ดูรก, ดูแปลก ๆ).
---

# Design guidelines

The learner judges their app by how it looks, first on their laptop, then on their phone, then when they share the link in LINE. Follow these rules on every screen. Apply them silently; never lecture the learner about design.

## 1. Theme and app identity (once, at the start of `build`)

1. Read `theme.md` in this folder and set the theme tokens in `src/app/globals.css` from the plan's style and colour. Components use tokens only (`bg-primary`, `text-muted-foreground`, `border-border`), never raw colours like `bg-blue-500`.
2. Fill in `src/lib/brand.ts` from the plan. Everything else reads it: page title, browser tab icon, home-screen icon (`icon.tsx`, `apple-icon.tsx`, `manifest.ts`) and the link preview image (`opengraph-image.tsx`).
   - `name`: the app name; `shortName`: at most 12 characters for under the phone icon.
   - `description`: one Thai sentence saying what the app does for the user ("จดรายรับรายจ่ายง่าย ๆ เห็นเงินเหลือทันที").
   - `color`: the hex from `theme.md` for the chosen colour.
   - `symbol`: **one** character that fits the app: a Thai consonant (e.g. the first consonant of the name), a Latin letter, a digit, or `฿`. No emoji and no symbols: the icons render with the bundled Thai font only, so anything else comes out blank.
3. Check the images build: `curl -s -o /dev/null -w "%{http_code}" <localUrl>/opengraph-image` and `<localUrl>/icon` return 200.
4. After the first deploy with the real name, tell the learner: ลองส่งลิงก์เว็บในแชท LINE ของตัวเอง จะเห็นรูปพรีวิวพร้อมชื่อแอป และบนมือถือกด "เพิ่มไปยังหน้าจอโฮม" ได้ จะมีไอคอนแอปเหมือนแอปจริง (LINE may show an old preview for a while if the link was shared before.)

## Layout patterns

Before building a page, read `patterns.md` in this folder and use the matching pattern: app shell (header, bottom tabs, top bar or sidebar), page header, dashboard, list, detail, forms, which overlay to use (Dialog, AlertDialog, Sheet, DropdownMenu, toast, banner) and login pages. It includes ready code for the shell and a form dialog using this project's component API.

## 2. Layout on phones (design here first)

- Design at 375px wide first, then widen. Page padding `px-4`; never a horizontal scroll.
- One screen, one job: a clear page title and **one primary action** (default `Button`); everything else is `outline`, `ghost` or a link.
- Put first what the plan says the learner wants to see first.
- 2–4 sections: a bottom tab bar (`fixed inset-x-0 bottom-0`, `md:hidden`, lucide icon + short Thai label, active tab shown with `text-primary` and a tinted background, padding `pb-[env(safe-area-inset-bottom)]`). Add bottom padding to pages (`pb-24 md:pb-0`) so content is not hidden behind it.
- Primary actions within thumb reach: a full-width button at the end of forms, or a floating "+" button bottom-right on list screens (above the tab bar).
- Tap targets at least 44×44px; inputs and buttons `h-11` on phones.
- Tables become stacked cards on phones (one card per row, label + value pairs).

## 3. Layout on desktop

- Limit content width: forms and simple lists `mx-auto w-full max-w-md`; list + summary pages `max-w-3xl`; dashboards `max-w-5xl`. Never stretch text across a wide screen.
- Navigation: the bottom tab bar becomes a top bar (`hidden md:flex`, app name left, sections right). With 5+ sections, a left sidebar (selected item shown with a tinted background and bold text).
- Use the space with responsive grids: summary cards `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`; card lists `sm:grid-cols-2 lg:grid-cols-3`.
- List + detail screens: two columns on `lg` (list left, detail right); on phones the detail is its own page.
- Long forms may use `md:grid-cols-2` for short related fields; one column on phones. Primary button `w-full md:w-auto`, right-aligned on desktop.
- Everything clickable has a hover state and works with the keyboard (Tab order follows the visual order).

## 4. Every state, not just the happy path

Every screen that shows data needs all of these:

- **Empty**, two kinds:
  - Nothing yet: a lucide icon (`size-10 text-muted-foreground`), one friendly Thai sentence, the primary action, and a secondary **"ลองใส่ข้อมูลตัวอย่าง"** button (see section 5). Example: "ยังไม่มีรายการ เริ่มเพิ่มรายการแรกกันเลย".
  - No results (search/filter): "ไม่เจอรายการที่ค้นหา" + a "ล้างตัวกรอง" button.
- **Loading / skeleton**: a `Skeleton` (`npx shadcn@4.22.1 add skeleton`) shaped like the real content (3 summary cards, 5 list rows), never a spinner on an empty page.
  - Data from `localStorage`: keep a `loaded` flag and render skeletons until the first read in `useEffect` finishes, so the empty state does not flash before the data appears.
  - Data from Supabase in Server Components: add `loading.tsx` next to the page, or wrap the slow part in `<Suspense fallback={...}>`.
  - Saving: the button is disabled and says "กำลังบันทึก…" while pending, so nobody taps twice.
- **Error**: what happened and what to do, in plain Thai, with a "ลองใหม่" button. For Server Components add `error.tsx`. Never show raw error text or codes.
- **Success**: a short `toast`, then the new item appears where the user expects it.
- **Lots of data**: group by date or category, or show the latest 10 with "ดูทั้งหมด".
- **Destructive actions**: confirm in a `Dialog` ("ลบรายการนี้ไหม? ย้อนกลับไม่ได้") with the destructive button last.

## 5. Sample data

A freshly built app is empty, so its charts and summaries look like nothing. Every app gets sample data the learner can switch on and off:
- A "ลองใส่ข้อมูลตัวอย่าง" button in the empty state adds 10–15 realistic Thai items that match the plan (real-sounding names, amounts and categories, dates spread over the last 30 days so charts and groups look alive).
- Sample items are marked (e.g. `sample: true`, or a `is_sample` column) and a "ล้างข้อมูลตัวอย่าง" button removes only them, so the learner's real entries are never deleted.
- In the Supabase template, sample rows belong to the logged-in user like any other row.
- After the build, suggest pressing it: "กด 'ลองใส่ข้อมูลตัวอย่าง' จะเห็นหน้าตาตอนมีข้อมูลเยอะ ๆ".

## 6. Charts

- Use shadcn charts (`npx shadcn@4.22.1 add chart`, Recharts) with colours from `--chart-1..5`.
- Pick the chart by the question: share of a whole → donut/pie with at most 5–6 slices (merge the rest into "อื่น ๆ"); change over time → bar chart per day/week/month or a line chart; comparing categories → horizontal bar chart (Thai labels fit better than on vertical bars).
- Always show the key number in text next to or above the chart (total, top category); the chart supports it, it does not replace it.
- Thai labels, `฿` with thousands separators in tooltips and axes, tooltips work on tap.
- Phone-friendly: chart height around 240px, legend below the chart (not beside it), no tiny axis text below 12px.
- Empty chart: show the empty state, not empty axes.

## 7. Thai typography

- The font is IBM Plex Sans Thai (already set). Do not add other fonts.
- Body text at least `text-base` (16px) on phones. Thai needs room for tone marks: never `leading-none`/`leading-tight` on Thai paragraphs, and never letter-spacing (`tracking-*`) on Thai text.
- Hierarchy through size and weight, not colour: page title `text-2xl font-semibold`, section `text-lg font-medium`, body `text-base`, secondary `text-sm text-muted-foreground`. At most 3 sizes per screen.
- Numbers that line up: `tabular-nums`. Big summary numbers `text-3xl font-semibold tabular-nums`.
- Money: `฿` + `toLocaleString("th-TH")`, decimals only when there are satang. Dates: `toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })`.

## 8. Wording in the app (Thai microcopy)

- Buttons say what happens, as a verb: "บันทึกรายการ", "เพิ่มเพื่อน", "ลบรายการ". Never "ตกลง", "Submit", "OK" on an action button. Cancel is "ยกเลิก".
- One word per thing across the whole app: pick "รายการ" or "ธุรกรรม", "หมวดหมู่" or "ประเภท", and use it everywhere (titles, buttons, empty states, toasts).
- Everyday Thai over tech words: "บันทึก" not "เซฟข้อมูล", "เข้าสู่ระบบ" not "Login", "ลองใหม่" not "Retry". Keep English only where Thai users normally say it (อีเมล, รหัสผ่าน).
- Error messages say how to fix it: "กรอกจำนวนเงินมากกว่า 0" not "ข้อมูลไม่ถูกต้อง"; "ไม่มีอินเทอร์เน็ต ลองใหม่อีกครั้ง" not "Network error". Never blame the user, never "ระบบผิดพลาด" alone.
- Short and friendly, no ครับ/ค่ะ in UI text, no exclamation marks everywhere. Titles are nouns ("รายการทั้งหมด"), empty states invite action ("เริ่มเพิ่มรายการแรกกันเลย").
- Placeholders show an example of the expected input ("เช่น ข้าวมันไก่"), not instructions.

## 9. Colour and meaning

- Text contrast at least 4.5:1 (WCAG AA). Muted text only for secondary info.
- Fixed meanings: income/positive green (`text-emerald-600`, dark mode `text-emerald-400`); expense/negative/danger `text-destructive`. Never use red for decoration.
- Never rely on colour alone: add +/−, an icon or a word.
- Never mark a selected or active item with a left border or a left accent bar. Use a background tint (`bg-accent`), bold text, an icon or a dot.
- No large gradients, no shadows on everything (`shadow-sm` on cards is enough), no emoji in the UI.

## 10. Components, icons, spacing

- Only shadcn/ui components from `src/components/ui/` (add more with `npx shadcn@4.22.1 add <name>`); no hand-made buttons, inputs, dialogs or selects.
- Icons from `lucide-react` only, consistent sizes: `size-4` inline with text, `size-5` in buttons and nav, `size-10` in empty states. Icon-only buttons need a Thai `aria-label`.
- Spacing from Tailwind's scale only: `gap-2` inside controls, `gap-4` between related items, `gap-6`/`gap-8` between sections. No arbitrary values like `mt-[13px]`.
- Group related things in a `Card`; never a card inside a card.

## 11. Forms

- Every input has a visible Thai `Label`; placeholders are examples, not labels.
- The right phone keyboard: money `inputMode="decimal"`, counts `inputMode="numeric"`, email `type="email"`, dates `type="date"`.
- Validate on submit, show the message under the field, keep what the user typed, focus the first wrong field.

## 12. Motion and accessibility

- Motion small and quick (150–200ms `transition-colors`/`transition-opacity`), no bouncing; respect `motion-reduce`.
- One `h1` per page, headings in order. Buttons are `<button>`, links are `Link`. Images have Thai `alt` text. Focus is visible (shadcn components already handle it).

## 13. Before you say "done": check, then look through the learner's eyes

You cannot see the screen. First check the code against this list:
- 375px: no horizontal scroll, nothing cut off, bottom nav does not cover content, tap targets 44px.
- 1280px: content width limited, navigation at the top (or sidebar), grids use the space.
- Empty (both kinds), loading skeleton, error and success states exist; sample data button works.
- One primary action per screen; at most 3 text sizes; spacing from the scale; consistent words.
- Colours from tokens; contrast fine; no left-border selection markers; `brand.ts` filled in.

Then **ask for a screenshot** whenever it matters: after the build is finished, after a big visual change, and every time the learner says something looks wrong (ดูแปลก ๆ, ไม่สวย, เพี้ยน, ล้น). Say: "ช่วยแคปหน้าจอแล้ววางในแชทให้ดูหน่อย (Mac กด ⌘+Shift+4 แล้วลากคลุม / Windows กด Win+Shift+S) ถ้าได้ทั้งตอนจอคอมและตอนย่อหน้าต่างให้แคบแบบมือถือจะดีมาก". Then look at the image against this list, fix what you see, and say in one line what you fixed. If the learner would rather not, carry on without it.
