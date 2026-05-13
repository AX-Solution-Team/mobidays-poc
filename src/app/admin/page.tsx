import Link from "next/link";
import { Database, RefreshCcw, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="운영 콘솔"
        description="데이터 품질, MDM 리뷰, 시드 관리. 본 데모는 단일 사용자(Admin)로 작동합니다."
        breadcrumbs={[{ href: "/", label: "홈" }, { label: "Admin" }]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card href="/admin/dq" icon={ShieldCheck} title="데이터 품질" desc="suite별 통과율, 결측·이상치 모니터링" />
        <Card href="/admin/mdm" icon={Users} title="MDM 리뷰 큐" desc="Tier 3 리뷰 후보 병합 결정" />
        <Card href="/admin/audit" icon={Database} title="감사 로그" desc="모든 결정·변경 이력 추적" />
        <Card href="/admin/seed" icon={RefreshCcw} title="데이터 리셋" desc="시드 데이터 재적재 (개발용)" />
      </div>
    </AppShell>
  );
}

function Card({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 hover:border-[color:var(--color-brand-ink)] transition"
    >
      <div className="size-9 rounded-md bg-[color:var(--color-brand-ink)] text-[color:var(--color-brand-lime)] flex items-center justify-center mb-3">
        <Icon className="size-5" />
      </div>
      <div className="font-medium text-sm">{title}</div>
      <p className="text-xs text-[color:var(--color-muted-foreground)] mt-1">{desc}</p>
    </Link>
  );
}
