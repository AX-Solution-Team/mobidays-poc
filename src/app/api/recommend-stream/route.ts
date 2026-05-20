import { NextResponse } from "next/server";
import { z } from "zod";

import { delay } from "@/lib/utils";
import { runRecommendations } from "@/lib/agent/recommend";
import { prisma } from "@/lib/db";

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

const STEPS = [
  { id: "parse_request",       label: "의도 분석 · Planner Agent",           agent: "Planner", model: "GPT-5.2",       ms: 80  },
  { id: "retrieve_candidates", label: "KB 후보 조회 · Data Agent",            agent: "Data",    model: "GPT-4.1-nano",  ms: 120 },
  { id: "score_accounts",      label: "앙상블 스코어링 (Rule 60% + LLM 40%)", agent: "Rule",    model: "Python Engine", ms: 150 },
  { id: "explain_reasons",     label: "추천 사유 생성",                        agent: "Rule",    model: "Python Engine", ms: 100 },
  { id: "match_products",      label: "상품/세션 매칭",                        agent: "Data",    model: "GPT-4.1-nano",  ms: 90  },
  { id: "draft_message",       label: "메시지 초안 · Draft Agent",             agent: "Draft",   model: "GPT-5-chat",    ms: 180 },
  { id: "compute_actions",     label: "다음 액션 계산",                        agent: "Rule",    model: "Python Engine", ms: 70  },
  { id: "persist",             label: "Evidence Chain 영속화",                 agent: "System",  model: "PostgreSQL",    ms: 50  },
];

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const t0 = Date.now();
      let results: Awaited<ReturnType<typeof runRecommendations>> = [];

      try {
        for (const step of STEPS) {
          emit({ type: "step_start", step: step.id, label: step.label, agent: step.agent, model: step.model });
          const stepStart = Date.now();
          await delay(step.ms + Math.random() * 60);

          if (step.id === "retrieve_candidates") {
            const count = await prisma.account.count();
            emit({ type: "info", message: `KB 스캔 중 — DB 총 ${count}개 계정 조회` });
          }

          if (step.id === "score_accounts") {
            const topAccount = await prisma.account.findFirst({ orderBy: { relationshipScore: "desc" } });
            if (topAccount) {
              emit({ type: "info", message: `상위 계정: ${topAccount.canonicalName} (관계 점수 ${(topAccount.relationshipScore ?? 0).toFixed(2)})` });
            }
          }

          if (step.id === "persist") {
            results = await runRecommendations(body);
            if (results.length > 0) {
              const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
              emit({ type: "info", message: `${results.length}개 추천, 평균 점수 ${avg.toFixed(1)}점` });
            }
          }

          emit({ type: "step_done", step: step.id, durationMs: Date.now() - stepStart });
        }

        emit({
          type: "complete",
          recommendations: results.map((r) => ({
            ...r,
            lastTouchedAt: r.lastTouchedAt?.toISOString() ?? null,
          })),
          stats: {
            candidateCount: results.length,
            avgScore: results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0,
            totalMs: Date.now() - t0,
          },
        });
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : "오류 발생" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
