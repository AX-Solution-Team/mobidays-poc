import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Handshake,
  Mail,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { fmtDate, relTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTION_DEFS = [
  {
    key: "invited_no_reply",
    title: "초청 후 7일 무응답 — 리마인드 필요",
    icon: Mail,
    tone: "warning",
    priority: 2,
    actionLabel: "리마인드 작성",
    purpose: "Reminder",
    description:
      "lead_stage = Invited 상태로 7일 이상 경과한 광고주. customer_tier 룰에 따라 자동 산정.",
  },
  {
    key: "idle_high_value",
    title: "고가치 광고주 장기 무접점 — 재컨택",
    icon: Clock,
    tone: "warning",
    priority: 2,
    actionLabel: "재컨택 메일",
    purpose: "Invitation",
    description: "관계점수 ≥ 60, 마지막 접점 60일 이상.",
  },
  {
    key: "unassigned_a",
    title: "A등급 미배정 — 담당자 배정",
    icon: UserCheck,
    tone: "danger",
    priority: 1,
    actionLabel: "담당자 배정",
    purpose: null,
    description: "customer_tier = A, owner_user_id = NULL.",
  },
  {
    key: "confirmed_no_meet",
    title: "참석 확정 후 미팅 미설정",
    icon: Handshake,
    tone: "info",
    priority: 3,
    actionLabel: "미팅 제안",
    purpose: "FollowUp",
    description: "Confirmed 상태이나 향후 30일 내 Meeting 활동 없음.",
  },
] as const;

export default async function ActionsPage() {
  const accounts = await prisma.account.findMany({
    select: {
      cmid: true,
      canonicalName: true,
      industryLabel: true,
      customerTier: true,
      ownerUserId: true,
      leadStage: true,
      relationshipScore: true,
      lastTouchedAt: true,
      marketingBudgetKrw: true,
    },
  });

  const now = Date.now();
  const buckets = {
    invited_no_reply: accounts.filter(
      (a) =>
        a.leadStage === "Invited" &&
        a.lastTouchedAt &&
        (now - a.lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24) >= 7,
    ),
    idle_high_value: accounts.filter(
      (a) =>
        (a.relationshipScore ?? 0) >= 60 &&
        a.lastTouchedAt &&
        (now - a.lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24) >= 60,
    ),
    unassigned_a: accounts.filter(
      (a) => a.customerTier === "A" && !a.ownerUserId,
    ),
    confirmed_no_meet: accounts.filter((a) => a.leadStage === "Confirmed"),
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales Solution Agent"
        title="다음 액션 큐"
        description="룰 엔진이 KB 상태를 스캔하여 자동 생성한 액션. Cron (매일 04:00 KST) + 이벤트 트리거로 실시간 갱신."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/agent", label: "Agent" },
          { label: "액션 큐" },
        ]}
      />

      <div className="space-y-4">
        {ACTION_DEFS.map((def) => {
          const items = buckets[def.key as keyof typeof buckets];
          const Icon = def.icon;
          return (
            <Card key={def.key}>
              <CardBody>
                <div className="flex items-start gap-3 pb-3 mb-3 border-b border-[color:var(--color-border)]">
                  <div
                    className={
                      def.tone === "danger"
                        ? "size-9 rounded-md bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger)] flex items-center justify-center"
                        : def.tone === "info"
                          ? "size-9 rounded-md bg-[color:var(--color-info-bg)] text-[color:var(--color-info)] flex items-center justify-center"
                          : "size-9 rounded-md bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)] flex items-center justify-center"
                    }
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{def.title}</span>
                      <Badge tone={def.tone as "warning"}>P{def.priority}</Badge>
                      <Badge tone="neutral">{items.length}건</Badge>
                    </div>
                    <p className="text-xs text-[color:var(--color-muted-foreground)] mt-1">
                      {def.description}
                    </p>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="text-xs text-[color:var(--color-muted-foreground)]">
                    해당 액션이 필요한 광고주가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.slice(0, 6).map((a) => (
                      <div
                        key={a.cmid}
                        className="flex items-center gap-3 rounded-md border border-[color:var(--color-border)] px-3 py-2 hover:border-[color:var(--color-brand-ink)] transition"
                      >
                        <div className="flex-1 min-w-0">
                          <Link href={`/accounts/${a.cmid}`} className="font-medium text-sm hover:underline">
                            {a.canonicalName}
                          </Link>
                          <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">
                            {a.industryLabel ?? "—"} · {a.leadStage ?? "—"} · 접점 {relTime(a.lastTouchedAt)}
                          </div>
                        </div>
                        {a.customerTier && (
                          <Badge tone={a.customerTier === "A" ? "lime" : "info"}>{a.customerTier}</Badge>
                        )}
                        {def.purpose ? (
                          <Link
                            href={`/agent/messages?cmid=${a.cmid}&purpose=${def.purpose}`}
                            className="inline-flex items-center gap-1 text-xs bg-[color:var(--color-brand-ink)] text-white px-2.5 h-7 rounded-md hover:bg-[color:var(--color-brand-ink-2)]"
                          >
                            {def.actionLabel}
                          </Link>
                        ) : (
                          <Link
                            href={`/accounts/${a.cmid}`}
                            className="inline-flex items-center gap-1 text-xs border border-[color:var(--color-border)] px-2.5 h-7 rounded-md hover:bg-[color:var(--color-muted)]"
                          >
                            {def.actionLabel}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
