import { AppShell } from "@/components/app-shell";
import { isReviewerUser, requireUser } from "@/lib/plan";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ email }, isReviewer] = await Promise.all([requireUser(), isReviewerUser()]);
  return (
    <AppShell isReviewer={isReviewer} email={email}>
      {children}
    </AppShell>
  );
}
