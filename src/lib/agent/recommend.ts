// Sales Agent recommendation engine (mock LLM).
//   Mirrors the spec's Rule Score (60%) + LLM Score (40%) ensemble,
//   but the LLM score is heuristically computed for the demo.

import { prisma } from "@/lib/db";
import { safeParseJson } from "@/lib/utils";

export interface RecommendFilter {
  industries?: string[];
  budgetMinKrw?: number | null;
  companySizes?: string[];
  lastContactedWithinDays?: number | null;
  hasEventHistory?: boolean;
  excludeAccountIds?: string[];
  excludeLeadStages?: string[];
}

export interface RecommendRequest {
  purpose:
    | "invite"
    | "session_match"
    | "followup"
    | "next_action"
    | "post_event";
  filters: RecommendFilter;
  topics?: string[];
  linkedSessionIds?: string[];
  linkedProductIds?: string[];
  outputTypes: Array<"list" | "reason" | "strategy" | "message" | "action">;
  nResults?: number;
}

export interface RecommendReason {
  type: string;
  evidence: string;
  weight: number;
}

export interface RecommendedAccount {
  cmid: string;
  canonicalName: string;
  industryLabel: string | null;
  customerTier: string | null;
  annualRevenueKrw: number | null;
  marketingBudgetKrw: number | null;
  relationshipScore: number | null;
  lastTouchedAt: Date | null;
  leadStage: string | null;
  rank: number;
  score: number;
  ruleScore: number;
  llmScore: number;
  reasons: RecommendReason[];
  matchedProducts: { id: string; name: string; rationale: string }[];
  matchedSessions: { id: string; title: string; rationale: string }[];
  strategy: string;
  evidenceChunkIds: string[];
}

const RULE_WEIGHTS = {
  industry: 20,
  budget: 15,
  relationship: 15,
  recency: 10,
  eventHistory: 10,
  topicMatch: 15,
  decisionMaker: 10,
  pipeline: 5,
};

export async function runRecommendations(
  req: RecommendRequest,
): Promise<RecommendedAccount[]> {
  const n = Math.min(req.nResults ?? 20, 50);
  const where = {
    AND: [
      req.filters.industries && req.filters.industries.length > 0
        ? { industryLabel: { in: req.filters.industries } }
        : {},
      req.filters.companySizes && req.filters.companySizes.length > 0
        ? { companySize: { in: req.filters.companySizes } }
        : {},
      req.filters.budgetMinKrw
        ? { marketingBudgetKrw: { gte: BigInt(req.filters.budgetMinKrw) } }
        : {},
      req.filters.excludeAccountIds && req.filters.excludeAccountIds.length > 0
        ? { cmid: { notIn: req.filters.excludeAccountIds } }
        : {},
      req.filters.excludeLeadStages && req.filters.excludeLeadStages.length > 0
        ? { NOT: { leadStage: { in: req.filters.excludeLeadStages } } }
        : {},
    ],
  };

  const candidates = await prisma.account.findMany({
    where,
    take: 100,
    include: {
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 3,
      },
      contacts: {
        where: { isPrimary: true },
        take: 2,
      },
      events: {
        orderBy: { invitedAt: "desc" },
        take: 5,
      },
    },
  });

  const products = await prisma.product.findMany({ take: 30 });
  const sessions = await prisma.session.findMany({ take: 30 });

  const ranked: RecommendedAccount[] = candidates.map((a) => {
    const reasons: RecommendReason[] = [];
    let ruleScore = 0;
    const topics = req.topics ?? [];

    // Industry fit
    if (req.filters.industries?.includes(a.industryLabel ?? "")) {
      ruleScore += RULE_WEIGHTS.industry;
      reasons.push({
        type: "industry_fit",
        evidence: `${a.industryLabel} 산업군 — 요청 조건과 일치`,
        weight: RULE_WEIGHTS.industry,
      });
    }
    // Budget fit
    if (
      a.marketingBudgetKrw != null &&
      req.filters.budgetMinKrw &&
      Number(a.marketingBudgetKrw) >= req.filters.budgetMinKrw
    ) {
      ruleScore += RULE_WEIGHTS.budget;
      reasons.push({
        type: "budget_fit",
        evidence: `마케팅 예산 ${formatKrwShort(Number(a.marketingBudgetKrw))} — ICP 적합`,
        weight: RULE_WEIGHTS.budget,
      });
    }
    // Relationship score
    if (a.relationshipScore != null) {
      const r = (a.relationshipScore / 100) * RULE_WEIGHTS.relationship;
      ruleScore += r;
      reasons.push({
        type: "relationship",
        evidence: `관계 강도 ${a.relationshipScore.toFixed(0)} / 100`,
        weight: r,
      });
    }
    // Recency
    if (a.lastTouchedAt) {
      const days =
        (Date.now() - a.lastTouchedAt.getTime()) / (1000 * 60 * 60 * 24);
      let v = 0;
      if (days <= 30) v = RULE_WEIGHTS.recency;
      else if (days <= 90) v = RULE_WEIGHTS.recency * 0.6;
      else if (days <= 180) v = RULE_WEIGHTS.recency * 0.3;
      ruleScore += v;
      if (v > 0) {
        reasons.push({
          type: "recency",
          evidence: `최근 접점 ${Math.round(days)}일 전`,
          weight: v,
        });
      }
    }
    // Event history (attended past Mobidays events)
    const eventCount = a.events.filter((e) => e.status === "Attended").length;
    if (eventCount > 0) {
      const v = Math.min(eventCount, 2) * (RULE_WEIGHTS.eventHistory / 2);
      ruleScore += v;
      reasons.push({
        type: "event_history",
        evidence: `과거 모비데이즈 행사 ${eventCount}회 참석`,
        weight: v,
      });
    }
    // Topic match — text search over recent activities
    if (topics.length > 0) {
      let hit = 0;
      const evidenceLines: string[] = [];
      for (const act of a.activities) {
        const text = `${act.subject ?? ""} ${act.body ?? ""}`;
        for (const t of topics) {
          if (text.includes(t)) {
            hit++;
            evidenceLines.push(
              `${formatDate(act.occurredAt)} 미팅에서 "${t}" 언급`,
            );
            break;
          }
        }
      }
      if (hit > 0) {
        const v = Math.min(hit, 3) * (RULE_WEIGHTS.topicMatch / 3);
        ruleScore += v;
        reasons.push({
          type: "recent_topic",
          evidence: evidenceLines.slice(0, 2).join("; ") + (evidenceLines.length > 2 ? " …" : ""),
          weight: v,
        });
      }
    }
    // Decision-maker contact
    if (a.contacts.some((c) => ["C-Level", "VP", "Director"].includes(c.seniority ?? ""))) {
      ruleScore += RULE_WEIGHTS.decisionMaker;
      reasons.push({
        type: "decision_maker",
        evidence: `의사결정자급 컨택 확보`,
        weight: RULE_WEIGHTS.decisionMaker,
      });
    }
    // Pipeline (proposals exist)
    // (Skipping live query inside this map for perf — would be computed in seed)

    // LLM score (mock) — pick a deterministic value derived from cmid
    const llmScore = mockLLMScore(a.cmid, ruleScore, topics);
    if (llmScore > 70) {
      reasons.push({
        type: "llm_judgment",
        evidence: `LLM 종합 판단: 현재 시장 시그널 + 자사 시나리오 적합도 양호`,
        weight: (llmScore - 70) / 3,
      });
    }

    const final = Math.round(ruleScore * 0.6 + llmScore * 0.4);

    // Match products & sessions (topic-based)
    const matchedProducts = topics.length
      ? products
          .filter((p) => {
            const tags = safeParseJson<string[]>(p.fitTopicsJson, []);
            return tags.some((t) => topics.includes(t));
          })
          .slice(0, 2)
          .map((p) => ({
            id: p.id,
            name: p.name,
            rationale: `요청 주제와 ${
              safeParseJson<string[]>(p.fitTopicsJson, [])
                .filter((t) => topics.includes(t))
                .join(", ")
            } 부합`,
          }))
      : [];

    const matchedSessions = topics.length
      ? sessions
          .filter((s) => {
            const tags = safeParseJson<string[]>(s.targetTopicsJson, []);
            return tags.some((t) => topics.includes(t));
          })
          .slice(0, 2)
          .map((s) => ({
            id: s.id,
            title: s.title,
            rationale: `세션 타겟 토픽 매칭`,
          }))
      : [];

    return {
      cmid: a.cmid,
      canonicalName: a.canonicalName,
      industryLabel: a.industryLabel,
      customerTier: a.customerTier,
      annualRevenueKrw: a.annualRevenueKrw != null ? Number(a.annualRevenueKrw) : null,
      marketingBudgetKrw:
        a.marketingBudgetKrw != null ? Number(a.marketingBudgetKrw) : null,
      relationshipScore: a.relationshipScore,
      lastTouchedAt: a.lastTouchedAt,
      leadStage: a.leadStage,
      rank: 0,
      score: final,
      ruleScore: Math.round(ruleScore),
      llmScore: Math.round(llmScore),
      reasons,
      matchedProducts,
      matchedSessions,
      strategy: buildStrategy(a.canonicalName, reasons, topics),
      evidenceChunkIds: a.activities.map((x) => x.id).slice(0, 3),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => (r.rank = i + 1));
  return ranked.slice(0, n);
}

function mockLLMScore(cmid: string, ruleScore: number, topics: string[]): number {
  // Deterministic-but-feels-AI: based on cmid hash + ruleScore + topic count
  let hash = 0;
  for (let i = 0; i < cmid.length; i++) hash = (hash * 31 + cmid.charCodeAt(i)) | 0;
  const noise = Math.abs(hash % 25) - 12;
  return Math.max(40, Math.min(96, Math.round(ruleScore * 0.7 + topics.length * 6 + noise + 35)));
}

function buildStrategy(
  name: string,
  reasons: RecommendReason[],
  topics: string[],
): string {
  const lines: string[] = [];
  if (topics.length > 0) {
    lines.push(`${name}의 최근 ${topics[0]} 관련 관심을 기반으로 접근`);
  } else {
    lines.push(`${name}에 대해 표준 디스커버리 미팅 제안`);
  }
  const relReason = reasons.find((r) => r.type === "relationship");
  if (relReason && relReason.weight > 8) {
    lines.push(`기존 관계가 견고 → 기존 컨택을 통해 직접 미팅 요청`);
  } else {
    lines.push(`신규 컨택 발굴 필요 → LinkedIn / 행사 부스 유입 유도`);
  }
  const evtReason = reasons.find((r) => r.type === "event_history");
  if (evtReason) lines.push(`과거 행사 참석 이력을 인용한 친근한 톤 사용`);
  return lines.join(". ") + ".";
}

function formatKrwShort(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억`;
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(0)}만`;
  return `${n.toLocaleString()}원`;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
