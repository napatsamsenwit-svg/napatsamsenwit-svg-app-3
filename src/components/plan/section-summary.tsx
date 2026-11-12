import type { Field, Section } from "@/lib/form-schema";
import { asList, asRows, asText, hasVal, type SectionData } from "@/lib/form-logic";
import { actKey, deptGrades, gradeOf, kpiRows } from "@/lib/kpi";
import { StatusPill } from "@/components/status-pill";
import { ReportImage, type ImageKind } from "./report-images";
import type { SectionStatus } from "@/lib/plan-status";

const EMPTY = <span className="text-muted-foreground">—</span>;

/** เทมเพลตรีพอร์ต: ทุกช่องแสดงเป็นหัวข้อคำถามเสมอ ช่องที่ยังไม่มีข้อมูลขึ้น — */
function FieldView({ f, v }: { f: Field; v: unknown }) {
  if (f.type === "cmpEdits") return null;
  if (!hasVal(f, v)) {
    return (
      <div className="space-y-0.5 print:break-inside-avoid">
        <h4 className="text-sm font-medium text-muted-foreground">{f.label}</h4>
        <p>{EMPTY}</p>
      </div>
    );
  }
  if (f.type === "list") {
    return (
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-muted-foreground">{f.label}</h4>
        <ul className="list-disc space-y-0.5 pl-5">
          {asList(v)
            .filter((x) => x.trim())
            .map((x, i) => (
              <li key={i}>{x}</li>
            ))}
        </ul>
      </div>
    );
  }
  if (f.type === "table") {
    const cols = f.cols ?? [];
    const rows = asRows(v).filter((r) => cols.some((c) => (r[c.k] ?? "").trim()));
    return (
      <div className="space-y-1">
        {f.label && <h4 className="text-sm font-medium text-muted-foreground">{f.label}</h4>}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="border px-2 py-1.5 font-medium">#</th>
                {cols.map((c) => (
                  <th key={c.k} className="border px-2 py-1.5 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="align-top print:break-inside-avoid">
                  <td className="border px-2 py-1.5 tabular-nums">{i + 1}</td>
                  {cols.map((c) => (
                    <td key={c.k} className="border px-2 py-1.5 whitespace-pre-wrap">
                      {r[c.k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <h4 className="text-sm font-medium text-muted-foreground">{f.label}</h4>
      <p className="whitespace-pre-wrap">{asText(v)}</p>
    </div>
  );
}

/** แสดงหัวข้อหนึ่งแบบอ่านอย่างเดียว ใช้ในหน้าสรุปและตอนพิมพ์ */
export function SectionSummary({
  section,
  data,
  status,
  company,
}: {
  section: Section;
  data: SectionData;
  status: SectionStatus;
  company: string;
}) {
  const imageKind: ImageKind | null = section.id === "fishbone" || section.id === "bmc" || section.id === "org" ? section.id : null;
  const kpi = section.id === "kpis" ? kpiRows(asRows(data.rows)) : [];
  const act = data._act ?? {};
  const graded = kpi.filter((r) => (act[actKey(r)] ?? "").trim());
  const depts = section.id === "kpis" ? deptGrades(asRows(data.rows), act).filter((x) => x.n) : [];

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 md:p-5 print:break-before-page print:border-0 print:p-0" aria-labelledby={`sum-${section.id}`}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 id={`sum-${section.id}`} className="text-lg font-semibold">
          {section.no}. {section.th} <span className="text-sm font-normal text-muted-foreground">{section.en}</span>
        </h3>
        <StatusPill status={status} className="print:hidden" />
      </header>
      {(
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground print:hidden">{section.desc}</p>
          {section.fields.map((f) => (
            <FieldView key={f.k} f={f} v={data[f.k]} />
          ))}
          {imageKind && <ReportImage kind={imageKind} data={data} company={company} />}
          {graded.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">ผลการประเมิน KPI</h4>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    {["รหัส", "ฝ่าย", "KPI", "B (Target)", "ผลจริง", "เกรด"].map((h) => (
                      <th key={h} className="border px-2 py-1.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {graded.map((r, i) => (
                    <tr key={i} className="align-top print:break-inside-avoid">
                      <td className="border px-2 py-1.5">{r.code}</td>
                      <td className="border px-2 py-1.5">{r.dept}</td>
                      <td className="border px-2 py-1.5">{r.kpi}</td>
                      <td className="border px-2 py-1.5">{r.b}</td>
                      <td className="border px-2 py-1.5">{act[actKey(r)]}</td>
                      <td className="border px-2 py-1.5 font-semibold">{gradeOf(r, act[actKey(r)]) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {depts.length > 0 && (
                <p className="text-sm">
                  <b>เกรดรายฝ่าย:</b>{" "}
                  {depts.map((d) => `${d.dept} ${d.grade} (${d.avg?.toFixed(2)})`).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
