import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LIVE_COOKIE } from "@/lib/session-marker";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

/** รหัสรุ่นเซสชันทั้งระบบ (เปลี่ยนเมื่อผู้ตรวจกด "รีเซ็ตเว็บ") แคชสั้น ๆ เพื่อไม่ถามฐานข้อมูลทุกคำขอ */
let epochCache: { v: string; at: number } | null = null;
async function currentEpoch(supabase: { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> }) {
  if (epochCache && Date.now() - epochCache.at < 10_000) return epochCache.v;
  const { data, error } = await supabase.rpc("get_session_epoch");
  const v = !error && typeof data === "string" ? data : "1";
  epochCache = { v, at: Date.now() };
  return v;
}

const PUBLIC_PATHS = ["/login", "/opengraph-image", "/icon", "/apple-icon", "/manifest.webmanifest", "/api/health", "/api/line"];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const { maxAge, expires, ...rest } = options ?? {};
          void expires;
          response.cookies.set(name, value, maxAge === 0 ? options : rest);
        });
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // ล็อกอินค้างจากการเปิดเว็บครั้งก่อน (ไม่มีคุกกี้เซสชัน): ล้างแล้วให้ล็อกอินใหม่ทุกครั้ง
  const liveValue = request.cookies.get(LIVE_COOKIE)?.value;
  const live = !!liveValue && liveValue === (await currentEpoch(supabase));
  if (data?.claims && !live && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const out = NextResponse.redirect(url);
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => out.cookies.delete(c.name));
    return out;
  }

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
