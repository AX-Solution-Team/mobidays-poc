export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Tier = "Gold" | "Silver" | "Bronze";
type EdgeType = "domain" | "normalized_name" | "embedding" | "contact_overlap";

interface GraphNode {
  id: string;
  label: string;
  source: string;
  tier: Tier;
  x: number;
  y: number;
  canonical?: boolean;
  cmid?: string;
  cluster?: number;
  separated?: boolean;
  separationReason?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  label: string;
}

function edgeTypeForSource(sourceSystem: string): EdgeType {
  if (sourceSystem === "Drive" || sourceSystem === "Gmail") return "domain";
  if (sourceSystem.startsWith("Sheet")) return "normalized_name";
  return "embedding";
}

function edgeLabelForType(type: EdgeType): string {
  switch (type) {
    case "domain": return "도메인 일치";
    case "normalized_name": return "정규화 이름 일치";
    case "embedding": return "임베딩 유사도";
    case "contact_overlap": return "거래처 겹침";
  }
}

function tierForSource(sourceSystem: string): Tier {
  if (sourceSystem === "Salesforce" || sourceSystem.startsWith("Sheet")) return "Silver";
  return "Bronze";
}

// Top 8 focus CMIDs for demo — 2-row grid layout
const FOCUS_CMIDS = [
  "mb_acc_samsung",
  "mb_acc_samsungheavy",
  "mb_acc_samsungsds",
  "mb_acc_hyundai",
  "mb_acc_kakao",
  "mb_acc_coupang",
  "mb_acc_naver",
  "mb_acc_lge",
];

// 2-row grid: row1 = indices 0-3 (y=200), row2 = indices 4-7 (y=500)
// Canvas width ~900, inter-cluster spacing 200px
function computePositions(
  accounts: { cmid: string }[],
  externalIds: { id: string; cmid: string }[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeRadius = 80;
  const colSpacing = 200;
  const row1Y = 200;
  const row2Y = 500;
  const startX = 110;

  accounts.forEach((acc, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = startX + col * colSpacing;
    const cy = row === 0 ? row1Y : row2Y;

    positions.set(acc.cmid, { x: cx, y: cy });

    const siblings = externalIds.filter((e) => e.cmid === acc.cmid);
    siblings.forEach((ext, j) => {
      const sibAngle = (2 * Math.PI * j) / Math.max(siblings.length, 1);
      positions.set(ext.id, {
        x: cx + nodeRadius * Math.cos(sibAngle),
        y: cy + nodeRadius * Math.sin(sibAngle),
      });
    });
  });

  return positions;
}

// Static demo data fallback
const FALLBACK = {
  nodes: [
    { id: "sf_001", label: "삼성 전자", source: "Salesforce", tier: "Silver" as Tier, x: 220, y: 160, cluster: 1 },
    { id: "sh_001", label: "삼성전자(주)", source: "G-Sheet", tier: "Silver" as Tier, x: 380, y: 100, cluster: 1 },
    { id: "dc_001", label: "Samsung Electronics", source: "Drive Doc", tier: "Bronze" as Tier, x: 500, y: 180, cluster: 1 },
    { id: "mb_001", label: "삼성전자", source: "Canon (CMID)", tier: "Gold" as Tier, x: 360, y: 270, canonical: true, cmid: "CMID-0001", cluster: 1 },
    { id: "sf_002", label: "네오플라이트 스튜디오", source: "Salesforce", tier: "Silver" as Tier, x: 130, y: 380, cluster: 2 },
    { id: "dc_002", label: "NeoFlight Studios", source: "Drive Doc", tier: "Bronze" as Tier, x: 270, y: 420, cluster: 2 },
    { id: "mb_002", label: "네오플라이트", source: "Canon (CMID)", tier: "Gold" as Tier, x: 200, y: 470, canonical: true, cmid: "CMID-0042", cluster: 2 },
    { id: "sf_003", label: "삼성공구사", source: "Salesforce", tier: "Silver" as Tier, x: 620, y: 290, separated: true, separationReason: "BRN 상이 (1248100998 vs 126-81-00001)" },
  ],
  edges: [
    { from: "sf_001", to: "mb_001", type: "domain" as EdgeType, label: "samsung.com 도메인 일치" },
    { from: "sh_001", to: "mb_001", type: "normalized_name" as EdgeType, label: "정규화 이름 일치" },
    { from: "dc_001", to: "mb_001", type: "embedding" as EdgeType, label: "임베딩 유사도 0.97" },
    { from: "sf_001", to: "sh_001", type: "contact_overlap" as EdgeType, label: "거래처 3개 겹침" },
    { from: "sf_002", to: "mb_002", type: "normalized_name" as EdgeType, label: "정규화 이름 일치" },
    { from: "dc_002", to: "mb_002", type: "domain" as EdgeType, label: "neoflight.demo 도메인" },
  ],
  stats: { accountCount: 2, externalIdCount: 5, pendingMerges: 0, separatedCount: 1 },
};

export async function GET() {
  try {
    const [allAccounts, allExternalIds, candidates, rejected] = await Promise.all([
      prisma.account.findMany({
        where: { cmid: { in: FOCUS_CMIDS } },
        include: { externalIds: true },
      }),
      prisma.accountExternalId.findMany({
        where: { cmid: { in: FOCUS_CMIDS } },
      }),
      prisma.mdmCandidate.findMany({ where: { status: "pending" } }),
      prisma.mdmCandidate.findMany({ where: { status: "rejected" } }),
    ]);

    // Sort accounts to match FOCUS_CMIDS order for stable grid layout
    const accounts = FOCUS_CMIDS
      .map((cmid) => allAccounts.find((a) => a.cmid === cmid))
      .filter((a): a is NonNullable<typeof a> => a != null);

    // Build cluster index (1-based)
    const clusterMap = new Map<string, number>();
    accounts.forEach((acc, i) => clusterMap.set(acc.cmid, i + 1));

    // Compute positions
    const posMap = computePositions(
      accounts.map((a) => ({ cmid: a.cmid })),
      allExternalIds.map((e) => ({ id: e.id, cmid: e.cmid }))
    );

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Canonical nodes (Gold)
    for (const acc of accounts) {
      const pos = posMap.get(acc.cmid) ?? { x: 300, y: 300 };
      nodes.push({
        id: acc.cmid,
        label: acc.canonicalName,
        source: "Canon (CMID)",
        tier: "Gold",
        x: pos.x,
        y: pos.y,
        canonical: true,
        cmid: acc.cmid,
        cluster: clusterMap.get(acc.cmid),
      });
    }

    // Source nodes + edges
    for (const ext of allExternalIds) {
      const nodeId = `${ext.sourceSystem}_${ext.sourceRecordId}`;
      const pos = posMap.get(ext.id) ?? { x: 200, y: 200 };
      const cluster = clusterMap.get(ext.cmid);
      const tier = tierForSource(ext.sourceSystem);
      const edgeType = edgeTypeForSource(ext.sourceSystem);

      nodes.push({
        id: nodeId,
        label: ext.sourceName ?? ext.sourceRecordId,
        source: ext.sourceSystem,
        tier,
        x: pos.x,
        y: pos.y,
        canonical: false,
        cmid: ext.cmid,
        cluster,
      });

      edges.push({
        from: nodeId,
        to: ext.cmid,
        type: edgeType,
        label: edgeLabelForType(edgeType),
      });
    }

    // Pending merge edges
    for (const candidate of candidates) {
      try {
        const rightRef = JSON.parse(candidate.rightRefJson) as { recordId?: string };
        if (candidate.leftCmid && rightRef.recordId) {
          edges.push({
            from: candidate.leftCmid,
            to: rightRef.recordId,
            type: "embedding",
            label: `병합 후보 (score: ${candidate.score.toFixed(2)})`,
          });
        }
      } catch {
        // skip malformed JSON
      }
    }

    // Separated nodes — rejected MdmCandidates
    for (const r of rejected) {
      try {
        const ref = JSON.parse(r.rightRefJson) as { system?: string; recordId?: string; name?: string };
        const features = JSON.parse(r.featuresJson) as { rejectionReason?: string };
        const reason = features.rejectionReason ?? "별개 법인으로 분류";
        const canonicalPos = posMap.get(r.leftCmid ?? "") ?? { x: 600, y: 300 };
        if (!ref.recordId) continue;
        nodes.push({
          id: `sep_${ref.recordId}`,
          label: ref.name ?? ref.recordId,
          source: ref.system ?? "Salesforce",
          tier: "Silver",
          x: canonicalPos.x + 160,
          y: canonicalPos.y - 60,
          canonical: false,
          separated: true,
          separationReason: reason,
        });
      } catch {
        // skip malformed JSON
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      stats: {
        accountCount: accounts.length,
        externalIdCount: allExternalIds.length,
        pendingMerges: candidates.length,
        separatedCount: rejected.length,
      },
    });
  } catch (err) {
    console.error("[/api/graph] DB error, returning fallback:", err);
    return NextResponse.json(FALLBACK);
  }
}
