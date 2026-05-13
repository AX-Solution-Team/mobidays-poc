import Link from "next/link";
import { Star } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { fmtKrw, relTime, safeParseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: [
      { customerTier: "asc" },
      { relationshipScore: "desc" },
    ],
    include: {
      _count: { select: { activities: true, externalIds: true } },
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Gold / Canonical"
        title="통합 광고주 마스터"
        description="흩어진 SF · Sheet · Drive · Gmail 데이터를 하나의 CMID로 통합한 결과."
        breadcrumbs={[{ href: "/", label: "홈" }, { label: "광고주 360" }]}
      />

      <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-muted)]/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <th className="px-4 py-2.5">광고주</th>
                <th className="px-4 py-2.5">CMID / 산업</th>
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-4 py-2.5 text-right">매출(연)</th>
                <th className="px-4 py-2.5 text-right">마케팅 예산</th>
                <th className="px-4 py-2.5 text-right">관계점수</th>
                <th className="px-4 py-2.5">Lead</th>
                <th className="px-4 py-2.5 text-right">활동</th>
                <th className="px-4 py-2.5 text-right">출처 수</th>
                <th className="px-4 py-2.5">최근 접점</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const brands = safeParseJson<string[]>(a.brandNamesJson, []);
                return (
                  <tr
                    key={a.cmid}
                    className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]/30 transition"
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/accounts/${a.cmid}`} className="font-medium hover:underline">
                        {a.canonicalName}
                      </Link>
                      <div className="text-[11px] text-[color:var(--color-muted-foreground)] mt-0.5">
                        {brands.slice(0, 3).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[11px] font-mono text-[color:var(--color-muted-foreground)]">
                        {a.cmid}
                      </div>
                      <div className="text-xs mt-0.5">{a.industryLabel ?? "—"}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={a.customerTier === "A" ? "lime" : a.customerTier === "B" ? "info" : "neutral"}>
                        {a.customerTier ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                      {fmtKrw(a.annualRevenueKrw)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                      {fmtKrw(a.marketingBudgetKrw)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-0.5 tabular-nums text-xs">
                        <Star className="size-3 text-[color:var(--color-warning)]" />
                        {a.relationshipScore?.toFixed(0) ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[color:var(--color-muted-foreground)]">
                      {a.leadStage ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                      {a._count.activities}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                      {a._count.externalIds}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[color:var(--color-muted-foreground)]">
                      {relTime(a.lastTouchedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
