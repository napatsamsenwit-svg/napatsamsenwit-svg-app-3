import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/allowed-emails";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/opengraph-image", "/icon", "/apple-icon", "/manifest.webmanifest"];

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
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // บัญชีที่ล็อกอินค้างอยู่แต่ไม่อยู่ในรายชื่ออนุญาต: ล้างการล็อกอินแล้วส่งกลับหน้า login
  if (data?.claims && !isAllowedEmail(data.claims.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?blocked=1";
    const blocked = NextResponse.redirect(url);
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => blocked.cookies.delete(c.name));
    return blocked;
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
