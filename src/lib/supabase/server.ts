import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { supabaseKey, supabaseUrl } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // คุกกี้เซสชัน: ไม่ตั้งวันหมดอายุ (ยกเว้นตอนลบ) จึงหายเมื่อปิดเบราว์เซอร์
            const { maxAge, expires, ...rest } = options ?? {};
            void expires;
            cookieStore.set(name, value, maxAge === 0 ? options : rest);
          });
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
