import Link from "next/link";
import {
  ArrowRight,
  Database,
  FileSearch,
  GitMerge,
  ListChecks,
  MessagesSquare,
  Network,
  Sparkles,
  Target,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

async function getStats() {
  const [
    accountCount,
    sfCount,
    sheetCount,
    docCount,
    ruleCount,
    activityCount,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.sfAccount.count(),
    prisma.sheetProspect.count(),
    prisma.document.count(),
    prisma.ruleDefinition.count(),
    prisma.activity.count(),
  ]);
  return { accountCount, sfCount, sheetCount, docCount, ruleCount, activityCount };
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <AppShell>
      <PageHeader
        eyebrow="모비데이즈 AI/AX · PoC 데모"
        title={
          <>
            분산된 세일즈 데이터를{" "}
            <span className="bg-[color:var(--color-brand-lime)] px-1.5 rounded">하나의 KB</span>로,
            <br />
            AI Agent가 즉시 활용 가능한 형태로.
          </>
        }
        description="본 데모는 RFP 4-4의 세 가지 기술 검증 과제(통합 ID, 비정형 처리, 룰 엔진 연계)와 Sales Solution Agent의 핵심 워크플로를 라이브로 시연합니다."
        actions={
          <Link
            href="/kb/match"
            className="inline-flex items-center gap-1.5 bg-[color:var(--color-brand-ink)] text-white px-4 h-10 rounded-md font-medium text-sm hover:bg-[color:var(--color-brand-ink-2)]"
          >
            데모 시작 <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <KpiTile label="통합 광고주" value={stats.accountCount} />
        <KpiTile label="Salesforce 원본" value={stats.sfCount} />
        <KpiTile label="Sheet 원본" value={stats.sheetCount} />
        <KpiTile label="미팅록·문서" value={stats.docCount} />
        <KpiTile label="활동 이력" value={stats.activityCount} />
        <KpiTile label="룰 정의" value={stats.ruleCount} />
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">RFP 4-4 · 기술 검증 과제</h2>
          <Badge tone="ink">필수 제안 항목 / 30점</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DemoCard
            href="/kb/match"
            number="01"
            icon={GitMerge}
            title="통합 ID 설계 샘플"
            tagline="'삼성전자' / '삼성 전자' / 'Samsung Electronics' / '삼성전자(주)' → 하나의 CMID"
            bullets={[
              "Tier 1 · 결정론적 강한 키 (사업자번호 / DART)",
              "Tier 2 · 정규화 이름 + 도메인",
              "Tier 3 · 가중 피처 + 임계값 (자동 / 검토 / 신규)",
            ]}
          />
          <DemoCard
            href="/kb/extract"
            number="02"
            icon={FileSearch}
            title="비정형 데이터 처리 설계"
            tagline="미팅록 원문 → 구조화 JSON + 청크 + 임베딩 → AI Agent 조회"
            bullets={[
              "파싱 · PII 마스킹 · LLM 구조 추출 (Tool Use)",
              "엔티티 링킹 (참석자 → PMID/CMID)",
              "Semantic chunking + 메타데이터 부착",
            ]}
          />
          <DemoCard
            href="/kb/rules"
            number="03"
            icon={Network}
            title="룰 엔진 연계 아키텍처"
            tagline="고객 분류 룰이 KB를 조회 → 판단 → 출력 · 감사 로그 + HITL"
            bullets={[
              "DMN-style YAML · 안전한 AST 평가기",
              "KB Access Layer · materialized view",
              "시뮬레이션 · 단건 실행 · 영향 N건 미리보기",
            ]}
          />
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Sales Solution Agent · 워크플로</h2>
          <Badge tone="lime">Max Summit 2026 시연</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DemoLink href="/agent" icon={Sparkles} title="Agent 대시보드" desc="KPI · 보류 액션 · Lead Stage 칸반" />
          <DemoLink href="/agent/recommend" icon={Target} title="추천 워크플로" desc="니즈 입력 → 후보 → 사유 · 메시지" />
          <DemoLink href="/agent/messages" icon={MessagesSquare} title="메시지 초안" desc="초청 · 제안 · 리마인드 · 팔로업" />
          <DemoLink href="/agent/actions" icon={ListChecks} title="다음 액션 큐" desc="미응답 / 미배정 / 행사 전후 흐름" />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-3">데이터 아키텍처 (요약)</h2>
        <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-6 overflow-x-auto">
          <pre className="text-[12px] leading-relaxed text-[color:var(--color-foreground)]/85 font-mono whitespace-pre">{`L0  Source Layer (Salesforce · Google Sheets · Drive · Gmail · Slack)
                  │
                  ▼ CDC / Polling / Webhook
L1  Bronze  (raw, append-only, lineage 시작)
                  │  validate · normalize · dedupe
                  ▼
L2  Silver  (per-source cleaned: sf_accounts, sheet_prospects, ...)
                  │  Entity Resolution · Survivorship
                  ▼
L3  Gold / Canonical  (CMID — single source of truth)
                  │  enrich · embed · index
                  ▼
L4  AI-Ready  (Entity Cards · Embeddings · Materialized Views · MCP)
                  │
                  ▼
L5  Serving  (REST · GraphQL · MCP · Rule Engine · BI replica)`}</pre>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight mb-3">데모 사용 안내</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <InfoBlock icon={Database} title="시드 데이터">
            22개 광고주, 7개 미팅록, 3개 룰, Samsung 4 spelling 분산 케이스 포함.
            언제든 <Link href="/admin/seed" className="underline">초기화</Link> 가능.
          </InfoBlock>
          <InfoBlock icon={Sparkles} title="Mock LLM">
            데모는 LLM API 호출 없이 결정론적 모의 응답을 사용합니다. 실 환경에선 Claude / Voyage를 연결합니다.
          </InfoBlock>
          <InfoBlock icon={ListChecks} title="추천 시연 동선">
            ① 통합 ID → ② 비정형 처리 → ③ 룰 엔진 → ④ 광고주 360 → ⑤ Agent 워크플로 순으로 5분 내 라이브 시연.
          </InfoBlock>
        </div>
      </section>
    </AppShell>
  );
}

function KpiTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
        {label}
      </div>
      <div className="text-xl font-semibold tracking-tight tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  );
}

function DemoCard({
  href,
  number,
  icon: Icon,
  title,
  tagline,
  bullets,
}: {
  href: string;
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  bullets: string[];
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5 flex flex-col hover:border-[color:var(--color-brand-ink)] transition relative overflow-hidden"
    >
      <div className="absolute right-4 top-3 text-[40px] font-bold text-[color:var(--color-brand-lime-bg)] leading-none tracking-tighter pointer-events-none">
        {number}
      </div>
      <div className="size-9 rounded-md bg-[color:var(--color-brand-ink)] text-[color:var(--color-brand-lime)] flex items-center justify-center mb-3">
        <Icon className="size-5" />
      </div>
      <div className="font-semibold tracking-tight mb-1">{title}</div>
      <p className="text-xs text-[color:var(--color-muted-foreground)] mb-3 min-h-[36px]">{tagline}</p>
      <ul className="space-y-1.5 text-[12px] text-[color:var(--color-foreground)]/85">
        {bullets.map((b) => (
          <li key={b} className="flex gap-1.5">
            <span className="text-[color:var(--color-brand-ink)] mt-0.5">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-[color:var(--color-brand-ink)] group-hover:gap-2 transition-all">
        라이브 데모 열기 <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}

function DemoLink({
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
      className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 hover:border-[color:var(--color-brand-ink)] transition"
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[color:var(--color-brand-ink)]" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{desc}</p>
    </Link>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
      <div className="flex items-center gap-1.5 font-medium text-sm">
        <Icon className="size-4 text-[color:var(--color-brand-ink)]" />
        {title}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-[color:var(--color-foreground)]/80">
        {children}
      </div>
    </div>
  );
}
