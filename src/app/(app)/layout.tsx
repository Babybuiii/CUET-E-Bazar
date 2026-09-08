import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleGuard>{children}</RoleGuard>
    </AppShell>
  );
}
