import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecommendBody {
  purpose: string;
  topK?: number;
}

function parseBody(raw: unknown): RecommendBody {
  if (!raw || typeof raw !== "object") throw new Error("body must be an object");
  const obj = raw as Record<string, unknown>;
  if (typeof obj.purpose !== "string" || obj.purpose.trim() === "") {
    throw new Error("purpose is required (string)");
  }
  const topK = obj.topK !== undefined ? Number(obj.topK) : undefined;
  if (topK !== undefined && (!Number.isFinite(topK) || topK < 1)) {
    throw new Error("topK must be a positive integer");
  }
  return { purpose: obj.purpose.trim(), topK };
}

export async function POST(req: Request) {
  let body: RecommendBody;
  try {
    body = parseBody(await req.json());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "잘못된 요청" },
      { status: 400 },
    );
  }

  const { purpose, topK = 5 } = body;

  const accounts = await prisma.account.findMany({
    include: {
      activities: { orderBy: { occurredAt: "desc" }, take: 3 },
      scores: { orderBy: { snapshotAt: "desc" }, take: 1 },
      contacts: { where: { isPrimary: true }, take: 1 },
    },
    where: { leadStage: { not: "Won" } },
    take: 50,
  });

  const now = Date.now();

  const scored = accounts.map((acc) => {
    const reasons: string[] = [];

    // base
    let score = acc.relationshipScore ?? 0.5;

    // tier bonus
    const tier = acc.customerTier ?? "";
    if (tier === "A") { score += 0.3; reasons.push("Tier A 고객 (+0.3)"); }
    else if (tier === "B") { score += 0.15; reasons.push("Tier B 고객 (+0.15)"); }
    else if (tier === "C") { score += 0.05; reasons.push("Tier C 고객 (+0.05)"); }

    // recency bonus
    const lastActivity = acc.activities[0]?.occurredAt ?? null;
    if (lastActivity) {
      const diffDays = (now - new Date(lastActivity).getTime()) / 86400000;
      if (diffDays < 30) { score += 0.1; reasons.push("최근 30일 내 접촉 (+0.1)"); }
      else if (diffDays < 90) { score += 0.05; reasons.push("최근 90일 내 접촉 (+0.05)"); }
    }

    // purpose match
    const stage = acc.leadStage ?? "";
    if (purpose === "invite" && ["Identified", "Invited"].includes(stage)) {
      score += 0.1;
      reasons.push("초청 적합 단계 (+0.1)");
    } else if (purpose === "followup" && ["Met", "Confirmed"].includes(stage)) {
      score += 0.1;
      reasons.push("팔로업 적합 단계 (+0.1)");
    }

    // clamp
    score = Math.max(0, Math.min(1, score));

    const primaryContact = acc.contacts[0] ?? null;

    return {
      cmid: acc.cmid,
      canonicalName: acc.canonicalName,
      score,
      tier: acc.customerTier ?? null,
      leadStage: acc.leadStage ?? null,
      reasons,
      contact: primaryContact
        ? { name: primaryContact.fullName, title: primaryContact.title ?? null }
        : null,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, topK);

  return NextResponse.json(results);
}
