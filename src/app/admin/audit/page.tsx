import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { fmtDate, safeParseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const ruleExecs = await prisma.ruleExecution.findMany({
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Governance · Audit"
        title="감사 로그 — 룰 실행 이력"
        description="모든 룰 실행은 inputs / decision / outputs 스냅샷과 함께 영속화됩니다. 재현 가능 + 책임 추적 가능."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/admin", label: "Admin" },
          { label: "감사 로그" },
        ]}
      />

      {ruleExecs.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-sm text-[color:var(--color-muted-foreground)]">
              아직 실행된 룰이 없습니다. <a href="/kb/rules" className="underline">룰 엔진 페이지</a>에서 실행해보세요.
            </div>
          </CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {ruleExecs.map((e) => {
          const inputs = safeParseJson<Record<string, unknown>>(e.inputsSnapshotJson ?? "{}", {});
          const decision = safeParseJson<Record<string, unknown>>(e.decisionJson ?? "{}", {});
          const payload = safeParseJson<{ cmid?: string; dryRun?: boolean }>(
            e.triggerPayloadJson ?? "{}",
            {},
          );
          return (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="font-mono">{e.ruleId} v{e.ruleVersion}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">{e.trigger}</Badge>
                    {payload.dryRun && <Badge tone="info">dry-run</Badge>}
                    {payload.cmid && (
                      <span className="text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
                        {payload.cmid}
                      </span>
                    )}
                    <Badge tone={e.status === "ok" ? "success" : "danger"}>{e.status}</Badge>
                    <span className="text-xs text-[color:var(--color-muted-foreground)] font-normal">
                      {fmtDate(e.startedAt, true)} · {e.latencyMs}ms
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1">
                      Inputs
                    </div>
                    <pre className="text-[11px] bg-[color:var(--color-muted)] p-2 rounded overflow-x-auto">
                      {JSON.stringify(inputs, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)] font-medium mb-1">
                      Decision
                    </div>
                    <pre className="text-[11px] bg-[color:var(--color-muted)] p-2 rounded overflow-x-auto">
                      {JSON.stringify(decision, null, 2)}
                    </pre>
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
