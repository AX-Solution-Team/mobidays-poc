import Link from "next/link";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  MessageSquareWarning,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { prisma } from "@/lib/db";
import { cn, fmtDate, relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGES = ["Identified", "Invited", "Confirmed", "Met", "Won", "Lost"] as const;

export default async function AgentDashboardPage() {
  const event = await prisma.event.findFirst({
    orderBy: { startsAt: "asc" },
  });
  const accounts = await prisma.account.findMany({
    select: {
      cmid: true,
      canonicalName: true,
      industryLabel: true,
      customerTier: true,
      leadStage: true,
      relationshipScore: true,
      ownerUserId: true,
      lastTouchedAt: true,
    },
  });
  const messageStats = {
    sent: await prisma.message.count({ where: { status: "Sent" } }),
    pending: await prisma.message.count({ where: { status: "PendingApproval" } }),
  };
  const ruleExecutions = await prisma.ruleExecution.count();
  const reviewQueue = await prisma.mdmCandidate.count({ where: { status: "pending" } });

  // Group by leadStage for Kanban
  const byStage: Record<string, typeof accounts> = {};
  for (const s of STAGES) byStage[s] = [];
  for (const a of accounts) {
    if (a.leadStage && byStage[a.leadStage]) byStage[a.leadStage].push(a);
  }

  // Action items (mock — derived from accounts)
  const idleHighValue = accounts
    .filter(
      (a) =>
        (a.relationshipScore ?? 0) >= 60 &&
        a.lastTouchedAt &&
        (Date.now() - a.lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24) > 60,
    )
    .slice(0, 4);
  const noOwner = accounts.filter((a) => !a.ownerUserId && a.customerTier === "A").slice(0, 4);
  const invitedNoReply = accounts.filter((a) => a.leadStage === "Invited").slice(0, 4);

  const daysToEvent = event
    ? Math.ceil((event.startsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales Solution Agent · 운영 대시보드"
        title="Max Summit 2026 세일즈 작전 본부"
        description={
          event
            ? `${fmtDate(event.startsAt)} 개최 — D-${daysToEvent}일 · 이벤트별 KPI · 보류 액션 · Lead Stage 칸반`
            : "행사 일정 정보 없음"
        }
        breadcrumbs={[{ href: "/", label: "홈" }, { label: "Agent 대시보드" }]}
        actions={
          <Link
            href="/agent/recommend"
            className="inline-flex items-center gap-1.5 bg-[color:var(--color-brand-ink)] text-white px-4 h-10 rounded-md font-medium text-sm hover:bg-[color:var(--color-brand-ink-2)]"
          >
            <Sparkles className="size-4" /> 새 추천 실행
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Stat
          label="D-Day"
          value={daysToEvent ?? "—"}
          hint={event ? `${fmtDate(event.startsAt)} 개최` : "행사 미설정"}
        />
        <Stat
          label="이번 주 송부"
          value={messageStats.sent}
          hint="초청·제안·팔로업 합계"
          trend="up"
        />
        <Stat
          label="승인 대기"
          value={messageStats.pending}
          hint="매니저 검토 필요"
          trend={messageStats.pending > 0 ? "flat" : "flat"}
        />
        <Stat
          label="룰 실행 누적"
          value={ruleExecutions}
          hint="자동 분류/액션 트리거"
        />
        <Stat
          label="MDM 리뷰"
          value={reviewQueue}
          hint="병합 후보 대기 중"
          trend={reviewQueue > 0 ? "flat" : "flat"}
        />
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold tracking-tight mb-3">Lead Stage 칸반</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {STAGES.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] flex flex-col min-h-[200px]"
            >
              <div className="px-3 py-2 border-b border-[color:var(--color-border)] flex items-center justify-between">
                <span className="text-xs font-semibold tracking-tight">{s}</span>
                <Badge tone="neutral">{byStage[s].length}</Badge>
              </div>
              <div className="p-2 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin">
                {byStage[s].map((a) => (
                  <Link
                    key={a.cmid}
                    href={`/accounts/${a.cmid}`}
                    className="block rounded border border-[color:var(--color-border)] px-2 py-1.5 hover:border-[color:var(--color-brand-ink)] transition"
                  >
                    <div className="text-[12px] font-medium truncate">{a.canonicalName}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
                        {a.industryLabel ?? "—"}
                      </span>
                      {a.customerTier && (
                        <Badge tone={a.customerTier === "A" ? "lime" : "neutral"}>{a.customerTier}</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ActionList
          title="응답 없는 초청"
          icon={MessageSquareWarning}
          tone="warning"
          items={invitedNoReply.map((a) => ({
            cmid: a.cmid,
            name: a.canonicalName,
            hint: `${relTime(a.lastTouchedAt)} 접점`,
          }))}
          ctaHref="/agent/messages?purpose=Reminder"
          ctaLabel="리마인드 작성"
          emptyText="초청 후 무응답 광고주가 없습니다."
        />
        <ActionList
          title="장기 무접점 · 고가치"
          icon={AlertTriangle}
          tone="warning"
          items={idleHighValue.map((a) => ({
            cmid: a.cmid,
            name: a.canonicalName,
            hint: `관계 ${a.relationshipScore?.toFixed(0)} · ${relTime(a.lastTouchedAt)}`,
          }))}
          ctaHref="/agent/messages?purpose=Invitation"
          ctaLabel="재컨택 초안"
          emptyText="장기 무접점 고가치 광고주 없음."
        />
        <ActionList
          title="미배정 A등급"
          icon={ListChecks}
          tone="danger"
          items={noOwner.map((a) => ({
            cmid: a.cmid,
            name: a.canonicalName,
            hint: `Tier ${a.customerTier} · 담당자 없음`,
          }))}
          ctaHref="/agent/actions"
          ctaLabel="배정"
          emptyText="배정되지 않은 A등급 광고주 없음."
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-[color:var(--color-brand-ink)]" />
              Agent 추천 워크플로
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <p className="text-sm text-[color:var(--color-foreground)]/85">
              구조화된 니즈를 입력하면 Agent가 후보 발굴 → 우선순위 → 사유 →
              매칭 세션/상품 → 메시지 초안 → 다음 액션까지 한 번에 생성합니다.
            </p>
            <Link
              href="/agent/recommend"
              className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--color-brand-ink)] hover:underline"
            >
              추천 흐름 열기 →
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-[color:var(--color-brand-ink)]" />
              최근 시스템 활동
            </CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1.5 text-xs">
              <li className="flex justify-between">
                <span><CheckCircle2 className="inline size-3 text-[color:var(--color-success)] mr-1" /> 룰 customer_tier 실행 (배치)</span>
                <span className="text-[color:var(--color-muted-foreground)]">방금</span>
              </li>
              <li className="flex justify-between">
                <span><CalendarClock className="inline size-3 text-[color:var(--color-info)] mr-1" /> Salesforce 동기화 완료</span>
                <span className="text-[color:var(--color-muted-foreground)]">5분 전</span>
              </li>
              <li className="flex justify-between">
                <span><TrendingUp className="inline size-3 text-[color:var(--color-success)] mr-1" /> 광고주 관계점수 업데이트</span>
                <span className="text-[color:var(--color-muted-foreground)]">1시간 전</span>
              </li>
              <li className="flex justify-between">
                <span>📄 미팅록 7건 신규 인덱싱</span>
                <span className="text-[color:var(--color-muted-foreground)]">오늘</span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}

function ActionList({
  title,
  icon: Icon,
  tone,
  items,
  ctaHref,
  ctaLabel,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "danger" | "info";
  items: { cmid: string; name: string; hint?: string }[];
  ctaHref: string;
  ctaLabel: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn("size-4", tone === "danger" ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-warning)]")} />
          {title}
          <Badge tone="neutral" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <div className="text-xs text-[color:var(--color-muted-foreground)]">{emptyText}</div>
        ) : (
          <div className="space-y-1.5">
            {items.map((it) => (
              <Link
                key={it.cmid}
                href={`/accounts/${it.cmid}`}
                className="block rounded border border-[color:var(--color-border)] px-2.5 py-1.5 hover:border-[color:var(--color-brand-ink)] transition"
              >
                <div className="text-sm font-medium">{it.name}</div>
                {it.hint && (
                  <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">{it.hint}</div>
                )}
              </Link>
            ))}
            <Link
              href={ctaHref}
              className="block text-center text-xs font-medium text-[color:var(--color-brand-ink)] mt-1 hover:underline"
            >
              {ctaLabel} →
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
