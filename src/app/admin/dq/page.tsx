import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { fmtDate, fmtPct, safeParseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DqPage() {
  const runs = await prisma.dqRun.findMany({
    orderBy: { runAt: "desc" },
  });

  const totalSuites = runs.length;
  const passing = runs.filter((r) => r.status === "passed").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Governance · Data Quality"
        title="데이터 품질 모니터"
        description="Great Expectations 스타일 expectation suite를 source/silver/gold 각 계층에 배치하고 결과를 추적합니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/admin", label: "Admin" },
          { label: "데이터 품질" },
        ]}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="실행된 Suite" value={totalSuites} />
        <Stat
          label="완전 통과"
          value={passing}
          tone={passing === totalSuites ? "success" : "warning"}
        />
        <Stat
          label="경고 / 실패"
          value={totalSuites - passing}
          tone={totalSuites - passing > 0 ? "warning" : "success"}
        />
      </div>

      <div className="space-y-4">
        {runs.map((r) => {
          const metrics = safeParseJson<Record<string, unknown>>(r.metricsJson, {});
          const breaches = safeParseJson<{ field: string; issue: string }[]>(
            r.breachesJson ?? "[]",
            [],
          );
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {r.status === "passed" ? (
                    <CheckCircle2 className="size-4 text-[color:var(--color-success)]" />
                  ) : (
                    <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
                  )}
                  <span className="font-mono">{r.suite}</span>
                  <span className="ml-auto text-xs font-normal text-[color:var(--color-muted-foreground)]">
                    {fmtDate(r.runAt, true)}
                  </span>
                  <Badge tone={r.status === "passed" ? "success" : "warning"}>
                    {r.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-semibold mb-1.5">메트릭</div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(metrics).map(([k, v]) => (
                        <KV key={k} k={k} v={v} />
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs font-semibold mb-1.5">위반 / 경고</div>
                    {breaches.length === 0 ? (
                      <div className="text-xs text-[color:var(--color-muted-foreground)]">
                        위반 없음
                      </div>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {breaches.map((b, i) => (
                          <li
                            key={i}
                            className="rounded border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning-bg)]/40 px-3 py-2"
                          >
                            <span className="font-mono text-[color:var(--color-warning)] mr-2">
                              {b.field}
                            </span>
                            {b.issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium">
        {label}
      </div>
      <div
        className={
          tone === "success"
            ? "text-2xl font-semibold mt-1 text-[color:var(--color-success)]"
            : tone === "warning"
              ? "text-2xl font-semibold mt-1 text-[color:var(--color-warning)]"
              : "text-2xl font-semibold mt-1"
        }
      >
        {value}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: unknown }) {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return (
      <div>
        <div className="text-[color:var(--color-muted-foreground)] font-mono">{k}</div>
        <div className="pl-3 space-y-0.5 mt-0.5">
          {Object.entries(v as Record<string, unknown>).map(([sk, sv]) => (
            <div key={sk} className="flex justify-between gap-3">
              <span className="text-[color:var(--color-muted-foreground)] font-mono">{sk}</span>
              <span className="tabular-nums">
                {typeof sv === "number" && sv < 1 ? fmtPct(sv) : String(sv)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[color:var(--color-muted-foreground)] font-mono">{k}</span>
      <span className="tabular-nums">{String(v)}</span>
    </div>
  );
}
