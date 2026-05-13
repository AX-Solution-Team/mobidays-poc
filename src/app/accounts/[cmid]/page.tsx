import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity as ActivityIcon,
  Building2,
  CalendarClock,
  CircleUser,
  Globe,
  MailOpen,
  Star,
  Tag,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceTag } from "@/components/ui/source-tag";
import { prisma } from "@/lib/db";
import { fmtDate, fmtKrw, relTime, safeParseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ cmid: string }>;
}) {
  const { cmid } = await params;
  const account = await prisma.account.findUnique({
    where: { cmid },
    include: {
      aliases: { orderBy: { aliasType: "asc" } },
      externalIds: { orderBy: { sourceSystem: "asc" } },
      contacts: { orderBy: [{ isPrimary: "desc" }] },
      activities: { orderBy: { occurredAt: "desc" }, take: 20 },
      proposals: { orderBy: { submittedAt: "desc" } },
      biddings: { orderBy: { issuedAt: "desc" } },
      events: true,
    },
  });
  if (!account) notFound();

  const brands = safeParseJson<string[]>(account.brandNamesJson, []);
  const lineage = safeParseJson<Record<string, unknown>>(account.lineageJson, {});

  return (
    <AppShell>
      <PageHeader
        eyebrow="Gold / Canonical · CMID"
        title={
          <span className="flex items-center gap-3">
            {account.canonicalName}
            {account.customerTier && (
              <Badge tone={account.customerTier === "A" ? "lime" : "info"}>
                Tier {account.customerTier}
              </Badge>
            )}
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {account.cmid} ·{" "}
            {account.businessNo
              ? `사업자번호 ${account.businessNo}`
              : "사업자번호 미확인"}
            {account.dartCorpCode && ` · DART ${account.dartCorpCode}`}
          </span>
        }
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/accounts", label: "광고주 360" },
          { label: account.canonicalName },
        ]}
        actions={
          <Link
            href={`/agent/recommend?cmid=${account.cmid}`}
            className="inline-flex items-center gap-1.5 bg-[color:var(--color-brand-ink)] text-white px-3 h-9 rounded-md font-medium text-sm hover:bg-[color:var(--color-brand-ink-2)]"
          >
            <Star className="size-3.5" /> Agent에 추천 요청
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <KvCard icon={Building2} label="산업" value={`${account.industryLabel ?? "—"} · ${account.companySize ?? "—"}`} />
        <KvCard icon={TrendingUp} label="연 매출" value={fmtKrw(account.annualRevenueKrw)} />
        <KvCard icon={Tag} label="마케팅 예산" value={fmtKrw(account.marketingBudgetKrw)} />
        <KvCard
          icon={Star}
          label="관계 점수"
          value={
            <span className="flex items-center gap-1">
              {account.relationshipScore?.toFixed(0) ?? "—"} / 100
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          {/* Aliases + brands */}
          <Card>
            <CardHeader>
              <CardTitle>별칭 · 표기</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b, i) => (
                  <Badge key={i} tone="neutral">{b}</Badge>
                ))}
                {account.legalName && <Badge tone="info">법인명: {account.legalName}</Badge>}
                {brands.length === 0 && account.aliases.length === 0 && (
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">없음</span>
                )}
              </div>
              {account.aliases.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {account.aliases.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs flex items-center justify-between rounded border border-[color:var(--color-border)] px-2 py-1.5"
                    >
                      <span>{a.alias}</span>
                      <Badge tone="neutral">{a.aliasType}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* External IDs */}
          <Card>
            <CardHeader>
              <CardTitle>외부 ID 매핑 — {account.externalIds.length}건</CardTitle>
            </CardHeader>
            <CardBody>
              {account.externalIds.length === 0 ? (
                <div className="text-xs text-[color:var(--color-muted-foreground)]">
                  연결된 외부 레코드가 없습니다.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {account.externalIds.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded border border-[color:var(--color-border)] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <SourceTag system={e.sourceSystem} size="sm" />
                        <span className="font-mono text-[11px] text-[color:var(--color-muted-foreground)]">
                          {e.sourceRecordId}
                        </span>
                        {e.sourceName && <span className="text-xs">— {e.sourceName}</span>}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted-foreground)] tabular-nums">
                        conf {(e.confidence ?? 1).toFixed(2)} · {e.linkedBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Activities timeline */}
          <Card>
            <CardHeader>
              <CardTitle>활동 타임라인 — 최근 {account.activities.length}건</CardTitle>
            </CardHeader>
            <CardBody>
              {account.activities.length === 0 ? (
                <div className="text-xs text-[color:var(--color-muted-foreground)]">없음</div>
              ) : (
                <ol className="space-y-3">
                  {account.activities.map((a) => {
                    const topics = safeParseJson<string[]>(a.topicsJson, []);
                    return (
                      <li key={a.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-[color:var(--color-muted-foreground)] uppercase tracking-wider">
                            {fmtDate(a.occurredAt).slice(5)}
                          </span>
                          <div className="size-2 rounded-full bg-[color:var(--color-brand-ink)] mt-1" />
                          <div className="flex-1 w-px bg-[color:var(--color-border)] my-1" />
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge tone={a.type === "Meeting" ? "lime" : "info"}>{a.type}</Badge>
                            {a.sourceSystem && <SourceTag system={a.sourceSystem} />}
                            <span className="text-sm font-medium">{a.subject ?? "—"}</span>
                            <span className="text-[10px] text-[color:var(--color-muted-foreground)] ml-auto">
                              {relTime(a.occurredAt)}
                            </span>
                          </div>
                          {a.bodySummary && (
                            <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                              {a.bodySummary}
                            </p>
                          )}
                          {topics.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {topics.map((t) => (
                                <Badge key={t} tone="neutral">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주요 컨택</CardTitle>
            </CardHeader>
            <CardBody>
              {account.contacts.length === 0 ? (
                <div className="text-xs text-[color:var(--color-muted-foreground)]">컨택 정보 없음</div>
              ) : (
                <div className="space-y-2">
                  {account.contacts.map((c) => (
                    <div
                      key={c.pmid}
                      className="flex items-center gap-3 rounded border border-[color:var(--color-border)] px-3 py-2"
                    >
                      <CircleUser className="size-5 text-[color:var(--color-muted-foreground)]" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {c.fullName}
                          {c.isPrimary && <Badge tone="lime">primary</Badge>}
                        </div>
                        <div className="text-[11px] text-[color:var(--color-muted-foreground)]">
                          {c.title ?? ""} · {c.seniority ?? ""}
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-[color:var(--color-info)] mt-0.5 flex items-center gap-1">
                            <MailOpen className="size-3" />
                            {maskEmail(c.email)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>제안 이력</CardTitle>
            </CardHeader>
            <CardBody>
              {account.proposals.length === 0 ? (
                <div className="text-xs text-[color:var(--color-muted-foreground)]">없음</div>
              ) : (
                <div className="space-y-1.5">
                  {account.proposals.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded border border-[color:var(--color-border)] px-3 py-2 text-sm"
                    >
                      <Badge tone={p.outcome === "Won" ? "success" : p.outcome === "Lost" ? "danger" : "neutral"}>
                        {p.outcome}
                      </Badge>
                      <span className="flex-1 truncate">{p.title}</span>
                      <span className="text-[11px] text-[color:var(--color-muted-foreground)] tabular-nums">
                        {fmtKrw(p.amountKrw)} · {fmtDate(p.submittedAt).slice(2, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {account.biddings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>비딩 캘린더</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1.5">
                {account.biddings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded border border-[color:var(--color-border)] px-3 py-2 text-sm"
                  >
                    <Badge tone={b.status === "Joined" ? "success" : b.status === "Reviewing" ? "warning" : "neutral"}>
                      {b.status}
                    </Badge>
                    <span className="flex-1 truncate">{b.title}</span>
                    <span className="text-[11px] text-[color:var(--color-muted-foreground)] tabular-nums">
                      {fmtKrw(b.estimatedAmountKrw)} · D-{Math.ceil(
                        ((b.deadline?.getTime() ?? Date.now()) - Date.now()) / (1000 * 60 * 60 * 24),
                      )}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {account.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>행사 초청 / 참석</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1.5">
                {account.events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded border border-[color:var(--color-border)] px-3 py-2 text-sm"
                  >
                    <CalendarClock className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                    <Badge tone={e.status === "Confirmed" ? "success" : "info"}>
                      {e.status}
                    </Badge>
                    <span className="text-xs">{fmtDate(e.invitedAt)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lineage · 신선도</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[color:var(--color-muted-foreground)]">마지막 접점</span>
                  <span className="font-medium">{relTime(account.lastTouchedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--color-muted-foreground)]">광고주 신뢰도 (_confidence)</span>
                  <span className="font-medium tabular-nums">{((account.confidence ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--color-muted-foreground)]">웹사이트</span>
                  <span className="font-mono text-xs flex items-center gap-1">
                    <Globe className="size-3" />
                    {account.domainRoot ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--color-muted-foreground)]">최종 수정</span>
                  <span className="font-medium">{fmtDate(account.updatedAt, true)}</span>
                </div>
                {Object.keys(lineage).length > 0 && (
                  <pre className="mt-2 bg-[color:var(--color-muted)] text-[10px] p-2 rounded">
                    {JSON.stringify(lineage, null, 2)}
                  </pre>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function KvCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium flex items-center gap-1">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-lg font-semibold tracking-tight mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function maskEmail(s: string): string {
  const [local, domain] = s.split("@");
  if (!domain) return s;
  return `${local[0] ?? ""}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}
