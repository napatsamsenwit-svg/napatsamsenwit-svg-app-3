# Layout patterns

Read this when you build the app or add a new page. Pick the pattern that matches the screen; do not invent a new layout when one of these fits.

**Component API note:** this project's shadcn/ui is the Base UI flavour. Compose a trigger with another component through the `render` prop and put the label as children, e.g. `<DialogTrigger render={<Button />}>เพิ่มรายการ</DialogTrigger>`. There is no `asChild`. When unsure, open the component file in `src/components/ui/` and follow its props.

## 1. App shell

Every app with 2+ sections has one shell, built once and shared by all pages.

- Put it in `src/components/app-shell.tsx` and use it from a route-group layout, `src/app/(app)/layout.tsx`, so pages that must stay bare (`/login`) are outside it.
- One `navItems` array (href, Thai label, lucide icon) feeds every navigation variant, so they never drift apart.
- **Phone (< md):** a top header (`h-14`, page or app name, at most one icon action on the right), the page content, and a bottom tab bar with the nav items (2–5). Content gets `pb-24` so the tab bar never covers it.
- **Desktop (md+):** a top bar (`h-16`, app name left, nav links right, primary account/action at the far right). With 5+ sections use a left sidebar instead (`w-60`, fixed, content shifted with `md:pl-60`).
- **Active item:** `usePathname()` match; show it with `bg-accent text-accent-foreground font-medium` (and `text-primary` on the icon in the tab bar). Never a left border or left bar.
- Header and tab bar use `bg-background/95 backdrop-blur border-b` (top) or `border-t` (bottom), not heavy shadows.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

const navItems = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/items", label: "รายการ", icon: List },
  { href: "/summary", label: "สรุป", icon: PieChart },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 md:h-16">
          <Link href="/" className="text-lg font-semibold">{brand.name}</Link>
          <nav className="ml-auto hidden gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  isActive(item.href) && "bg-accent font-medium text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                isActive(href) && "font-medium text-primary",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

## 2. Page header

Top of every page inside the shell:

- `h1` title (`text-2xl font-semibold`), optional one-line description (`text-sm text-muted-foreground`).
- The page's primary action sits on the right on desktop (`hidden md:inline-flex`) and becomes a floating button on phones (`fixed right-4 bottom-20 md:hidden`, `size-14 rounded-full shadow-lg`, icon + `aria-label`), above the tab bar.
- Secondary actions go in a `DropdownMenu` behind a "⋯" icon button, not as a row of buttons.

## 3. Dashboard / home summary

Order from most to least important, top to bottom:

1. **Context row:** greeting or page title + period switch (`Tabs`: วันนี้ / เดือนนี้ / ทั้งหมด, or a month `Select`).
2. **KPI cards:** 2–4 numbers that answer "how am I doing?". Grid `grid-cols-2 gap-3 lg:grid-cols-4`. Each card: small label (`text-sm text-muted-foreground`), big number (`text-2xl md:text-3xl font-semibold tabular-nums`), optional change vs last period (+/− with colour and icon). No more than 4: extra numbers belong on a detail page.
3. **Main chart + side list:** on desktop `grid gap-4 lg:grid-cols-3`, the chart card spans `lg:col-span-2` and a "top categories" or "goals" card takes the third column; on phones they stack.
4. **Recent items:** the latest 5 in a card with a "ดูทั้งหมด" link to the list page.

Loading: the same grid filled with `Skeleton` blocks of the same sizes. Empty: one empty-state card in place of sections 2–4, with the primary action and the sample-data button.

## 4. List page

- Page header, then a toolbar: search `Input` (with a search icon) and one filter (`Select` or `Tabs`). On phones the toolbar is one row, filter as an icon button opening a `Sheet` when there are several filters.
- Group rows under small date or category headings (`text-sm font-medium text-muted-foreground`).
- **Row anatomy:** leading icon in a tinted circle (`size-10 rounded-full bg-muted`), title + meta line in the middle (`min-w-0 flex-1`, title `truncate`), value on the right (`tabular-nums`, colour by meaning), then a "⋯" `DropdownMenu` for edit/delete. The whole row is tappable for the main action (open detail or edit). Rows are at least 56px high.
- On desktop, a list with many columns may become a `Table`; on phones it stays rows.

## 5. Detail page

- Back link at the top (`ChevronLeft` + parent page name), title, key facts as label/value pairs in a card, related items below.
- Edit is the primary action; delete lives in the "⋯" menu or at the bottom as a `variant="ghost"` destructive text button, always behind a confirmation.

## 6. Forms: overlay or page?

- **≤ 5 fields, one step** (add/edit an item): open in a `Dialog` on desktop; on phones use a bottom `Sheet` (`npx shadcn@4.22.1 add sheet`, `side="bottom"`) so the keyboard and thumb reach work. Or use the Sheet everywhere for the simplest code.
- **> 5 fields, multi-step, or something people want to link to:** its own page (`/items/new`, `/items/[id]/edit`) with the form in a `Card` (`max-w-md`), primary button at the end.
- **Settings:** its own page, grouped into cards with a heading each; toggles (`Switch`) save immediately with a toast, text fields save with a button per card.

## 7. Overlays: which one when

| Need | Use | Not |
|---|---|---|
| Quick focused task, then back to the same page (add/edit with few fields) | `Dialog` (desktop) / bottom `Sheet` (phone) | a new page |
| Confirm something destructive or irreversible (delete, discard changes) | `AlertDialog` (`npx shadcn@4.22.1 add alert-dialog`) | `Dialog`, `confirm()` |
| Longer form, filters, or details while keeping the list visible | `Sheet` (right on desktop, bottom on phone) | stacked dialogs |
| A few choices attached to one element (row actions, sort) | `DropdownMenu` / `Popover` | a dialog |
| Result of an action ("บันทึกแล้ว", "ลบแล้ว") | `toast` (with "เลิกทำ" for deletes when easy) | a dialog to click away |
| Status that stays (offline, not connected yet, limit reached) | inline alert/banner at the top of the content | a toast that disappears |
| Anything with its own URL, long content, or worth sharing | a page | an overlay |

Rules for every overlay:
- Never open one on page load, never stack two, never put a whole page inside one.
- Title says the task ("เพิ่มรายการ", "ลบรายการนี้ไหม?"); for confirmations the description says the consequence ("ลบแล้วกู้คืนไม่ได้").
- Footer: cancel ("ยกเลิก", `variant="outline"`) then the main action, which names the action ("บันทึก", "ลบรายการ"; destructive style for deletes). On phones the buttons stack full width.
- Focus goes to the first field; Enter submits; Esc and the backdrop close it, except while saving.
- On success: close, toast, and show the change in the page behind. On error: stay open, keep the input, show the message under the field.
- Long content scrolls inside (`max-h-[85vh] overflow-y-auto`), the footer stays visible.

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddItemDialog({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return setError("กรอกชื่อรายการก่อนนะ");
    onAdd(name);
    setOpen(false);
    toast.success("เพิ่มรายการแล้ว");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(""); }}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        เพิ่มรายการ
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>เพิ่มรายการ</DialogTitle>
            <DialogDescription>ใส่ชื่อรายการที่อยากจด</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="name">ชื่อรายการ</Label>
            <Input id="name" name="name" placeholder="เช่น ข้าวมันไก่" autoFocus aria-invalid={!!error} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>ยกเลิก</DialogClose>
            <Button type="submit">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## 8. Login pages

Outside the shell: a centred card (`max-w-sm`) on a muted background, app name and symbol above the card, one form, the switch between log-in and sign-up as a text link under the button. After login, land on the dashboard.
