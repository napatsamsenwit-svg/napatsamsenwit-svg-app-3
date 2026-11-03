import { Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./login/actions";

export default async function Home() {
  let email: string | null = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email = typeof data?.claims.email === "string" ? data.claims.email : null;
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isSupabaseConfigured ? <Database className="size-6" /> : <Sparkles className="size-6" />}
          </div>
          <CardTitle className="text-2xl">เว็บของคุณพร้อมแล้ว 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          {isSupabaseConfigured ? (
            <>
              <p>เชื่อม database แล้ว เข้าสู่ระบบด้วย {email}</p>
              <form action={logout}>
                <Button variant="outline" type="submit">ออกจากระบบ</Button>
              </form>
            </>
          ) : (
            <p>ยังไม่ได้เชื่อม database ไม่เป็นไร เดี๋ยว Claude พาทำให้</p>
          )}
          <p>เดี๋ยว Claude จะสร้างแอปของคุณแทนที่หน้านี้</p>
        </CardContent>
      </Card>
    </main>
  );
}
