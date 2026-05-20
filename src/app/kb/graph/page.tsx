export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { GraphExplorer } from "./graph-explorer";

export default function KbGraphPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Knowledge Base · RFP 4-4 ①"
        title="컨텍스트 그래프 ER"
        description="이름·업태가 달라도 BRN·도메인·거래처 겹침 등 다차원 단서로 동일 법인을 연결합니다. Databricks GraphFrames Connected Component 알고리즘의 핵심 로직을 Next.js 서버리스로 재현합니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/kb", label: "KB 개요" },
          { label: "컨텍스트 그래프 ER" },
        ]}
      />
      <GraphExplorer />
    </AppShell>
  );
}
