import { NextResponse } from "next/server";
import { z } from "zod";

import { delay } from "@/lib/utils";
import { runRecommendations } from "@/lib/agent/recommend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  purpose: z.enum(["invite", "session_match", "followup", "next_action", "post_event"]),
  filters: z.object({
    industries: z.array(z.string()).optional(),
    budgetMinKrw: z.number().nullable().optional(),
    companySizes: z.array(z.string()).optional(),
    lastContactedWithinDays: z.number().nullable().optional(),
    hasEventHistory: z.boolean().optional(),
    excludeAccountIds: z.array(z.string()).optional(),
    excludeLeadStages: z.array(z.string()).optional(),
  }).default({}),
  topics: z.array(z.string()).optional(),
  linkedSessionIds: z.array(z.string()).optional(),
  linkedProductIds: z.array(z.string()).optional(),
  outputTypes: z.array(z.enum(["list", "reason", "strategy", "message", "action"])).default(["list", "reason"]),
  nResults: z.number().default(12),
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

  await delay(800 + Math.random() * 600);
  const results = await runRecommendations(body);
  return NextResponse.json({
    request: body,
    recommendations: results.map((r) => ({
      ...r,
      lastTouchedAt: r.lastTouchedAt?.toISOString() ?? null,
    })),
    stats: {
      candidateCount: results.length,
      avgScore: results.length
        ? results.reduce((s, r) => s + r.score, 0) / results.length
        : 0,
    },
  });
}
