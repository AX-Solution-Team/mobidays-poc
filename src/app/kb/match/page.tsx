import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { MatchSimulator } from "./match-simulator";

export const dynamic = "force-dynamic";

export default function MatchPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="RFP 4-4 ① · 통합 ID 설계 샘플"
        title="통합 ID 매칭 시뮬레이터"
        description="단일 문자열 매칭이 아닌 결정론적·확률적 3-Tier 파이프라인. '삼성전자', '삼성 전자', 'Samsung Electronics', '삼성전자(주)'가 모두 하나의 CMID로 묶이고, '삼성중공업' 같은 사촌 법인은 자동 분리됩니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/kb", label: "Knowledge Base" },
          { label: "통합 ID 매칭" },
        ]}
      />
      <MatchSimulator />
    </AppShell>
  );
}
