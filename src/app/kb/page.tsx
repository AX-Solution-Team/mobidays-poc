import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  GitMerge,
  Network,
  Target,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getKbStats() {
  const [accounts, aliases, externalIds, docs, mdmQueue] = await Promise.all([
    prisma.account.count(),
    prisma.accountAlias.count(),
    prisma.accountExternalId.count(),
    prisma.document.count(),
    prisma.mdmCandidate.count({ where: { status: "pending" } }),
  ]);
  return { accounts, aliases, externalIds, docs, mdmQueue };
}

export default async function KbPage() {
  const stats = await getKbStats();
  return (
    <AppShell>
      <PageHeader
        eyebrow="AI-ready Sales Knowledge Base"
        title="분산된 세일즈 데이터를 SSOT로"
        description="Salesforce · Sheet · Drive · Gmail에 흩어진 데이터를 통합 ID(CMID) 기준 단일 진실 소스로 정리하고, AI Agent가 LLM 컨텍스트로 즉시 활용할 수 있도록 합니다."
        breadcrumbs={[{ href: "/", label: "홈" }, { label: "Knowledge Base" }]}
      />

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Stat label="통합 광고주(CMID)" value={stats.accounts} />
        <Stat label="별칭 사전" value={stats.aliases} />
        <Stat label="외부 ID 매핑" value={stats.externalIds} />
        <Stat label="문서 / 미팅록" value={stats.docs} />
        <Stat label="MDM 리뷰 대기" value={stats.mdmQueue} tone={stats.mdmQueue > 0 ? "warning" : "neutral"} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DemoLink
          href="/kb/match"
          icon={GitMerge}
          tag="RFP 4-4 ①"
          title="통합 ID 매칭 시뮬레이터"
          desc="4가지 표기의 '삼성전자'를 라이브로 하나의 CMID에 매핑"
        />
        <DemoLink
          href="/kb/extract"
          icon={FileSearch}
          tag="RFP 4-4 ②"
          title="비정형 데이터 처리"
          desc="미팅록 → 7단계 파이프라인 라이브 추출"
        />
        <DemoLink
          href="/kb/rules"
          icon={Network}
          tag="RFP 4-4 ③"
          title="룰 엔진 연계"
          desc="고객 분류 룰이 KB를 조회하고 판단을 수행"
        />
        <DemoLink
          href="/accounts"
          icon={Target}
          title="광고주 360 뷰"
          desc="통합된 광고주의 데이터·신선도·출처 한눈에"
        />
      </section>

      <section className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 mb-6">
        <h2 className="font-semibold text-base mb-4 tracking-tight">5계층 아키텍처</h2>
        <div className="space-y-3">
          {[
            { layer: "L5", title: "Serving", desc: "REST · GraphQL · MCP · Rule Engine · BI replica" },
            { layer: "L4", title: "AI-Ready", desc: "Entity Cards · Embeddings · Materialized Views · MCP" },
            { layer: "L3", title: "Gold / Canonical", desc: "CMID — single source of truth (이 데모의 핵심 출력)" },
            { layer: "L2", title: "Silver", desc: "per-source cleaned: sf_accounts, sheet_prospects, ..." },
            { layer: "L1", title: "Bronze", desc: "raw 원본 보존 + lineage 시작" },
            { layer: "L0", title: "Sources", desc: "Salesforce · Google Sheets · Drive · Gmail · Slack" },
          ].map((l) => (
            <div
              key={l.layer}
              className="flex items-center gap-3 p-3 rounded-md bg-[color:var(--color-muted)]/50"
            >
              <Badge tone="ink">{l.layer}</Badge>
              <div className="font-medium text-sm">{l.title}</div>
              <div className="text-xs text-[color:var(--color-muted-foreground)]">— {l.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {tone === "warning" && (
        <div className="text-[11px] text-[color:var(--color-warning)] mt-0.5">검토 필요</div>
      )}
    </div>
  );
}

function DemoLink({
  href,
  icon: Icon,
  tag,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 hover:border-[color:var(--color-brand-ink)] transition"
    >
      <div className="flex items-start justify-between">
        <div className="size-9 rounded-md bg-[color:var(--color-brand-ink)] text-[color:var(--color-brand-lime)] flex items-center justify-center">
          <Icon className="size-5" />
        </div>
        {tag && <Badge tone="lime">{tag}</Badge>}
      </div>
      <div className="mt-3 font-semibold text-sm">{title}</div>
      <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{desc}</p>
      <div className="mt-3 inline-flex items-center text-[12px] font-medium text-[color:var(--color-brand-ink)] gap-1 group-hover:gap-2 transition-all">
        열기 <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}
