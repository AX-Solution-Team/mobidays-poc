import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { RuleStudio } from "./rule-studio";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await prisma.ruleDefinition.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, yaml: true, status: true, version: true },
  });
  const accounts = await prisma.account.findMany({
    orderBy: { canonicalName: "asc" },
    select: {
      cmid: true,
      canonicalName: true,
      industryLabel: true,
      customerTier: true,
      marketingBudgetKrw: true,
      annualRevenueKrw: true,
      relationshipScore: true,
      leadStage: true,
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="RFP 4-4 ③ · 룰 엔진 연계 아키텍처"
        title="룰 빌더 · 실행기 · 시뮬레이터"
        description="DMN-style YAML 룰을 KB Access Layer를 통해 데이터를 조회하고, 안전한 AST 평가기로 판단을 수행. 단건 실행과 영향 시뮬레이션(N개 광고주 변화 예측) 모두 가능."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/kb", label: "Knowledge Base" },
          { label: "룰 엔진" },
        ]}
      />
      <RuleStudio
        rules={rules.map((r) => ({ ...r }))}
        accounts={accounts.map((a) => ({
          ...a,
          marketingBudgetKrw: a.marketingBudgetKrw != null ? Number(a.marketingBudgetKrw) : null,
          annualRevenueKrw: a.annualRevenueKrw != null ? Number(a.annualRevenueKrw) : null,
        }))}
      />
    </AppShell>
  );
}
