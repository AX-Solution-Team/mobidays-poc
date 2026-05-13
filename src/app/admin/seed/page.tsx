import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { SeedConsole } from "./seed-console";

export const dynamic = "force-dynamic";

export default function SeedPage() {
  // Make the seed secret presence known to the client (not the value itself).
  const requireSecret = Boolean(process.env.SEED_SECRET);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin · Demo Utilities"
        title="시드 데이터 관리"
        description="시연 중 데이터를 변경한 경우 이 페이지에서 한 번에 초기화할 수 있습니다. 운영 데이터가 아닌 시연용이라 언제든 자유롭게 리셋해도 안전합니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/admin", label: "Admin" },
          { label: "Seed" },
        ]}
      />
      <SeedConsole requireSecret={requireSecret} />
    </AppShell>
  );
}
