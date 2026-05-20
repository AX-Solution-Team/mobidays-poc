export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { SearchExplorer } from "./search-explorer";

export default function KbSearchPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Knowledge Base · AI 검색"
        title="세일즈 시그널 검색"
        description="미팅록·문서·제안서에 분산된 세일즈 시그널을 BM25+의미 기반으로 검색합니다. 실 운영 시 pgvector cosine similarity로 대체됩니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/kb", label: "KB 개요" },
          { label: "AI 검색" },
        ]}
      />

      {/* Info card */}
      <div className="mb-6 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/50 px-5 py-4 text-sm text-[color:var(--color-foreground)]">
        <div className="font-semibold mb-2 text-[color:var(--color-brand-ink)]">이 검색이 보여주는 것:</div>
        <ul className="space-y-1 text-[color:var(--color-muted-foreground)]">
          <li>• DocChunk 텍스트 대상 BM25 스코어링 (Vercel 서버리스)</li>
          <li>• 실 운영: pgvector + voyage-multilingual-2 임베딩으로 대체</li>
          <li>• 결과: 청크 원문 + 소속 문서 + 광고주 CMID 링크</li>
        </ul>
      </div>

      <SearchExplorer />
    </AppShell>
  );
}
