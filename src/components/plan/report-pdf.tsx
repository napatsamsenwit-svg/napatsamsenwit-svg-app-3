"use client";

import type { CSSProperties, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Col, Field } from "@/lib/form-schema";
import { asList, asRows, asText, type Row } from "@/lib/form-logic";
import type { ExportImages, ExportItem } from "@/lib/export-xlsx";
import { actKey, deptGrades, gradeOf, kpiRows } from "@/lib/kpi";
import { STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";
import { loadFonts } from "./canvas-exports";

/*
 * รีพอร์ต PDF แบบรายงานประจำปี (แนวเดียวกับแบบ 56-1 One Report ของตลาดหลักทรัพย์):
 * ปก → สารบัญแบ่งเป็น "ส่วนที่" → หน้าคั่นส่วน → หัวข้อ (แถบสี + เลขข้อย่อย + ตารางมีเส้น)
 * หัวข้อที่เป็นรูป (ก้างปลา, BMC, โครงสร้างองค์กร) ใช้ภาพที่วาดจากข้อมูล หัวข้อที่เป็นตารางใช้ตารางจริง
 */

type Orient = "p" | "l";
const DIM: Record<Orient, { w: number; h: number }> = {
  p: { w: 794, h: 1123 },
  l: { w: 1123, h: 794 },
};
const PX = 56;
const HEAD = 54;
const FOOT = 46;
const TOP_PAD = 18;
const cw = (o: Orient) => DIM[o].w - PX * 2;
const ch = (o: Orient) => DIM[o].h - HEAD - FOOT - TOP_PAD;

const NAVY = "#1C244B";
// สีตาม CI ของ CSR Consulting Group: น้ำเงินเข้ม + เหลือง
const GOLD = "#F5E51E";
const INK = "#1D2140";
const GRAY = "#5A6285";
const LINE = "#C9CDE0";
const NAVY_MID = "#2B3A82";
const YELLOW_SOFT = "#FDF8C9";

type Part = {
  no: number;
  title: string;
  en: string;
  desc: string;
  main: string;
  light: string;
  ids: string[];
};
const PARTS: Part[] = [
  {
    no: 1,
    title: "ข้อมูลองค์กรและทิศทางธุรกิจ",
    en: "Company & Business Direction",
    desc: "ข้อมูลบริษัท วิสัยทัศน์ พันธกิจ เป้าหมาย และกลยุทธ์",
    main: NAVY,
    light: "#E8EBF6",
    ids: ["company", "vision", "mission", "goals", "strategy"],
  },
  {
    no: 2,
    title: "การวิเคราะห์และโมเดลธุรกิจ",
    en: "Analysis & Business Model",
    desc: "SWOT แผนผังก้างปลา และ Business Model Canvas",
    main: NAVY_MID,
    light: YELLOW_SOFT,
    ids: ["swot", "fishbone", "bmc"],
  },
  {
    no: 3,
    title: "โครงสร้างองค์กรและบุคลากร",
    en: "Organization & People",
    desc: "โครงสร้างองค์กร บทบาท KPI สมรรถนะ และแผนพัฒนารายบุคคล",
    main: NAVY,
    light: "#E8EBF6",
    ids: ["org", "roles", "kpis", "competency", "idp"],
  },
];
const partOf = (id: string) => PARTS.find((p) => p.ids.includes(id)) as Part;

/** หัวข้อที่ใช้หน้ากระดาษแนวนอน: ตารางกว้าง และหัวข้อที่เป็นรูปแผนผัง */
const LANDSCAPE = new Set([
  "fishbone",
  "bmc",
  "org",
  "kpis",
  "competency",
  "idp",
]);

const STATUS_STYLE: Record<SectionStatus, { bg: string; fg: string }> = {
  empty: { bg: "#ECEDF3", fg: "#5A6285" },
  filling: { bg: "#FBF5C8", fg: NAVY },
  review: { bg: GOLD, fg: NAVY },
  approved: { bg: "#DDF2E6", fg: "#176C42" },
  returned: { bg: "#FDE7D3", fg: "#9A4A0E" },
};

type Blk = { id: string; node: ReactNode; keepNext?: boolean; table?: string };
type Page = {
  kind: "cover" | "toc" | "divider" | "content";
  o: Orient;
  blocks: Blk[];
  section?: number;
  part?: Part;
};

/* ---------- ลวดลายตกแต่ง (แท่งเฉียงหลากสี คล้ายโลโก้ในรายงานตัวอย่าง) ---------- */

const BAR_COLORS = [GOLD, NAVY, NAVY_MID, GOLD, "#4A5AA8", "#C9CDE0"];
const BAR_H = [150, 230, 110, 260, 180, 90, 210, 130];

function Bars({
  w,
  h,
  flip,
  opacity = 1,
  mono,
}: {
  w: number;
  h: number;
  flip?: boolean;
  opacity?: number;
  mono?: string;
}) {
  const n = Math.floor(w / 38);
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block", opacity }}
    >
      {Array.from({ length: n }).map((_, i) => {
        const x = 6 + i * 38;
        const bh = Math.min(h - 20, BAR_H[i % BAR_H.length]);
        const y0 = flip ? h - bh - 20 : 10;
        return (
          <polygon
            key={i}
            points={`${x},${y0 + 16} ${x + 28},${y0} ${x + 28},${y0 + bh} ${x},${y0 + bh + 16}`}
            fill={mono ?? BAR_COLORS[i % BAR_COLORS.length]}
            opacity={mono ? 0.18 + (i % 3) * 0.1 : 1}
          />
        );
      })}
    </svg>
  );
}

/* ---------- ชิ้นส่วนหน้าตา ---------- */

function Chip({ status, onDark }: { status: SectionStatus; onDark?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      style={{
        background: onDark ? "#fff" : s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 12px",
        borderRadius: 999,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_TEXT[status]}
    </span>
  );
}

function Banner({ item, part }: { item: ExportItem; part: Part }) {
  const s = item.section;
  return (
    <div style={{ paddingBottom: 16 }}>
      <div
        style={{
          background: part.main,
          color: "#fff",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 16px",
          borderLeft: `10px solid ${GOLD}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.5 }}>
            {s.no}. {s.th}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5 }}>
            {s.en}
          </div>
        </div>
        <Chip status={item.status} onDark />
      </div>
      <div
        style={{
          fontSize: 12,
          color: GRAY,
          lineHeight: 1.7,
          marginTop: 8,
          fontStyle: "italic",
        }}
      >
        {s.desc}
      </div>
    </div>
  );
}

function SubHead({
  no,
  label,
  part,
}: {
  no: string;
  label: string;
  part: Part;
}) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: part.main,
        lineHeight: 1.6,
        padding: "4px 0 6px",
        display: "flex",
        gap: 8,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          background: GOLD,
          color: NAVY,
          fontSize: 12,
          padding: "0 8px",
          borderRadius: 4,
          lineHeight: 1.7,
        }}
      >
        {no}
      </span>
      <span>{label}</span>
    </div>
  );
}

const cell: CSSProperties = {
  padding: "6px 9px",
  minWidth: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  lineHeight: 1.65,
};
const Empty = () => <span style={{ color: "#9AA0BB" }}>—</span>;

/** ตารางข้อมูลแบบสองคอลัมน์: หัวข้อ | ข้อมูล (ช่องกรอกทีละข้อ) */
function KvRow({
  no,
  label,
  value,
  part,
  first,
}: {
  no: string;
  label: string;
  value: string;
  part: Part;
  first: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,32fr) minmax(0,68fr)",
        fontSize: 12.5,
        color: INK,
        border: `1px solid ${LINE}`,
        borderTop: first ? `1px solid ${LINE}` : 0,
      }}
    >
      <div
        style={{
          ...cell,
          background: part.light,
          fontWeight: 600,
          borderRight: `1px solid ${LINE}`,
          color: part.main,
        }}
      >
        {no} {label}
      </div>
      <div style={cell}>{value.trim() ? value : <Empty />}</div>
    </div>
  );
}

const weightOf = (c: Col) => Math.max(1, Math.round((c.w ?? 140) / 50));
const tpl = (cols: Col[]) =>
  `38px ${cols.map((c) => `minmax(0,${weightOf(c)}fr)`).join(" ")}`;

function THead({
  cols,
  part,
  small,
}: {
  cols: Col[];
  part: Part;
  small?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: tpl(cols),
        background: part.main,
        color: "#fff",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        border: `1px solid ${part.main}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          ...cell,
          padding: "7px 4px",
          borderRight: "1px solid rgba(255,255,255,.35)",
        }}
      >
        ลำดับ
      </div>
      {cols.map((c, i) => (
        <div
          key={c.k}
          style={{
            ...cell,
            padding: "7px 6px",
            borderRight:
              i < cols.length - 1 ? "1px solid rgba(255,255,255,.35)" : 0,
          }}
        >
          {c.label}
        </div>
      ))}
    </div>
  );
}

function TRow({
  cols,
  row,
  n,
  part,
  small,
}: {
  cols: Col[];
  row: Row;
  n: number;
  part: Part;
  small?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: tpl(cols),
        background: n % 2 ? "#fff" : part.light,
        fontSize: small ? 11 : 12,
        color: INK,
        border: `1px solid ${LINE}`,
        borderTop: 0,
      }}
    >
      <div
        style={{
          ...cell,
          padding: "6px 4px",
          textAlign: "center",
          color: GRAY,
          borderRight: `1px solid ${LINE}`,
        }}
      >
        {n}
      </div>
      {cols.map((c, i) => (
        <div
          key={c.k}
          style={{
            ...cell,
            padding: "6px 7px",
            borderRight: i < cols.length - 1 ? `1px solid ${LINE}` : 0,
            textAlign:
              c.type === "number" || c.k.length <= 2 ? "center" : "left",
          }}
        >
          {(row[c.k] ?? "").trim() || <Empty />}
        </div>
      ))}
    </div>
  );
}

function fit(w: number, h: number, maxW: number, maxH: number) {
  const k = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

function Figure({
  no,
  title,
  src,
  nat,
  o,
}: {
  no: number;
  title: string;
  src: string;
  nat: { w: number; h: number };
  o: Orient;
}) {
  const size = fit(nat.w, nat.h, cw(o) - 14, ch(o) - 90);
  return (
    <div style={{ paddingBottom: 14 }}>
      <div
        style={{
          border: `1px solid ${LINE}`,
          borderRadius: 6,
          padding: 6,
          display: "flex",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          width={size.w}
          height={size.h}
          style={{ display: "block", width: size.w, height: size.h }}
        />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: GRAY,
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        รูปที่ {no} {title}
      </div>
    </div>
  );
}

const Note = ({ text }: { text: string }) => (
  <div
    style={{
      border: `1px dashed ${LINE}`,
      borderRadius: 6,
      padding: "14px 12px",
      textAlign: "center",
      fontSize: 12.5,
      color: GRAY,
      marginBottom: 12,
    }}
  >
    {text}
  </div>
);

/* ---------- แปลงข้อมูลแต่ละหัวข้อเป็นบล็อก ---------- */

type Ctx = {
  heads: Map<string, ReactNode>;
  sizes: Map<string, { w: number; h: number }>;
  images: ExportImages;
  fig: { n: number };
};

const IMAGE_TITLE: Record<string, string> = {
  fishbone: "แผนผังก้างปลา (Fishbone Diagram)",
  bmc: "Business Model Canvas",
  org: "โครงสร้างองค์กร (Organization Chart)",
};

function sectionBlocks(item: ExportItem, ctx: Ctx): Blk[] {
  const { section, data } = item;
  const id = section.id;
  const part = partOf(id);
  const o: Orient = LANDSCAPE.has(id) ? "l" : "p";
  const small = o === "l" && id !== "bmc" && id !== "org" && id !== "fishbone";
  const out: Blk[] = [
    {
      id: `${id}:banner`,
      node: <Banner item={item} part={part} />,
      keepNext: true,
    },
  ];

  const img =
    id === "fishbone"
      ? ctx.images.fishbone
      : id === "bmc"
        ? ctx.images.bmc
        : id === "org"
          ? ctx.images.org
          : null;
  const nat = ctx.sizes.get(id);
  const pushImage = () => {
    if (img && nat) {
      out.push({
        id: `${id}:image`,
        node: (
          <Figure
            no={ctx.fig.n++}
            title={IMAGE_TITLE[id]}
            src={img}
            nat={nat}
            o={o}
          />
        ),
      });
    } else if (IMAGE_TITLE[id]) {
      out.push({
        id: `${id}:noimage`,
        node: <Note text={`ยังไม่มีข้อมูลสำหรับสร้าง${IMAGE_TITLE[id]}`} />,
      });
    }
  };

  const addTable = (
    key: string,
    no: string,
    label: string,
    cols: Col[],
    rows: Row[],
  ) => {
    out.push({
      id: `${key}:sub`,
      node: <SubHead no={no} label={label} part={part} />,
      keepNext: true,
    });
    ctx.heads.set(key, <THead cols={cols} part={part} small={small} />);
    out.push({
      id: `${key}:h`,
      node: <THead cols={cols} part={part} small={small} />,
      keepNext: true,
      table: key,
    });
    if (!rows.length) {
      out.push({
        id: `${key}:empty`,
        table: key,
        node: <TRow cols={cols} row={{}} n={1} part={part} small={small} />,
      });
      return;
    }
    rows.forEach((r, i) =>
      out.push({
        id: `${key}:r${i}`,
        table: key,
        node: <TRow cols={cols} row={r} n={i + 1} part={part} small={small} />,
      }),
    );
  };

  if (id === "bmc") {
    pushImage();
    return out;
  }
  if (id === "org") pushImage();

  let k = 0;
  let prevKv = false;
  section.fields.forEach((f: Field) => {
    if (f.type === "cmpEdits") return;
    k++;
    const no = `${section.no}.${k}`;
    const key = `${id}:${f.k}`;
    const v = data[f.k];
    if (f.type === "list") {
      const items = asList(v)
        .map((x) => x.trim())
        .filter(Boolean);
      const cols: Col[] = [{ k: "t", label: f.label, type: "text", w: 520 }];
      addTable(
        key,
        no,
        f.label,
        cols,
        items.map((t) => ({ t })),
      );
      prevKv = false;
    } else if (f.type === "table") {
      const cols = f.cols ?? [];
      const rows = asRows(v).filter((r) =>
        cols.some((c) => (r[c.k] ?? "").trim()),
      );
      addTable(key, no, f.label, cols, rows);
      prevKv = false;
    } else {
      out.push({
        id: key,
        node: (
          <KvRow
            no={no}
            label={f.label}
            value={asText(v)}
            part={part}
            first={!prevKv}
          />
        ),
      });
      prevKv = true;
      if (id === "fishbone" && f.k === "problem") {
        pushImage();
        prevKv = false;
      }
    }
  });

  if (id === "kpis") {
    const rows = asRows(data.rows);
    const act = data._act ?? {};
    const graded = kpiRows(rows).filter((r) => (act[actKey(r)] ?? "").trim());
    if (graded.length) {
      const cols: Col[] = [
        { k: "code", label: "รหัส", type: "text", w: 70 },
        { k: "dept", label: "ฝ่าย", type: "text", w: 150 },
        { k: "kpi", label: "KPI", type: "text", w: 330 },
        { k: "b", label: "B (Target)", type: "text", w: 110 },
        { k: "act", label: "ผลจริง", type: "text", w: 100 },
        { k: "grade", label: "เกรด", type: "text", w: 70 },
      ];
      const trs: Row[] = graded.map((r) => ({
        code: r.code ?? "",
        dept: r.dept ?? "",
        kpi: r.kpi ?? "",
        b: r.b ?? "",
        act: act[actKey(r)] ?? "",
        grade: gradeOf(r, act[actKey(r)]),
      }));
      addTable(
        "kpis:results",
        `${section.no}.${k + 1}`,
        "ผลการประเมิน KPI",
        cols,
        trs,
      );
      const depts = deptGrades(rows, act).filter((x) => x.n);
      if (depts.length) {
        out.push({
          id: "kpis:depts",
          node: (
            <KvRow
              no=""
              label="เกรดรายฝ่าย"
              value={depts
                .map((d) => `${d.dept} ${d.grade} (${d.avg?.toFixed(2)})`)
                .join("  ·  ")}
              part={part}
              first
            />
          ),
        });
      }
    }
  }
  return out;
}

/* ---------- ปก สารบัญ หน้าคั่น ---------- */

function Cover({ company, dateText }: { company: string; dateText: string }) {
  const { h } = DIM.p;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff" }}>
      <div style={{ position: "absolute", right: 0, top: 0 }}>
        <Bars w={300} h={330} />
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0 }}>
        <Bars w={300} h={330} flip />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 14,
          height: h,
          background: GOLD,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 330,
          textAlign: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Anna AI"
          width={Math.round((52 * 1000) / 221)}
          height={52}
          style={{ display: "inline-block" }}
        />
        <div
          style={{
            color: NAVY_MID,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 3,
            marginTop: 40,
          }}
        >
          BUSINESS BLUEPRINT REPORT
        </div>
        <div
          style={{
            color: NAVY,
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          รายงานแผนธุรกิจ
          <br />
          และแผนบุคลากร
        </div>
        <div
          style={{
            height: 4,
            width: 100,
            background: GOLD,
            borderRadius: 2,
            margin: "20px auto",
          }}
        />
        <div
          style={{
            color: NAVY,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.55,
          }}
        >
          {company || "บริษัท (ยังไม่ระบุชื่อ)"}
        </div>
        <div
          style={{ color: GRAY, fontSize: 14, marginTop: 10, lineHeight: 1.7 }}
        >
          จัดทำเมื่อวันที่ {dateText}
        </div>
        <div style={{ color: GRAY, fontSize: 13, lineHeight: 1.7 }}>
          จัดทำด้วยระบบ Anna AI · ระบบ HR AI ครบวงจร
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 40,
          textAlign: "center",
          fontSize: 12,
          color: GRAY,
        }}
      >
        by CSR Consulting Group
      </div>
    </div>
  );
}

function Toc({ items, starts }: { items: ExportItem[]; starts: number[] }) {
  const idx = (id: string) => items.findIndex((i) => i.section.id === id);
  return (
    <div style={{ position: "absolute", left: PX, right: PX, top: HEAD + 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: NAVY,
            lineHeight: 1.5,
          }}
        >
          สารบัญ
        </div>
        <div style={{ fontSize: 12, color: GRAY }}>หน้า</div>
      </div>
      <div
        style={{
          height: 4,
          background: GOLD,
          borderRadius: 2,
          margin: "4px 0 14px",
        }}
      />
      {PARTS.map((p) => (
        <div key={p.no} style={{ marginBottom: 16 }}>
          <div
            style={{
              background: p.main,
              color: "#fff",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.6,
              borderLeft: `8px solid ${GOLD}`,
            }}
          >
            ส่วนที่ {p.no} {p.title}
          </div>
          {p.ids.map((id) => {
            const i = idx(id);
            const it = items[i];
            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  padding: "6px 4px 6px 14px",
                  fontSize: 14,
                  color: INK,
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: p.main,
                    width: 24,
                    flexShrink: 0,
                  }}
                >
                  {it.section.no}.
                </span>
                <span style={{ fontWeight: 600 }}>{it.section.th}</span>
                <span style={{ fontSize: 11, color: GRAY }}>
                  {it.section.en}
                </span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: `2px dotted ${LINE}`,
                    transform: "translateY(-4px)",
                    minWidth: 20,
                  }}
                />
                <span style={{ fontWeight: 600, color: p.main }}>
                  {starts[i]}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Divider({ part, items }: { part: Part; items: ExportItem[] }) {
  const { h } = DIM.p;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: part.main,
        color: "#fff",
      }}
    >
      <div style={{ position: "absolute", right: 0, bottom: 0 }}>
        <Bars w={380} h={360} flip mono="#FFFFFF" />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 14,
          height: h,
          background: GOLD,
        }}
      />
      <div style={{ position: "absolute", left: 90, right: 90, top: 380 }}>
        <div
          style={{
            color: GOLD,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 4,
            lineHeight: 1.6,
          }}
        >
          ส่วนที่ {part.no}
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.5,
            marginTop: 4,
          }}
        >
          {part.title}
        </div>
        <div style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.6 }}>
          {part.en}
        </div>
        <div
          style={{
            height: 4,
            width: 90,
            background: GOLD,
            borderRadius: 2,
            margin: "22px 0",
          }}
        />
        <div style={{ fontSize: 15, lineHeight: 1.9, opacity: 0.95 }}>
          {part.ids.map((id) => {
            const it = items.find((i) => i.section.id === id) as ExportItem;
            return (
              <div key={id}>
                {it.section.no}. {it.section.th}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Frame({
  o,
  n,
  company,
  part,
  bare,
  children,
}: {
  o: Orient;
  n: number;
  company: string;
  part?: Part;
  bare?: boolean;
  children: ReactNode;
}) {
  const { w, h } = DIM[o];
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        background: "#fff",
        overflow: "hidden",
        color: INK,
      }}
    >
      {children}
      {!bare && (
        <>
          <div
            style={{
              position: "absolute",
              left: PX,
              right: PX,
              top: 0,
              height: HEAD,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `3px solid ${part?.main ?? GOLD}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Anna AI"
              width={Math.round((22 * 1000) / 221)}
              height={22}
              style={{ display: "block" }}
            />
            <span
              style={{
                fontSize: 11.5,
                color: part?.main ?? GRAY,
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              {part
                ? `ส่วนที่ ${part.no} ${part.title}`
                : "รายงานแผนธุรกิจและแผนบุคลากร"}
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              left: PX,
              right: PX,
              bottom: 0,
              height: FOOT,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${LINE}`,
              fontSize: 11.5,
              color: GRAY,
            }}
          >
            <span
              style={{
                maxWidth: "60%",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                lineHeight: 1.7,
              }}
            >
              {company || "รายงานแผนธุรกิจและแผนบุคลากร"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 4, height: 16, background: GOLD }} />
              <b style={{ color: part?.main ?? NAVY, fontSize: 13 }}>{n}</b>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- จัดหน้า ---------- */

const nextFrame = () =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

type Heights = Record<Orient, Map<string, number>>;

function paginateSection(
  blocks: Blk[],
  o: Orient,
  si: number,
  H: Heights,
  part: Part,
): Page[] {
  const pages: Page[] = [];
  const limit = ch(o);
  const hOf = (id: string) => H[o].get(id) ?? 0;
  let cur: Page | null = null;
  let used = 0;
  let lastTable: string | undefined;
  const open = (head?: string) => {
    cur = { kind: "content", o, blocks: [], section: si, part };
    pages.push(cur);
    used = 0;
    if (head) {
      cur.blocks.push({
        id: `${head}:repeat:${pages.length}`,
        node: null,
        table: head,
      });
      used += hOf(`head:${head}`);
    }
  };
  blocks.forEach((b, i) => {
    const h = hOf(b.id);
    const nextH = b.keepNext && blocks[i + 1] ? hOf(blocks[i + 1].id) : 0;
    if (!cur) open();
    else if (used + h + nextH > limit && used > 0)
      open(
        b.table && lastTable === b.table && !b.id.endsWith(":h")
          ? b.table
          : undefined,
      );
    (cur as Page).blocks.push(b);
    used += h;
    lastTable = b.table;
  });
  return pages;
}

export type PdfProgress = (done: number, total: number, label: string) => void;

export async function buildPdf(
  items: ExportItem[],
  company: string,
  dateText: string,
  images: ExportImages,
  onProgress: PdfProgress,
): Promise<Blob> {
  const fonts = await loadFonts(["400", "600", "700"]);
  const fontFamily = fonts.th;

  const sizes = new Map<string, { w: number; h: number }>();
  const entries: [string, string | null | undefined][] = [
    ["fishbone", images.fishbone],
    ["bmc", images.bmc],
    ["org", images.org],
  ];
  await Promise.all(
    entries.map(
      ([k, url]) =>
        new Promise<void>((res) => {
          if (!url) return res();
          const img = new Image();
          img.onload = () => {
            sizes.set(k, { w: img.naturalWidth, h: img.naturalHeight });
            res();
          };
          img.onerror = () => res();
          img.src = url;
        }),
    ),
  );

  const ctx: Ctx = { heads: new Map(), sizes, images, fig: { n: 1 } };
  const secs = items.map((i) => sectionBlocks(i, ctx));

  const mkHost = (width: number) => {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;font-family:${fontFamily};color:${INK};-webkit-font-smoothing:antialiased;pointer-events:none;`;
    document.body.appendChild(el);
    return el;
  };

  // 1) วัดความสูงของทุกบล็อก (วัดทั้งแนวตั้งและแนวนอน เพราะความกว้างต่างกัน)
  onProgress(0, 1, "กำลังจัดหน้า…");
  const H: Heights = { p: new Map(), l: new Map() };
  for (const o of ["p", "l"] as const) {
    const host = mkHost(cw(o));
    const r = createRoot(host);
    r.render(
      <>
        {secs.flat().map((b) => (
          <div key={b.id} data-bid={b.id}>
            {b.node}
          </div>
        ))}
        {[...ctx.heads].map(([k, node]) => (
          <div key={k} data-bid={`head:${k}`}>
            {node}
          </div>
        ))}
      </>,
    );
    await nextFrame();
    try {
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ที่มีอยู่ */
    }
    await nextFrame();
    host
      .querySelectorAll<HTMLElement>("[data-bid]")
      .forEach((el) =>
        H[o].set(
          el.dataset.bid as string,
          Math.ceil(el.getBoundingClientRect().height),
        ),
      );
    r.unmount();
    host.remove();
  }

  const pages: Page[] = [
    { kind: "cover", o: "p", blocks: [] },
    { kind: "toc", o: "p", blocks: [] },
  ];
  PARTS.forEach((p) => {
    pages.push({ kind: "divider", o: "p", blocks: [], part: p });
    p.ids.forEach((id) => {
      const si = items.findIndex((i) => i.section.id === id);
      pages.push(
        ...paginateSection(secs[si], LANDSCAPE.has(id) ? "l" : "p", si, H, p),
      );
    });
  });
  const starts = items.map(
    (_, si) => pages.findIndex((p) => p.section === si) + 1,
  );

  // 2) วาดทุกหน้าแล้วแปลงเป็นภาพ
  const host = mkHost(DIM.l.w);
  const root = createRoot(host);
  root.render(
    <>
      {pages.map((p, pi) => (
        <div
          key={pi}
          data-page={pi}
          data-o={p.o}
          style={{ width: DIM[p.o].w, height: DIM[p.o].h, marginBottom: 8 }}
        >
          {p.kind === "cover" ? (
            <Frame o="p" n={1} company={company} bare>
              <Cover company={company} dateText={dateText} />
            </Frame>
          ) : p.kind === "toc" ? (
            <Frame o="p" n={pi + 1} company={company}>
              <Toc items={items} starts={starts} />
            </Frame>
          ) : p.kind === "divider" ? (
            <Frame o="p" n={pi + 1} company={company} bare>
              <Divider part={p.part as Part} items={items} />
            </Frame>
          ) : (
            <Frame o={p.o} n={pi + 1} company={company} part={p.part}>
              <div
                style={{
                  position: "absolute",
                  left: PX,
                  right: PX,
                  top: HEAD + TOP_PAD,
                }}
              >
                {p.blocks.map((b) => (
                  <div key={b.id}>
                    {b.node ?? ctx.heads.get(b.table as string)}
                  </div>
                ))}
              </div>
            </Frame>
          )}
        </div>
      ))}
    </>,
  );
  await nextFrame();
  try {
    await document.fonts.ready;
  } catch {
    /* ใช้ฟอนต์ที่มีอยู่ */
  }
  await nextFrame();

  const { toJpeg } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  pdf.setProperties({
    title: `รายงานแผนธุรกิจ ${company}`.trim(),
    author: "Anna AI",
    creator: "Anna AI",
  });

  const els = [...host.querySelectorAll<HTMLElement>("[data-page]")];
  const optsFor = (o: Orient) => ({
    pixelRatio: 2,
    quality: 0.92,
    backgroundColor: "#ffffff",
    width: DIM[o].w,
    height: DIM[o].h,
  });
  // รอบแรกให้เบราว์เซอร์โหลดฟอนต์/รูปเข้าตัวแปลงภาพ แล้วทิ้งผล
  await toJpeg(els[0], optsFor("p")).catch(() => null);
  try {
    for (let i = 0; i < els.length; i++) {
      onProgress(i, els.length, `กำลังสร้างหน้า ${i + 1} / ${els.length}`);
      const o = pages[i].o;
      const url = await toJpeg(els[i], optsFor(o));
      if (i > 0) pdf.addPage("a4", o === "l" ? "landscape" : "portrait");
      pdf.addImage(
        url,
        "JPEG",
        0,
        0,
        o === "l" ? 297 : 210,
        o === "l" ? 210 : 297,
        undefined,
        "FAST",
      );
    }
    onProgress(els.length, els.length, "กำลังบันทึกไฟล์…");
    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}
