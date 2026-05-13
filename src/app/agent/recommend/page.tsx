import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { RecommendWizard } from "./recommend-wizard";

export const dynamic = "force-dynamic";

export default async function RecommendPage() {
  const [industries, sessions, products, accounts] = await Promise.all([
    prisma.account.findMany({
      distinct: ["industryLabel"],
      select: { industryLabel: true },
    }),
    prisma.session.findMany({
      select: { id: true, title: true, track: true, targetTopicsJson: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, category: true },
    }),
    prisma.account.count(),
  ]);

  const industryList = industries
    .map((i) => i.industryLabel)
    .filter((x): x is string => Boolean(x))
    .sort();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales Solution Agent"
        title="추천 워크플로"
        description="구조화된 세일즈 니즈 → Agent가 후보 발굴 · 우선순위 산정 · 추천 사유 · 매칭 세션/상품 · 접근 전략 · 메시지 초안까지 한 번에 생성합니다."
        breadcrumbs={[{ href: "/", label: "홈" }, { href: "/agent", label: "Agent" }, { label: "추천 워크플로" }]}
      />
      <RecommendWizard
        industries={industryList}
        sessions={sessions}
        products={products}
        totalAccounts={accounts}
      />
    </AppShell>
  );
}
