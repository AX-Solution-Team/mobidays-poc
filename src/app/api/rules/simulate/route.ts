import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { runRule } from "@/lib/rules/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ruleId: z.string().optional(),
  yaml: z.string().optional(),
  industryFilter: z.string().optional(),
  limit: z.number().default(40),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "잘못된 요청" },
      { status: 400 },
    );
  }

  let yamlText: string | undefined = body.yaml;
  if (!yamlText && body.ruleId) {
    const r = await prisma.ruleDefinition.findUnique({ where: { id: body.ruleId } });
    if (!r) return NextResponse.json({ error: "rule not found" }, { status: 404 });
    yamlText = r.yaml;
  }
  if (!yamlText) {
    return NextResponse.json({ error: "yaml 또는 ruleId 중 하나가 필요합니다" }, { status: 400 });
  }

  const accounts = await prisma.account.findMany({
    where: body.industryFilter ? { industryLabel: body.industryFilter } : undefined,
    take: body.limit,
    select: {
      cmid: true,
      canonicalName: true,
      customerTier: true,
      industryLabel: true,
    },
  });

  const before: Record<string, string | null> = {};
  for (const a of accounts) before[a.cmid] = a.customerTier;

  const results = [];
  for (const a of accounts) {
    const r = await runRule(yamlText, { cmid: a.cmid }, {
      trigger: "simulate",
      dryRun: true,
    });
    results.push({
      cmid: a.cmid,
      canonicalName: a.canonicalName,
      industry: a.industryLabel,
      currentTier: a.customerTier,
      decision: r.decision,
      latencyMs: r.latencyMs,
    });
  }

  const distribution: Record<string, number> = {};
  const changes: { cmid: string; name: string; from: string | null; to: unknown }[] = [];
  for (const r of results) {
    const newTier =
      typeof r.decision === "object" && r.decision !== null
        ? (r.decision as Record<string, unknown>).customer_tier
        : null;
    const tierKey = newTier ? String(newTier) : "?";
    distribution[tierKey] = (distribution[tierKey] ?? 0) + 1;
    if (newTier && newTier !== r.currentTier) {
      changes.push({
        cmid: r.cmid,
        name: r.canonicalName,
        from: r.currentTier,
        to: newTier,
      });
    }
  }

  return NextResponse.json({
    total: results.length,
    distribution,
    changes,
    sample: results.slice(0, 12),
  });
}
