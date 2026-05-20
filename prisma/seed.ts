/*
 * Comprehensive seed for the Mobidays AI demo.
 *
 * Important: this script intentionally creates dispersed / duplicated source
 * records (Salesforce, Sheet:prospects, Sheet:prospects-v2) so the matching
 * demo (`/demo/match`) has realistic examples to resolve.
 *
 * Two entry points:
 *   1. CLI:  `npx tsx prisma/seed.ts`
 *   2. API:  imported by `/api/admin/seed` route for production reset
 */

import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

import { normalizeName, extractDomain } from "../src/lib/mdm/normalize";

function id(prefix: string) {
  return `${prefix}_${nanoid(10)}`;
}

function daysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

export async function runSeed(prisma: PrismaClient) {
  return main(prisma);
}

async function main(prisma: PrismaClient) {
  console.log("🌱  Resetting database…");
  await prisma.ruleExecution.deleteMany();
  await prisma.ruleDefinition.deleteMany();
  await prisma.message.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.agentRequest.deleteMany();
  await prisma.eventInvitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.event.deleteMany();
  await prisma.docChunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.bidding.deleteMany();
  await prisma.relationshipScore.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.accountAlias.deleteMany();
  await prisma.accountExternalId.deleteMany();
  await prisma.mdmCandidate.deleteMany();
  await prisma.mdmMergeLog.deleteMany();
  await prisma.account.deleteMany();
  await prisma.sfAccount.deleteMany();
  await prisma.sheetProspect.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dqRun.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.ruleWeight.deleteMany();

  console.log("🌱  Seeding users…");
  await prisma.user.createMany({
    data: [
      { id: "user_admin", email: "admin@demo.mobidays", name: "이지원", role: "admin", team: "Data" },
      { id: "user_mgr",   email: "manager@demo.mobidays", name: "박서연", role: "manager", team: "Sales 1팀" },
      { id: "user_ed1",   email: "editor1@demo.mobidays", name: "박민준", role: "editor", team: "Sales 1팀" },
      { id: "user_ed2",   email: "editor2@demo.mobidays", name: "최지훈", role: "editor", team: "Sales 2팀" },
    ],
  });

  // ===================================================================
  // GOLD (Canonical) — 광고주 마스터
  // ===================================================================
  console.log("🌱  Seeding canonical accounts…");
  const accounts = ACCOUNT_SEEDS.map((a) => ({
    cmid: a.cmid,
    canonicalName: a.name,
    canonicalNameNorm: normalizeName(a.name),
    brandNamesJson: JSON.stringify(a.brands ?? []),
    legalName: a.legal ?? null,
    businessNo: a.businessNo ?? null,
    dartCorpCode: a.dartCorpCode ?? null,
    website: a.website ?? null,
    domainRoot: a.website ? extractDomain(a.website) : null,
    industryCode: a.industryCode ?? null,
    industryLabel: a.industry,
    companySize: a.size,
    annualRevenueKrw: a.revenue ? BigInt(a.revenue) : null,
    marketingBudgetKrw: a.budget ? BigInt(a.budget) : null,
    customerTier: a.tier,
    relationshipScore: a.rel,
    leadStage: a.stage,
    ownerUserId: a.owner,
    lastTouchedAt: a.touched ? daysAgo(a.touched) : null,
    confidence: a.confidence ?? 0.95,
    lineageJson: JSON.stringify(a.lineage ?? {}),
  }));
  await prisma.account.createMany({ data: accounts });

  // Aliases
  console.log("🌱  Seeding aliases…");
  const aliasData: { id: string; cmid: string; alias: string; aliasNormalized: string; aliasType: string; source: string | null }[] = [];
  for (const a of ACCOUNT_SEEDS) {
    for (const al of a.brands ?? []) {
      aliasData.push({
        id: id("alias"),
        cmid: a.cmid,
        alias: al,
        aliasNormalized: normalizeName(al),
        aliasType:
          /^[A-Za-z]/.test(al)
            ? "english"
            : al === a.name
              ? "legal"
              : "brand",
        source: "seed",
      });
    }
  }
  if (aliasData.length > 0) await prisma.accountAlias.createMany({ data: aliasData });

  // Contacts
  console.log("🌱  Seeding contacts…");
  for (const a of ACCOUNT_SEEDS) {
    if (!a.contacts) continue;
    for (const c of a.contacts) {
      await prisma.contact.create({
        data: {
          pmid: id("per"),
          cmid: a.cmid,
          fullName: c.name,
          email: c.email ?? null,
          title: c.title ?? null,
          seniority: c.seniority ?? null,
          isPrimary: c.primary ?? false,
        },
      });
    }
  }

  // External IDs — link accounts back to their SFDC / Sheet origins
  console.log("🌱  Seeding external ID mappings…");
  for (const a of ACCOUNT_SEEDS) {
    for (const ext of a.externalIds ?? []) {
      await prisma.accountExternalId.create({
        data: {
          id: id("ext"),
          cmid: a.cmid,
          sourceSystem: ext.system,
          sourceRecordId: ext.recordId,
          sourceName: ext.name,
          linkedBy: ext.linkedBy ?? "auto",
          confidence: ext.confidence ?? 0.99,
        },
      });
    }
  }

  // ===================================================================
  // SILVER — raw source records (dispersed / duplicated on purpose)
  // ===================================================================
  console.log("🌱  Seeding Salesforce-side source records…");
  for (const r of SF_RECORDS) {
    await prisma.sfAccount.create({
      data: {
        sfdcId: r.id,
        name: r.name,
        businessNo: r.businessNo ?? null,
        website: r.website ?? null,
        industry: r.industry ?? null,
        annualRevenueKrw: r.revenue ? BigInt(r.revenue) : null,
        marketingBudgetKrw: r.budget ? BigInt(r.budget) : null,
        address: r.address ?? null,
      },
    });
  }

  console.log("🌱  Seeding Sheet:prospects source records…");
  for (const r of SHEET_RECORDS) {
    await prisma.sheetProspect.create({
      data: {
        rowKey: r.id,
        name: r.name,
        brand: r.brand ?? null,
        domain: r.domain ?? null,
        businessNo: r.businessNo ?? null,
        budgetKrw: r.budget ? BigInt(r.budget) : null,
        industry: r.industry ?? null,
        notes: r.notes ?? null,
      },
    });
  }

  // ===================================================================
  // Activities + Documents (meeting notes)
  // ===================================================================
  console.log("🌱  Seeding activities + meeting documents…");
  for (const m of MEETING_NOTES) {
    const docId = id("doc");
    await prisma.document.create({
      data: {
        id: docId,
        cmid: m.cmid,
        sourceType: "meeting_note",
        title: m.title,
        body: m.body,
        bodyRedacted: m.body, // PII pre-cleaned in seed
        language: "ko",
        sourceUri: `gdrive://meeting-notes/${m.cmid}/${m.title}`,
      },
    });
    await prisma.activity.create({
      data: {
        id: id("act"),
        cmid: m.cmid,
        type: "Meeting",
        subject: m.title,
        body: m.body,
        bodySummary: m.summary,
        topicsJson: JSON.stringify(m.topics),
        occurredAt: m.at,
        sourceSystem: "GoogleDrive",
      },
    });
  }
  // Email activities
  console.log("🌱  Seeding email activities…");
  for (const e of EMAIL_ACTIVITIES) {
    await prisma.activity.create({
      data: {
        id: id("act"),
        cmid: e.cmid,
        type: "Email",
        direction: e.direction,
        subject: e.subject,
        body: e.body,
        topicsJson: JSON.stringify(e.topics ?? []),
        occurredAt: e.at,
        sourceSystem: "GmailExport",
      },
    });
  }

  // Proposals (past, including fails)
  console.log("🌱  Seeding proposals…");
  for (const p of PROPOSAL_SEEDS) {
    await prisma.proposal.create({
      data: {
        id: id("prop"),
        cmid: p.cmid,
        title: p.title,
        submittedAt: p.at,
        amountKrw: p.amount ? BigInt(p.amount) : null,
        outcome: p.outcome,
        failReason: p.failReason ?? null,
      },
    });
  }

  // Biddings
  console.log("🌱  Seeding bidding calendar…");
  for (const b of BIDDING_SEEDS) {
    await prisma.bidding.create({
      data: {
        id: id("bid"),
        cmid: b.cmid ?? null,
        title: b.title,
        issuedAt: b.issued,
        deadline: b.deadline,
        estimatedAmountKrw: b.amount ? BigInt(b.amount) : null,
        status: b.status,
        decisionScore: b.score ?? null,
      },
    });
  }

  // Products / Sessions / Event
  console.log("🌱  Seeding products + events + sessions…");
  for (const p of PRODUCT_SEEDS) {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        useCasesJson: JSON.stringify(p.useCases ?? []),
        fitTopicsJson: JSON.stringify(p.fitTopics ?? []),
      },
    });
  }
  await prisma.event.create({
    data: {
      id: "evt_max2026",
      name: "Max Summit 2026",
      startsAt: new Date("2026-08-04T09:00:00+09:00"),
      endsAt: new Date("2026-08-04T18:00:00+09:00"),
      location: "코엑스 그랜드볼룸",
      description: "모비데이즈가 주최하는 연간 마케팅 컨퍼런스",
    },
  });
  for (const s of SESSION_SEEDS) {
    await prisma.session.create({
      data: {
        id: s.id,
        eventId: "evt_max2026",
        title: s.title,
        track: s.track,
        description: s.description,
        targetTopicsJson: JSON.stringify(s.topics ?? []),
        speakersJson: JSON.stringify(s.speakers ?? []),
      },
    });
  }
  // Event invitation history (past events influencing recommendation rule)
  console.log("🌱  Seeding event invitation history…");
  for (const inv of INVITATION_HISTORY) {
    await prisma.eventInvitation.create({
      data: {
        id: id("inv"),
        eventId: inv.eventId,
        cmid: inv.cmid,
        status: inv.status,
        invitedAt: inv.invitedAt,
        attendedAt: inv.attendedAt ?? null,
      },
    });
  }

  // Rules
  console.log("🌱  Seeding rule definitions…");
  for (const r of RULES) {
    await prisma.ruleDefinition.create({
      data: {
        id: r.id,
        name: r.name,
        description: r.description,
        yaml: r.yaml,
        version: 1,
        status: "active",
        createdBy: "user_admin",
        approvedBy: "user_mgr",
        approvedAt: new Date(),
      },
    });
  }

  // Rule weights (for the agent dashboard slider)
  await prisma.ruleWeight.createMany({
    data: [
      { key: "industry_fit", weight: 20 },
      { key: "budget_fit", weight: 15 },
      { key: "relationship", weight: 15 },
      { key: "recency", weight: 10 },
      { key: "event_history", weight: 10 },
      { key: "topic_match", weight: 15 },
      { key: "decision_maker", weight: 10 },
      { key: "pipeline", weight: 5 },
    ],
  });

  // MDM candidates (review queue) — Tier 3 borderline cases
  console.log("🌱  Seeding MDM review queue…");
  for (const c of MDM_QUEUE) {
    await prisma.mdmCandidate.create({
      data: {
        id: id("mdmc"),
        leftCmid: c.leftCmid,
        rightRefJson: JSON.stringify(c.right),
        score: c.score,
        featuresJson: JSON.stringify(c.features),
        status: "pending",
      },
    });
  }

  // Rejected MDM candidates — separated entities (BRN 상이)
  console.log("🌱  Seeding rejected MDM candidates (separated entities)…");
  await prisma.mdmCandidate.createMany({
    data: [
      {
        id: id("mdc"),
        leftCmid: "mb_acc_samsung",
        rightRefJson: JSON.stringify({ system: "Salesforce", recordId: "001A0000SAMSUNG_GONGU", name: "삼성공구사", businessNo: "126-81-00001" }),
        score: 0.61,
        featuresJson: JSON.stringify({ nameSimilarity: 0.72, brnMatch: false, domainMatch: false, rejectionReason: "BRN 상이 (1248100998 vs 126-81-00001)" }),
        status: "rejected",
        decidedBy: "user_admin",
        decidedAt: new Date(),
      },
      {
        id: id("mdc"),
        leftCmid: "mb_acc_coupang",
        rightRefJson: JSON.stringify({ system: "Salesforce", recordId: "001A0000COUPANG_LOG", name: "쿠팡로지스틱스", businessNo: "215-88-00004" }),
        score: 0.55,
        featuresJson: JSON.stringify({ nameSimilarity: 0.68, brnMatch: false, domainMatch: false, rejectionReason: "별개 법인 (물류 자회사)" }),
        status: "rejected",
        decidedBy: "user_admin",
        decidedAt: new Date(),
      },
      {
        id: id("mdc"),
        leftCmid: "mb_acc_kakao",
        rightRefJson: JSON.stringify({ system: "Salesforce", recordId: "001A0000KAKAO_BANK_2", name: "카카오뱅크", businessNo: "403-81-00003" }),
        score: 0.58,
        featuresJson: JSON.stringify({ nameSimilarity: 0.70, brnMatch: false, domainMatch: false, rejectionReason: "별개 법인 (금융 자회사)" }),
        status: "rejected",
        decidedBy: "user_admin",
        decidedAt: new Date(),
      },
    ],
  });

  // DQ runs (snapshot for dashboard)
  console.log("🌱  Seeding DQ runs…");
  await prisma.dqRun.create({
    data: {
      id: id("dq"),
      suite: "gold_accounts_v1",
      metricsJson: JSON.stringify({
        totalAccounts: ACCOUNT_SEEDS.length,
        nullRate: { business_no: 0.18, annual_revenue: 0.12, marketing_budget: 0.31 },
        unique_business_no: true,
        confidence_avg: 0.93,
      }),
      breachesJson: JSON.stringify([]),
      status: "passed",
    },
  });
  await prisma.dqRun.create({
    data: {
      id: id("dq"),
      suite: "silver_sf_accounts",
      metricsJson: JSON.stringify({
        rowCount: SF_RECORDS.length,
        duplication_rate: 0.07,
        freshness_p50_days: 4,
      }),
      breachesJson: JSON.stringify([
        { field: "industry", issue: "산업 분류 누락 12%" },
      ]),
      status: "passed_with_warnings",
    },
  });

  console.log("✅  Seed complete.");
  console.log(`   accounts:      ${ACCOUNT_SEEDS.length}`);
  console.log(`   sf records:    ${SF_RECORDS.length}`);
  console.log(`   sheet rows:    ${SHEET_RECORDS.length}`);
  console.log(`   meeting notes: ${MEETING_NOTES.length}`);
  console.log(`   rules:         ${RULES.length}`);
}

// =====================================================================
// DATA
// =====================================================================
type AccountSeed = {
  cmid: string;
  name: string;
  legal?: string;
  brands?: string[];
  businessNo?: string;
  dartCorpCode?: string;
  website?: string;
  industry: string;
  industryCode?: string;
  size: "SMB" | "MidMarket" | "Enterprise";
  revenue?: number;
  budget?: number;
  tier?: "A" | "B" | "C" | "D";
  rel?: number;
  stage?: string;
  owner?: string;
  touched?: number;
  confidence?: number;
  lineage?: Record<string, unknown>;
  externalIds?: { system: string; recordId: string; name?: string; linkedBy?: string; confidence?: number }[];
  contacts?: { name: string; email?: string; title?: string; seniority?: string; primary?: boolean }[];
};

const ACCOUNT_SEEDS: AccountSeed[] = [
  {
    cmid: "mb_acc_samsung",
    name: "삼성전자",
    legal: "삼성전자 주식회사",
    brands: ["삼성전자", "Samsung Electronics", "Samsung", "삼성", "Galaxy"],
    businessNo: "1248100998",
    dartCorpCode: "00126380",
    website: "https://www.samsung.com",
    industry: "Electronics",
    size: "Enterprise",
    revenue: 279_0000_0000_0000,
    budget: 500_0000_0000,
    tier: "A",
    rel: 78,
    stage: "Met",
    owner: "user_ed1",
    touched: 6,
    confidence: 0.98,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SAMSUNG", name: "삼성전자", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#42", name: "삼성 전자", confidence: 0.95 },
      { system: "Sheet:prospects-v3", recordId: "row#187", name: "Samsung Electronics", confidence: 0.99 },
      { system: "DART", recordId: "00126380", confidence: 1 },
    ],
    contacts: [
      { name: "김상호", email: "sh.kim@samsung.com", title: "마케팅 그룹장", seniority: "VP", primary: true },
      { name: "이수정", email: "sj.lee@samsung.com", title: "팀장", seniority: "Director" },
    ],
  },
  {
    cmid: "mb_acc_samsungheavy",
    name: "삼성중공업",
    brands: ["삼성중공업", "Samsung Heavy"],
    businessNo: "1248100200",
    website: "https://www.samsungshi.com",
    industry: "Manufacturing",
    size: "Enterprise",
    revenue: 80_0000_0000_0000,
    budget: 20_0000_0000,
    tier: "C",
    rel: 32,
    stage: "Identified",
    touched: 110,
    confidence: 0.95,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SAMHV", name: "삼성중공업", confidence: 0.99 },
    ],
  },
  {
    cmid: "mb_acc_samsungsds",
    name: "삼성SDS",
    brands: ["삼성SDS", "Samsung SDS"],
    businessNo: "1248100123",
    website: "https://www.samsungsds.com",
    industry: "IT",
    size: "Enterprise",
    revenue: 13_0000_0000_0000,
    budget: 15_0000_0000,
    tier: "B",
    rel: 55,
    stage: "Identified",
    touched: 60,
  },
  {
    cmid: "mb_acc_hyundai",
    name: "현대자동차",
    legal: "현대자동차주식회사",
    brands: ["현대자동차", "Hyundai Motor", "Hyundai", "현대"],
    businessNo: "1018110680",
    website: "https://www.hyundai.com",
    industry: "Automotive",
    size: "Enterprise",
    revenue: 140_0000_0000_0000,
    budget: 300_0000_0000,
    tier: "A",
    rel: 71,
    stage: "Confirmed",
    owner: "user_ed1",
    touched: 10,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000HYUNDAI", name: "현대자동차", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#88", name: "Hyundai Motor Co.", confidence: 0.95 },
    ],
    contacts: [
      { name: "정태영", title: "디지털 마케팅 팀장", seniority: "Director", primary: true, email: "ty.jung@hyundai.com" },
    ],
  },
  {
    cmid: "mb_acc_naver",
    name: "네이버",
    legal: "네이버 주식회사",
    brands: ["네이버", "NAVER", "Naver", "네이버 클라우드"],
    businessNo: "2208126772",
    website: "https://www.naver.com",
    industry: "Internet",
    size: "Enterprise",
    revenue: 9_6000_0000_0000,
    budget: 50_0000_0000,
    tier: "A",
    rel: 65,
    stage: "Identified",
    owner: "user_ed2",
    touched: 22,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000NAVER", name: "네이버 주식회사", confidence: 0.99 },
    ],
  },
  {
    cmid: "mb_acc_kakao",
    name: "카카오",
    legal: "주식회사 카카오",
    brands: ["카카오", "Kakao", "KAKAO"],
    businessNo: "1208147521",
    website: "https://www.kakaocorp.com",
    industry: "Internet",
    size: "Enterprise",
    revenue: 8_0000_0000_0000,
    budget: 40_0000_0000,
    tier: "A",
    rel: 60,
    stage: "Identified",
    touched: 35,
  },
  {
    cmid: "mb_acc_coupang",
    name: "쿠팡",
    brands: ["쿠팡", "Coupang"],
    businessNo: "1208147503",
    website: "https://www.coupang.com",
    industry: "Commerce",
    size: "Enterprise",
    revenue: 30_0000_0000_0000,
    budget: 200_0000_0000,
    tier: "A",
    rel: 50,
    stage: "Invited",
    owner: "user_ed2",
    touched: 9,
  },
  {
    cmid: "mb_acc_neoflight",
    name: "네오플라잇",
    brands: ["네오플라잇", "NeoFlight"],
    businessNo: "1208601145",
    website: "https://www.neoflight.demo",
    industry: "Game",
    size: "MidMarket",
    revenue: 8_0000_0000_0000,
    budget: 25_0000_0000,
    tier: "A",
    rel: 62,
    stage: "Identified",
    owner: "user_ed1",
    touched: 14,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000NEOFL", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#19", confidence: 0.92 },
    ],
    contacts: [
      { name: "김재훈", title: "UA 매니저", seniority: "Manager", primary: true, email: "jh.kim@neoflight.demo" },
    ],
  },
  {
    cmid: "mb_acc_pixelnest",
    name: "픽셀네스트",
    brands: ["픽셀네스트", "PixelNest"],
    website: "https://www.pixelnest.demo",
    industry: "Game",
    size: "SMB",
    revenue: 6000_0000_0000,
    budget: 5_0000_0000,
    tier: "B",
    rel: 48,
    stage: "Met",
    touched: 17,
  },
  {
    cmid: "mb_acc_starlightgames",
    name: "스타라이트게임즈",
    brands: ["스타라이트게임즈", "Starlight Games"],
    website: "https://www.starlight.demo",
    industry: "Game",
    size: "MidMarket",
    revenue: 4_0000_0000_0000,
    budget: 12_0000_0000,
    tier: "A",
    rel: 58,
    stage: "Identified",
    touched: 28,
  },
  {
    cmid: "mb_acc_nexon",
    name: "넥슨",
    legal: "넥슨코리아 주식회사",
    brands: ["넥슨", "Nexon", "NEXON"],
    businessNo: "1208147002",
    website: "https://www.nexon.com",
    industry: "Game",
    size: "Enterprise",
    revenue: 4_0000_0000_0000,
    budget: 80_0000_0000,
    tier: "A",
    rel: 72,
    stage: "Met",
    owner: "user_ed1",
    touched: 4,
  },
  {
    cmid: "mb_acc_ncsoft",
    name: "엔씨소프트",
    brands: ["엔씨소프트", "NCSOFT", "NC"],
    website: "https://www.ncsoft.com",
    industry: "Game",
    size: "Enterprise",
    revenue: 1_7000_0000_0000,
    budget: 60_0000_0000,
    tier: "B",
    rel: 45,
    stage: "Identified",
    touched: 95,
  },
  {
    cmid: "mb_acc_netmarble",
    name: "넷마블",
    brands: ["넷마블", "Netmarble"],
    website: "https://www.netmarble.com",
    industry: "Game",
    size: "Enterprise",
    revenue: 2_5000_0000_0000,
    budget: 70_0000_0000,
    tier: "A",
    rel: 53,
    stage: "Identified",
    touched: 40,
  },
  {
    cmid: "mb_acc_toss",
    name: "토스",
    legal: "비바리퍼블리카",
    brands: ["토스", "Toss", "Viva Republica"],
    businessNo: "1078701134",
    website: "https://toss.im",
    industry: "Fintech",
    size: "Enterprise",
    revenue: 1_5000_0000_0000,
    budget: 30_0000_0000,
    tier: "A",
    rel: 68,
    stage: "Confirmed",
    owner: "user_ed2",
    touched: 11,
  },
  {
    cmid: "mb_acc_kakaobank",
    name: "카카오뱅크",
    brands: ["카카오뱅크", "KakaoBank"],
    website: "https://www.kakaobank.com",
    industry: "Fintech",
    size: "Enterprise",
    revenue: 2_0000_0000_0000,
    budget: 25_0000_0000,
    tier: "A",
    rel: 50,
    stage: "Identified",
    touched: 50,
  },
  {
    cmid: "mb_acc_musinsa",
    name: "무신사",
    brands: ["무신사", "Musinsa", "MUSINSA"],
    website: "https://www.musinsa.com",
    industry: "Commerce",
    size: "MidMarket",
    revenue: 1_0000_0000_0000,
    budget: 18_0000_0000,
    tier: "A",
    rel: 64,
    stage: "Invited",
    owner: "user_ed2",
    touched: 8,
  },
  {
    cmid: "mb_acc_daangn",
    name: "당근",
    legal: "당근마켓",
    brands: ["당근", "당근마켓", "Daangn", "Karrot"],
    website: "https://www.daangn.com",
    industry: "Internet",
    size: "MidMarket",
    revenue: 1500_0000_0000,
    budget: 12_0000_0000,
    tier: "B",
    rel: 55,
    stage: "Identified",
    touched: 25,
  },
  {
    cmid: "mb_acc_yanolja",
    name: "야놀자",
    brands: ["야놀자", "Yanolja"],
    website: "https://www.yanolja.com",
    industry: "Travel",
    size: "MidMarket",
    revenue: 7000_0000_0000,
    budget: 9_0000_0000,
    tier: "B",
    rel: 42,
    stage: "Identified",
    touched: 60,
  },
  {
    cmid: "mb_acc_lottecard",
    name: "롯데카드",
    brands: ["롯데카드", "LotteCard"],
    website: "https://www.lottecard.co.kr",
    industry: "Fintech",
    size: "Enterprise",
    revenue: 1_8000_0000_0000,
    budget: 12_0000_0000,
    tier: "B",
    rel: 40,
    stage: "Identified",
    touched: 130,
  },
  {
    cmid: "mb_acc_amorepacific",
    name: "아모레퍼시픽",
    brands: ["아모레퍼시픽", "Amorepacific"],
    website: "https://www.amorepacific.com",
    industry: "Beauty",
    size: "Enterprise",
    revenue: 4_5000_0000_0000,
    budget: 35_0000_0000,
    tier: "A",
    rel: 56,
    stage: "Identified",
    touched: 18,
  },
  {
    cmid: "mb_acc_oliveyoung",
    name: "올리브영",
    brands: ["올리브영", "OliveYoung", "CJ올리브영"],
    website: "https://www.oliveyoung.co.kr",
    industry: "Beauty",
    size: "Enterprise",
    revenue: 4_0000_0000_0000,
    budget: 22_0000_0000,
    tier: "A",
    rel: 70,
    stage: "Confirmed",
    owner: "user_ed1",
    touched: 7,
  },
  {
    cmid: "mb_acc_baemin",
    name: "배달의민족",
    legal: "우아한형제들",
    brands: ["배달의민족", "배민", "Baemin"],
    website: "https://www.baemin.com",
    industry: "F&B",
    size: "MidMarket",
    revenue: 3_4000_0000_0000,
    budget: 15_0000_0000,
    tier: "A",
    rel: 60,
    stage: "Identified",
    touched: 22,
  },
  // ── NEW: 30 additional real Korean advertisers ──────────────────────
  {
    cmid: "mb_acc_lge",
    name: "LG전자",
    legal: "LG전자 주식회사",
    brands: ["LG전자", "LG Electronics", "LG"],
    businessNo: "1078115068",
    website: "https://www.lg.com",
    industry: "Electronics",
    size: "Enterprise",
    revenue: 84_0000_0000_0000,
    budget: 400_0000_0000,
    tier: "A",
    rel: 72,
    stage: "Met",
    owner: "user_ed1",
    touched: 12,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000LGE", name: "LG전자", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#301", name: "LG Electronics", confidence: 0.97 },
    ],
    contacts: [
      { name: "오세훈", email: "sh.oh@lge.com", title: "글로벌 마케팅 팀장", seniority: "Director", primary: true },
      { name: "강민서", email: "ms.kang@lge.com", title: "디지털 마케팅 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_skt",
    name: "SK텔레콤",
    legal: "에스케이텔레콤 주식회사",
    brands: ["SK텔레콤", "SKT", "SK Telecom"],
    businessNo: "2208142600",
    website: "https://www.sktelecom.com",
    industry: "Telecom",
    size: "Enterprise",
    revenue: 18_0000_0000_0000,
    budget: 350_0000_0000,
    tier: "A",
    rel: 65,
    stage: "Confirmed",
    owner: "user_mgr",
    touched: 18,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SKT", name: "SK텔레콤", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#302", name: "SK Telecom", confidence: 0.95 },
    ],
    contacts: [
      { name: "임지혜", email: "jh.lim@sktelecom.com", title: "광고사업 팀장", seniority: "Director", primary: true },
      { name: "윤성준", email: "sj.yoon@sktelecom.com", title: "브랜드 마케팅 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_kt",
    name: "KT",
    legal: "주식회사 케이티",
    brands: ["KT", "KT Corporation"],
    website: "https://www.kt.com",
    industry: "Telecom",
    size: "Enterprise",
    revenue: 26_0000_0000_0000,
    budget: 200_0000_0000,
    tier: "B",
    rel: 58,
    stage: "Met",
    owner: "user_ed2",
    touched: 35,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KT", name: "KT", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#303", name: "KT Corporation", confidence: 0.94 },
    ],
    contacts: [
      { name: "박현우", email: "hw.park@kt.com", title: "마케팅 본부장", seniority: "VP", primary: true },
    ],
  },
  {
    cmid: "mb_acc_lguplus",
    name: "LG유플러스",
    legal: "LG유플러스 주식회사",
    brands: ["LG유플러스", "LGU+", "U+"],
    website: "https://www.lguplus.com",
    industry: "Telecom",
    size: "Enterprise",
    revenue: 14_0000_0000_0000,
    budget: 150_0000_0000,
    tier: "B",
    rel: 52,
    stage: "Invited",
    owner: "user_ed1",
    touched: 45,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000LGUPLUS", name: "LG유플러스", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#304", name: "LG Uplus", confidence: 0.93 },
    ],
    contacts: [
      { name: "최승현", email: "sh.choi@lguplus.com", title: "디지털마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_lotteshopping",
    name: "롯데쇼핑",
    legal: "롯데쇼핑 주식회사",
    brands: ["롯데쇼핑", "롯데백화점", "롯데마트", "Lotte Shopping"],
    website: "https://www.lotteshopping.com",
    industry: "Retail",
    size: "Enterprise",
    revenue: 16_0000_0000_0000,
    budget: 280_0000_0000,
    tier: "A",
    rel: 68,
    stage: "Met",
    owner: "user_mgr",
    touched: 22,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000LOTTESP", name: "롯데쇼핑", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#305", name: "Lotte Shopping", confidence: 0.96 },
    ],
    contacts: [
      { name: "한소영", email: "sy.han@lotte.com", title: "통합마케팅 팀장", seniority: "Director", primary: true },
      { name: "조민석", email: "ms.jo@lotte.com", title: "디지털커머스 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_shinsegae",
    name: "신세계",
    legal: "신세계 주식회사",
    brands: ["신세계", "Shinsegae", "SSG"],
    website: "https://www.shinsegae.com",
    industry: "Retail",
    size: "Enterprise",
    revenue: 6_0000_0000_0000,
    budget: 220_0000_0000,
    tier: "A",
    rel: 63,
    stage: "Confirmed",
    owner: "user_ed2",
    touched: 28,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SHINSEGAE", name: "신세계", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#306", name: "Shinsegae", confidence: 0.95 },
    ],
    contacts: [
      { name: "이준호", email: "jh.lee@shinsegae.com", title: "마케팅 본부장", seniority: "VP", primary: true },
    ],
  },
  {
    cmid: "mb_acc_cjenm",
    name: "CJ ENM",
    legal: "씨제이이엔엠 주식회사",
    brands: ["CJ ENM", "tvN", "OCN", "Mnet"],
    website: "https://www.cjenm.com",
    industry: "Media",
    size: "Enterprise",
    revenue: 4_5000_0000_0000,
    budget: 180_0000_0000,
    tier: "A",
    rel: 75,
    stage: "Met",
    owner: "user_ed1",
    touched: 8,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000CJENM", name: "CJ ENM", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#307", name: "CJ ENM Co.", confidence: 0.97 },
    ],
    contacts: [
      { name: "김태희", email: "th.kim@cjenm.com", title: "광고/미디어 팀장", seniority: "Director", primary: true },
      { name: "박지수", email: "js.park@cjenm.com", title: "브랜드 전략 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_gsretail",
    name: "GS리테일",
    legal: "GS리테일 주식회사",
    brands: ["GS리테일", "GS25", "GS THE FRESH"],
    website: "https://www.gsretail.com",
    industry: "Retail",
    size: "MidMarket",
    revenue: 10_0000_0000_0000,
    budget: 120_0000_0000,
    tier: "B",
    rel: 49,
    stage: "Invited",
    owner: "user_mgr",
    touched: 55,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000GSRETAIL", name: "GS리테일", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#308", name: "GS Retail", confidence: 0.93 },
    ],
    contacts: [
      { name: "서동욱", email: "dw.seo@gsretail.com", title: "디지털마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_hybe",
    name: "하이브",
    legal: "하이브 주식회사",
    brands: ["HYBE", "빅히트", "BTS"],
    website: "https://www.hybe.com",
    industry: "Entertainment",
    size: "MidMarket",
    revenue: 2_1000_0000_0000,
    budget: 80_0000_0000,
    tier: "B",
    rel: 61,
    stage: "Met",
    owner: "user_ed2",
    touched: 32,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000HYBE", name: "HYBE", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#309", name: "HYBE Co.", confidence: 0.95 },
    ],
    contacts: [
      { name: "정유진", email: "yj.jung@hybe.com", title: "글로벌 마케팅 디렉터", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_sm",
    name: "SM엔터테인먼트",
    legal: "에스엠 주식회사",
    brands: ["SM엔터테인먼트", "SM Entertainment", "SM"],
    website: "https://www.smtown.com",
    industry: "Entertainment",
    size: "MidMarket",
    revenue: 9000_0000_0000,
    budget: 60_0000_0000,
    tier: "B",
    rel: 54,
    stage: "Identified",
    owner: "user_ed1",
    touched: 70,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SM", name: "SM엔터테인먼트", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#310", name: "SM Entertainment", confidence: 0.94 },
    ],
    contacts: [
      { name: "황민준", email: "mj.hwang@smtown.com", title: "마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_krafton",
    name: "크래프톤",
    legal: "크래프톤 주식회사",
    brands: ["크래프톤", "KRAFTON", "배틀그라운드", "PUBG"],
    website: "https://www.krafton.com",
    industry: "Gaming",
    size: "Enterprise",
    revenue: 2_0000_0000_0000,
    budget: 200_0000_0000,
    tier: "A",
    rel: 70,
    stage: "Met",
    owner: "user_mgr",
    touched: 15,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KRAFTON", name: "크래프톤", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#312", name: "KRAFTON Inc.", confidence: 0.97 },
    ],
    contacts: [
      { name: "이현수", email: "hs.lee@krafton.com", title: "글로벌 UA 팀장", seniority: "Director", primary: true },
      { name: "박세진", email: "sj.park@krafton.com", title: "마케팅 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_kakaogames",
    name: "카카오게임즈",
    legal: "카카오게임즈 주식회사",
    brands: ["카카오게임즈", "Kakao Games"],
    website: "https://www.kakaogames.com",
    industry: "Gaming",
    size: "MidMarket",
    revenue: 8000_0000_0000,
    budget: 70_0000_0000,
    tier: "B",
    rel: 55,
    stage: "Invited",
    owner: "user_ed1",
    touched: 40,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KAKAOGAMES", name: "카카오게임즈", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#313", name: "Kakao Games", confidence: 0.95 },
    ],
    contacts: [
      { name: "송지원", email: "jw.song@kakaogames.com", title: "UA 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_pearlabyss",
    name: "펄어비스",
    legal: "주식회사 펄어비스",
    brands: ["펄어비스", "Pearl Abyss", "검은사막"],
    website: "https://www.pearlabyss.com",
    industry: "Gaming",
    size: "MidMarket",
    revenue: 4000_0000_0000,
    budget: 50_0000_0000,
    tier: "B",
    rel: 48,
    stage: "Identified",
    owner: "user_ed2",
    touched: 75,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000PEARLABYSS", name: "펄어비스", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#314", name: "Pearl Abyss", confidence: 0.94 },
    ],
    contacts: [
      { name: "이민호", email: "mh.lee@pearlabyss.com", title: "글로벌 마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_kbcard",
    name: "KB국민카드",
    legal: "케이비국민카드 주식회사",
    brands: ["KB국민카드", "KB Card"],
    website: "https://www.kbcard.com",
    industry: "FinTech",
    size: "Enterprise",
    revenue: 4_0000_0000_0000,
    budget: 250_0000_0000,
    tier: "A",
    rel: 69,
    stage: "Met",
    owner: "user_mgr",
    touched: 20,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KBCARD", name: "KB국민카드", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#315", name: "KB Card", confidence: 0.96 },
    ],
    contacts: [
      { name: "김은정", email: "ej.kim@kbcard.com", title: "마케팅 본부장", seniority: "VP", primary: true },
      { name: "류상혁", email: "sh.ryu@kbcard.com", title: "디지털마케팅 팀장", seniority: "Director" },
    ],
  },
  {
    cmid: "mb_acc_shinhancard",
    name: "신한카드",
    legal: "신한카드 주식회사",
    brands: ["신한카드", "Shinhan Card"],
    website: "https://www.shinhancard.com",
    industry: "FinTech",
    size: "Enterprise",
    revenue: 4_5000_0000_0000,
    budget: 230_0000_0000,
    tier: "A",
    rel: 72,
    stage: "Confirmed",
    owner: "user_ed1",
    touched: 14,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SHINHANCARD", name: "신한카드", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#316", name: "Shinhan Card", confidence: 0.96 },
    ],
    contacts: [
      { name: "나혜리", email: "hr.na@shinhancard.com", title: "마케팅전략 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_samsungcard",
    name: "삼성카드",
    legal: "삼성카드 주식회사",
    brands: ["삼성카드", "Samsung Card"],
    website: "https://www.samsungcard.com",
    industry: "FinTech",
    size: "Enterprise",
    revenue: 3_8000_0000_0000,
    budget: 200_0000_0000,
    tier: "A",
    rel: 67,
    stage: "Met",
    owner: "user_ed2",
    touched: 25,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SAMSUNGCARD", name: "삼성카드", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#317", name: "Samsung Card", confidence: 0.96 },
    ],
    contacts: [
      { name: "고재훈", email: "jh.ko@samsungcard.com", title: "디지털마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_hyundaicard",
    name: "현대카드",
    legal: "현대카드 주식회사",
    brands: ["현대카드", "Hyundai Card"],
    website: "https://www.hyundaicard.com",
    industry: "FinTech",
    size: "Enterprise",
    revenue: 3_0000_0000_0000,
    budget: 160_0000_0000,
    tier: "B",
    rel: 58,
    stage: "Invited",
    owner: "user_mgr",
    touched: 50,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000HYUNDAICARD", name: "현대카드", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#318", name: "Hyundai Card", confidence: 0.95 },
    ],
    contacts: [
      { name: "장서윤", email: "sy.jang@hyundaicard.com", title: "마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_socar",
    name: "쏘카",
    legal: "쏘카 주식회사",
    brands: ["쏘카", "SOCAR"],
    website: "https://www.socar.kr",
    industry: "Mobility",
    size: "SMB",
    revenue: 4000_0000_0000,
    budget: 30_0000_0000,
    tier: "C",
    rel: 38,
    stage: "Identified",
    owner: "user_ed1",
    touched: 90,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SOCAR", name: "쏘카", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#319", name: "SOCAR", confidence: 0.93 },
    ],
    contacts: [
      { name: "신민철", email: "mc.shin@socar.kr", title: "마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_marketkurly",
    name: "마켓컬리",
    legal: "주식회사 컬리",
    brands: ["마켓컬리", "컬리", "Kurly"],
    website: "https://www.kurly.com",
    industry: "E-commerce",
    size: "MidMarket",
    revenue: 2_1000_0000_0000,
    budget: 60_0000_0000,
    tier: "B",
    rel: 45,
    stage: "Invited",
    owner: "user_ed2",
    touched: 55,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KURLY", name: "마켓컬리", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#320", name: "Kurly", confidence: 0.94 },
    ],
    contacts: [
      { name: "유수연", email: "sy.yu@kurly.com", title: "퍼포먼스 마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_29cm",
    name: "29CM",
    legal: "주식회사 29CM",
    brands: ["29CM"],
    website: "https://www.29cm.co.kr",
    industry: "Fashion E-commerce",
    size: "SMB",
    revenue: 3000_0000_0000,
    budget: 25_0000_0000,
    tier: "C",
    rel: 35,
    stage: "Identified",
    owner: "user_ed1",
    touched: 120,
    externalIds: [
      { system: "Salesforce", recordId: "001A000029CM", name: "29CM", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#321", name: "29CM", confidence: 0.93 },
    ],
    contacts: [
      { name: "임채원", email: "cw.lim@29cm.co.kr", title: "마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_ably",
    name: "에이블리",
    legal: "에이블리코퍼레이션 주식회사",
    brands: ["에이블리", "Ably"],
    website: "https://www.a-bly.com",
    industry: "Fashion",
    size: "SMB",
    revenue: 2000_0000_0000,
    budget: 35_0000_0000,
    tier: "C",
    rel: 42,
    stage: "Identified",
    owner: "user_ed2",
    touched: 80,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000ABLY", name: "에이블리", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#322", name: "Ably", confidence: 0.92 },
    ],
    contacts: [
      { name: "김다은", email: "de.kim@a-bly.com", title: "마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_zigzag",
    name: "지그재그",
    legal: "카카오스타일 주식회사",
    brands: ["지그재그", "카카오스타일"],
    website: "https://www.zigzag.kr",
    industry: "Fashion",
    size: "MidMarket",
    revenue: 3500_0000_0000,
    budget: 55_0000_0000,
    tier: "B",
    rel: 48,
    stage: "Invited",
    owner: "user_mgr",
    touched: 60,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000ZIGZAG", name: "지그재그", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#323", name: "Zigzag", confidence: 0.93 },
    ],
    contacts: [
      { name: "이하은", email: "he.lee@zigzag.kr", title: "퍼포먼스 마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_ohouse",
    name: "오늘의집",
    legal: "버킷플레이스 주식회사",
    brands: ["오늘의집", "Ohouse"],
    website: "https://www.ohou.se",
    industry: "Home Lifestyle",
    size: "MidMarket",
    revenue: 3000_0000_0000,
    budget: 65_0000_0000,
    tier: "B",
    rel: 51,
    stage: "Invited",
    owner: "user_ed1",
    touched: 48,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000OHOUSE", name: "오늘의집", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#324", name: "Ohouse", confidence: 0.93 },
    ],
    contacts: [
      { name: "조하연", email: "hy.jo@ohou.se", title: "마케팅 팀장", seniority: "Director", primary: true },
    ],
  },
  {
    cmid: "mb_acc_zigbang",
    name: "직방",
    legal: "주식회사 직방",
    brands: ["직방", "Zigbang"],
    website: "https://www.zigbang.com",
    industry: "PropTech",
    size: "MidMarket",
    revenue: 2000_0000_0000,
    budget: 40_0000_0000,
    tier: "C",
    rel: 40,
    stage: "Identified",
    owner: "user_ed2",
    touched: 100,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000ZIGBANG", name: "직방", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#325", name: "Zigbang", confidence: 0.92 },
    ],
    contacts: [
      { name: "신재호", email: "jh.shin@zigbang.com", title: "마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_woowa",
    name: "우아한형제들",
    legal: "주식회사 우아한형제들",
    brands: ["우아한형제들", "배달의민족", "배민"],
    website: "https://www.woowahan.com",
    industry: "FoodTech",
    size: "Enterprise",
    revenue: 3_4000_0000_0000,
    budget: 300_0000_0000,
    tier: "A",
    rel: 74,
    stage: "Met",
    owner: "user_mgr",
    touched: 9,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000WOOWA", name: "우아한형제들", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#326", name: "Woowa Brothers", confidence: 0.97 },
    ],
    contacts: [
      { name: "강태민", email: "tm.kang@woowahan.com", title: "마케팅 본부장", seniority: "VP", primary: true },
      { name: "오지현", email: "jh.oh@woowahan.com", title: "퍼포먼스 마케팅 팀장", seniority: "Director" },
    ],
  },
  {
    cmid: "mb_acc_wemakeprice",
    name: "위메프",
    legal: "주식회사 위메프",
    brands: ["위메프", "WeMakePrise"],
    website: "https://www.wemakeprice.com",
    industry: "E-commerce",
    size: "MidMarket",
    revenue: 5000_0000_0000,
    budget: 28_0000_0000,
    tier: "C",
    rel: 33,
    stage: "Identified",
    owner: "user_ed1",
    touched: 150,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000WEMAKEPRICE", name: "위메프", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#327", name: "WeMakePrise", confidence: 0.90 },
    ],
    contacts: [
      { name: "백성훈", email: "sh.baek@wemakeprice.com", title: "마케팅 매니저", seniority: "Manager", primary: true },
    ],
  },
  {
    cmid: "mb_acc_tmon",
    name: "티몬",
    legal: "주식회사 티몬",
    brands: ["티몬", "TMON", "Ticket Monster"],
    website: "https://www.tmon.co.kr",
    industry: "E-commerce",
    size: "SMB",
    revenue: 3000_0000_0000,
    budget: 15_0000_0000,
    tier: "D",
    rel: 25,
    stage: "Identified",
    owner: "user_ed2",
    touched: 180,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000TMON", name: "티몬", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#328", name: "TMON", confidence: 0.89 },
    ],
    contacts: [
      { name: "황다솜", email: "ds.hwang@tmon.co.kr", title: "마케팅 담당", seniority: "Associate", primary: true },
    ],
  },
  {
    cmid: "mb_acc_shinhanbank",
    name: "신한은행",
    legal: "주식회사 신한은행",
    brands: ["신한은행", "Shinhan Bank"],
    website: "https://www.shinhan.com",
    industry: "Banking",
    size: "Enterprise",
    revenue: 14_0000_0000_0000,
    budget: 180_0000_0000,
    tier: "A",
    rel: 64,
    stage: "Met",
    owner: "user_mgr",
    touched: 30,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000SHINHANBANK", name: "신한은행", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#329", name: "Shinhan Bank", confidence: 0.96 },
    ],
    contacts: [
      { name: "정우진", email: "wj.jung@shinhan.com", title: "디지털마케팅 팀장", seniority: "Director", primary: true },
      { name: "이서현", email: "sh.lee@shinhan.com", title: "브랜드 매니저", seniority: "Manager" },
    ],
  },
  {
    cmid: "mb_acc_kbbank",
    name: "KB국민은행",
    legal: "주식회사 국민은행",
    brands: ["KB국민은행", "KB Bank", "국민은행"],
    website: "https://www.kbstar.com",
    industry: "Banking",
    size: "Enterprise",
    revenue: 16_0000_0000_0000,
    budget: 200_0000_0000,
    tier: "A",
    rel: 66,
    stage: "Confirmed",
    owner: "user_ed1",
    touched: 18,
    externalIds: [
      { system: "Salesforce", recordId: "001A0000KBBANK", name: "KB국민은행", confidence: 0.99 },
      { system: "Sheet:prospects-v3", recordId: "row#330", name: "KB Bank", confidence: 0.96 },
    ],
    contacts: [
      { name: "안성민", email: "sm.an@kbstar.com", title: "마케팅 본부장", seniority: "VP", primary: true },
      { name: "전소현", email: "sh.jeon@kbstar.com", title: "디지털마케팅 팀장", seniority: "Director" },
    ],
  },
];

// SFDC source records — many overlap with canonical, some are different spellings
type SfRec = {
  id: string;
  name: string;
  businessNo?: string;
  website?: string;
  industry?: string;
  revenue?: number;
  budget?: number;
  address?: string;
};

const SF_RECORDS: SfRec[] = [
  { id: "001A0000SAMSUNG", name: "삼성전자", businessNo: "1248100998", website: "https://www.samsung.com", industry: "Electronics", revenue: 279_0000_0000_0000, budget: 500_0000_0000, address: "수원시 영통구" },
  { id: "001A0000SAMHV", name: "삼성중공업", businessNo: "1248100200", website: "https://www.samsungshi.com", industry: "Manufacturing" },
  { id: "001A0000HYUNDAI", name: "현대자동차", businessNo: "1018110680", website: "https://www.hyundai.com", industry: "Automotive", revenue: 140_0000_0000_0000, budget: 300_0000_0000 },
  { id: "001A0000NAVER", name: "NAVER Corp", businessNo: "2208126772", website: "https://www.naver.com", industry: "Internet" },
  { id: "001A0000NEOFL", name: "네오플라잇", website: "https://www.neoflight.demo", industry: "Game", budget: 25_0000_0000 },
  { id: "001A0000TOSS", name: "비바리퍼블리카", businessNo: "1078701134", website: "https://toss.im", industry: "Fintech" },
  { id: "001A0000COUPANG", name: "쿠팡", businessNo: "1208147503", website: "https://www.coupang.com", industry: "Commerce" },
  { id: "001A0000NEXON", name: "넥슨코리아", businessNo: "1208147002", website: "https://www.nexon.com", industry: "Game" },
  { id: "001A0000NETMRB", name: "넷마블", website: "https://www.netmarble.com", industry: "Game" },
  { id: "001A0000NCSOFT", name: "엔씨소프트", website: "https://www.ncsoft.com", industry: "Game" },
  { id: "001A0000PIXEL", name: "픽셀네스트", website: "https://www.pixelnest.demo", industry: "Game" },
  // Separated entity orphans — BRN differs from known canonical accounts
  { id: "001A0000SAMSUNG_GONGU", name: "삼성공구사", businessNo: "126-81-00001", website: undefined, industry: "Manufacturing", revenue: 50_0000_0000, budget: 5_0000_0000 },
  { id: "001A0000LOTTE_JEGWA", name: "롯데제과", businessNo: "104-81-00002", website: "https://www.lotteconf.co.kr", industry: "Food", revenue: 2_0000_0000_0000, budget: 30_0000_0000 },
  { id: "001A0000KAKAO_BANK_2", name: "카카오뱅크", businessNo: "403-81-00003", website: "https://www.kakaobank.com", industry: "FinTech", revenue: 3_0000_0000_0000, budget: 80_0000_0000 },
  { id: "001A0000COUPANG_LOG", name: "쿠팡로지스틱스", businessNo: "215-88-00004", website: undefined, industry: "Logistics", revenue: 1_0000_0000_0000, budget: 15_0000_0000 },
];

const SHEET_RECORDS: { id: string; name: string; brand?: string; domain?: string; businessNo?: string; budget?: number; industry?: string; notes?: string }[] = [
  // Samsung scattered spellings
  { id: "row#42", name: "삼성 전자", domain: "samsung.com", budget: 500_0000_0000, industry: "Electronics", notes: "마케팅 그룹 김상호 그룹장 — 글로벌 캠페인 관심" },
  { id: "row#187", name: "Samsung Electronics", businessNo: "1248100998", domain: "samsung.com", industry: "Electronics" },
  // Cousin company easy to confuse
  { id: "row#188", name: "삼성중공업㈜", domain: "samsungshi.com", industry: "Manufacturing" },
  { id: "row#88", name: "Hyundai Motor Co.", domain: "hyundai.com", industry: "Automotive" },
  { id: "row#19", name: "NeoFlight Studios", domain: "neoflight.demo", budget: 25_0000_0000, industry: "Game" },
  { id: "row#207", name: "픽셀 네스트", domain: "pixelnest.demo", industry: "Game" },
  // Tier 3 challenging cases — domain only
  { id: "row#311", name: "Daangn Inc.", domain: "daangn.com", industry: "Internet", notes: "글로벌 본부 컨택 가능성" },
  // Hard fail case — different bn, similar name
  { id: "row#404", name: "삼성공구사", businessNo: "1242010200", industry: "Manufacturing", notes: "별개 법인 — 매칭 시 분리 필요" },
];

// Meeting notes — pre-written sample bodies
type MeetingSeed = {
  cmid: string;
  title: string;
  at: Date;
  summary: string;
  topics: string[];
  body: string;
};

const MEETING_NOTES: MeetingSeed[] = [
  {
    cmid: "mb_acc_neoflight",
    title: "네오플라잇 정기 미팅 — Skyborne 글로벌 출시",
    at: daysAgo(14),
    summary: "CTV / 리테일미디어 관심 → 어트리뷰션 정확도 보강 요청",
    topics: ["CTV", "Attribution", "UA"],
    body: [
      "# 네오플라잇 정기 미팅",
      "참석(당사): 박민준(AE), 이지원(PM)",
      "참석(광고주): 김재훈(UA 매니저), 이서영(과장)",
      "",
      "## 논의",
      "- 글로벌 신작 'Skyborne' 1H 출시 캠페인 검토",
      "- UA 비용 효율 개선 니즈 → CTV/리테일미디어 관심 표명",
      "- 기존 자사 솔루션 MoView는 만족스러우나, attribution 정확도 보강 요구",
      "- 예산: 캠페인 1건당 5억 ± / 연간 50억 규모",
      "",
      "## 액션",
      "- (당사) CTV 매체 카탈로그 1주 내 공유",
      "- (광고주) 내부 KPI 정렬 후 4월 첫 주 재미팅",
      "- 다음 미팅: 2026-04-08 화상",
      "",
      "## 기타",
      "김재훈 매니저 휴대폰 010-1234-9921, 이메일 jh.kim@neoflight.demo",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_samsung",
    title: "삼성전자 Galaxy S26 캠페인 라운드테이블",
    at: daysAgo(6),
    summary: "Galaxy S26 글로벌 캠페인 — 리테일미디어 + AI 자동화 관심",
    topics: ["리테일미디어", "AI 자동화", "글로벌"],
    body: [
      "# 삼성전자 라운드테이블",
      "장소: 강남 사옥 4F",
      "참석(당사): 이지원(팀장), 박민준(AE)",
      "참석(광고주): 김상호(마케팅 그룹장), 이수정(팀장)",
      "",
      "## 논의",
      "- 1H Galaxy S26 출시 캠페인 — 글로벌 동시 진행",
      "- 리테일미디어/CTV 매체 분배 모델 논의",
      "- AI Agent 기반 자동 인사이트 생성 PoC 관심 표명",
      "- 예산: 글로벌 통합 500억 규모",
      "",
      "## 액션",
      "- (당사) MoView + AI 자동화 통합 패키지 제안서 2주 내",
      "- (광고주) 글로벌 본부 의사결정자 컨택 연결",
      "- 다음 미팅: 2026-05-02",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_hyundai",
    title: "현대자동차 EV 캠페인 디스커버리",
    at: daysAgo(10),
    summary: "EV 라인업 글로벌 캠페인 — 브랜드 안전성 강조",
    topics: ["글로벌", "브랜드 안전성", "Attribution"],
    body: [
      "# 현대자동차 EV 캠페인 디스커버리",
      "참석(당사): 박민준(AE)",
      "참석(광고주): 정태영(디지털 마케팅 팀장)",
      "",
      "## 논의",
      "- IONIQ 라인업 글로벌 캠페인 — 북미/유럽 우선",
      "- 브랜드 안전성 매우 중요 — premium inventory 위주 요구",
      "- attribution 데이터 자체 BI에 통합 필요",
      "- 예산: 연간 300억 규모",
      "",
      "## 액션",
      "- (당사) Brand Safety 인벤토리 리스트 + 어트리뷰션 통합 옵션 제안",
      "- 다음 미팅: 2026-05-15",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_toss",
    title: "토스 — 시즌2 캠페인 킥오프",
    at: daysAgo(11),
    summary: "퍼포먼스 + AI 자동화 PoC",
    topics: ["퍼포먼스 캠페인", "AI 자동화"],
    body: [
      "# 토스 시즌2 캠페인 킥오프",
      "참석(당사): 이지원(PM)",
      "참석(광고주): 정민호(그로스 리드)",
      "",
      "## 논의",
      "- 시즌2 캠페인 — ROAS 1.5x 목표",
      "- AI Agent 기반 크리에이티브 자동 최적화 PoC 관심",
      "- 예산: 분기 30억",
      "",
      "## 액션",
      "- (당사) AI 자동화 PoC 제안서 1주 내",
      "- 다음 미팅: 2026-05-02",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_oliveyoung",
    title: "올리브영 — 리테일미디어 그로스 미팅",
    at: daysAgo(7),
    summary: "리테일미디어 자체 솔루션 + 모비데이즈 매체 결합 검토",
    topics: ["리테일미디어", "Attribution"],
    body: [
      "# 올리브영 리테일미디어 미팅",
      "참석(당사): 이지원(팀장)",
      "참석(광고주): 박지영(디지털 마케팅 팀장)",
      "",
      "## 논의",
      "- 자체 리테일미디어 플랫폼 활성화 — 외부 인벤토리 확보 필요",
      "- 어트리뷰션 정확도 보완 우려",
      "",
      "## 액션",
      "- (당사) Attribution Analytics 솔루션 데모",
      "- 다음 미팅: 2026-05-12",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_musinsa",
    title: "무신사 — 글로벌 확장 시즌1 디스커버리",
    at: daysAgo(8),
    summary: "북미/일본 동시 진출 캠페인 검토",
    topics: ["글로벌", "퍼포먼스 캠페인"],
    body: [
      "# 무신사 글로벌 확장",
      "참석(당사): 최지훈(AE)",
      "참석(광고주): 윤하영(글로벌 마케팅 리드)",
      "",
      "## 논의",
      "- 북미·일본 시장 동시 진출",
      "- 모비데이즈 글로벌 매체 네트워크 + AppsFlyer 연동",
      "- 예산: 시즌1 18억",
      "",
      "## 액션",
      "- (당사) 글로벌 매체 큐레이션 + 측정 옵션 제안",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_nexon",
    title: "넥슨 글로벌 매체 라운드테이블",
    at: daysAgo(4),
    summary: "신작 출시 캠페인 — CTV + 리테일미디어",
    topics: ["CTV", "리테일미디어", "Attribution"],
    body: [
      "# 넥슨 글로벌 매체 라운드테이블",
      "참석(당사): 박민준(AE), 이지원(PM)",
      "참석(광고주): 한지수(마케팅 디렉터), 정수민(매니저)",
      "",
      "## 논의",
      "- 신작 'Sentinel' 글로벌 출시 — 한·미·일 동시",
      "- CTV/리테일미디어 통합 캠페인 검토",
      "- attribution은 자체 BI에 통합되어야 함",
      "- 예산: 분기 70억",
      "",
      "## 액션",
      "- (당사) Sentinel 캠페인 통합 제안서 2주 내",
      "- 다음 미팅: 2026-05-09",
    ].join("\n"),
  },
  // ── NEW: 10 rich meeting notes for new companies ─────────────────────
  {
    cmid: "mb_acc_lge",
    title: "LG전자 CTV 글로벌 캠페인 킥오프",
    at: daysAgo(12),
    summary: "OLED TV 글로벌 런치 캠페인 — CTV + 데이터드리븐 마케팅 논의",
    topics: ["CTV", "글로벌", "데이터드리븐마케팅"],
    body: [
      "# LG전자 CTV 글로벌 캠페인 킥오프",
      "장소: LG트윈타워 A동 15F",
      "참석(당사): 박민준(AE), 이지원(PM)",
      "참석(광고주): 오세훈(글로벌 마케팅 팀장), 강민서(디지털 마케팅 매니저)",
      "",
      "## 논의",
      "- OLED TV 신제품 글로벌 동시 런치 캠페인 — 북미/유럽/아시아 동시 집행 검토",
      "- CTV 인벤토리를 핵심 채널로 활용, 프리미엄 가구 타겟팅 니즈",
      "- 데이터드리븐 마케팅: 자체 CRM 데이터와 외부 DMP 연동 가능 여부 확인 요청",
      "- 브랜드세이프티 기준 매우 엄격 — 프리미엄 퍼블리셔 화이트리스트 요구",
      "- 예산: 글로벌 통합 400억 규모, H1 200억 선집행",
      "",
      "## 액션",
      "- (당사) CTV 프리미엄 인벤토리 패키지 + 브랜드세이프티 리스트 2주 내 제안",
      "- (당사) DMP 연동 옵션 기술 검토 후 공유",
      "- (광고주) 글로벌 마케팅 KPI 문서 공유 예정",
      "- 다음 미팅: 2026-06-05 화상",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_skt",
    title: "SK텔레콤 퍼포먼스마케팅 연간 계약 논의",
    at: daysAgo(18),
    summary: "5G 구독 서비스 퍼포먼스 캠페인 — ROAS 목표 정렬 및 어트리뷰션 논의",
    topics: ["퍼포먼스마케팅", "ROAS", "어트리뷰션"],
    body: [
      "# SK텔레콤 퍼포먼스마케팅 연간 계약 논의",
      "장소: SKT 을지로 사옥 20F",
      "참석(당사): 이지원(팀장), 최지훈(AE)",
      "참석(광고주): 임지혜(광고사업 팀장), 윤성준(브랜드 마케팅 매니저)",
      "",
      "## 논의",
      "- 5G 요금제 신규 가입자 확보를 위한 퍼포먼스 캠페인 연간 계획 수립",
      "- ROAS 목표: 전환당 획득비용(CAC) 전년 대비 20% 개선",
      "- 어트리뷰션 모델: 라스트클릭에서 데이터드리븐 모델 전환 희망",
      "- UA 최적화: 20~35세 디지털 네이티브 타겟 집중",
      "- 예산: 연간 350억, 분기별 집행 조율",
      "",
      "## 액션",
      "- (당사) Attribution Analytics 데이터드리븐 모델 데모 일정 조율",
      "- (당사) 퍼포먼스 캠페인 연간 프레임워크 제안서 작성",
      "- 다음 미팅: 2026-05-28",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_lotteshopping",
    title: "롯데쇼핑 리테일미디어 플랫폼 파트너십 논의",
    at: daysAgo(22),
    summary: "롯데온 리테일미디어 광고 인벤토리 외부 파트너 확대 검토",
    topics: ["리테일미디어", "데이터드리븐마케팅", "ROAS"],
    body: [
      "# 롯데쇼핑 리테일미디어 파트너십 논의",
      "장소: 롯데월드타워 29F",
      "참석(당사): 박민준(AE), 박서연(매니저)",
      "참석(광고주): 한소영(통합마케팅 팀장), 조민석(디지털커머스 매니저)",
      "",
      "## 논의",
      "- 롯데온 자체 리테일미디어 플랫폼 고도화 — 외부 광고주 유치 위한 인벤토리 확대",
      "- 모비데이즈 리테일미디어 솔루션 연동으로 외부 DSP 접근성 강화 가능",
      "- 데이터드리븐마케팅: 롯데 멤버십 데이터 활용 타겟팅 정밀도 향상 논의",
      "- ROAS 벤치마크: 롯데백화점 럭셔리 카테고리 3.5x 목표",
      "- 예산: 외부 파트너십 연간 280억 집행 계획",
      "",
      "## 액션",
      "- (당사) Retail Media Solution 연동 기술 제안서 제출",
      "- (광고주) 롯데 멤버십 데이터 연동 가능 범위 법무 검토",
      "- 다음 미팅: 2026-06-10",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_cjenm",
    title: "CJ ENM 글로벌캠페인 & 브랜드세이프티 전략 미팅",
    at: daysAgo(8),
    summary: "K-콘텐츠 글로벌 유통 캠페인 — OTT 광고 및 브랜드세이프티 우선 논의",
    topics: ["글로벌캠페인", "브랜드세이프티", "CTV"],
    body: [
      "# CJ ENM 글로벌캠페인 & 브랜드세이프티 전략 미팅",
      "장소: CJ ENM 상암 스튜디오 센터 10F",
      "참석(당사): 이지원(팀장), 박민준(AE)",
      "참석(광고주): 김태희(광고/미디어 팀장), 박지수(브랜드 전략 매니저)",
      "",
      "## 논의",
      "- tvN·OCN 콘텐츠 글로벌 OTT 유통 연계 캠페인 기획",
      "- CTV 채널을 통한 K-드라마 시청자 타겟 브랜드 캠페인 검토",
      "- 브랜드세이프티: 자사 콘텐츠 IP 보호 및 광고 맥락 적합성 엄격 관리 요구",
      "- 글로벌캠페인 집행 지역: 미국·동남아·일본 우선",
      "- 예산: 글로벌 캠페인 연간 180억, H2 집중 집행",
      "",
      "## 액션",
      "- (당사) CTV Premium Network 글로벌 인벤토리 맵 + 브랜드세이프티 가이드라인 공유",
      "- (당사) K-콘텐츠 연계 광고 사례 스터디 자료 제공",
      "- 다음 미팅: 2026-05-30",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_krafton",
    title: "크래프톤 PUBG 글로벌 UA 전략 회의",
    at: daysAgo(15),
    summary: "PUBG 신규 시즌 글로벌 UA 캠페인 — 어트리뷰션 & 퍼포먼스마케팅 집중 논의",
    topics: ["UA", "어트리뷰션", "퍼포먼스마케팅", "글로벌캠페인"],
    body: [
      "# 크래프톤 PUBG 글로벌 UA 전략 회의",
      "장소: 크래프톤 타워 15F",
      "참석(당사): 최지훈(AE), 이지원(PM)",
      "참석(광고주): 이현수(글로벌 UA 팀장), 박세진(마케팅 매니저)",
      "",
      "## 논의",
      "- PUBG 신규 시즌 론칭 글로벌 UA 캠페인 기획 — 한·미·동남아 동시 집행",
      "- 어트리뷰션: 멀티터치 어트리뷰션 모델 도입 검토, 현재 라스트클릭 한계 인식",
      "- 퍼포먼스마케팅: CPI 기준 전환 최적화, ROAS 2.0x 목표",
      "- 데이터드리븐마케팅: 기존 유저 리텐션 데이터 활용 Lookalike 타겟팅 확대",
      "- 예산: 시즌별 50억, 연간 200억 규모",
      "",
      "## 액션",
      "- (당사) UA Growth Pack + Attribution Analytics 통합 제안서 작성",
      "- (당사) 동남아 매체 인벤토리 큐레이션 리스트 공유",
      "- 다음 미팅: 2026-06-03 화상",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_kbcard",
    title: "KB국민카드 데이터드리븐마케팅 전략 워크샵",
    at: daysAgo(20),
    summary: "카드 신상품 론칭 퍼포먼스 캠페인 — 데이터드리븐 타겟팅 및 ROAS 최적화",
    topics: ["데이터드리븐마케팅", "퍼포먼스마케팅", "ROAS"],
    body: [
      "# KB국민카드 데이터드리븐마케팅 전략 워크샵",
      "장소: KB금융타워 12F",
      "참석(당사): 박서연(매니저), 박민준(AE)",
      "참석(광고주): 김은정(마케팅 본부장), 류상혁(디지털마케팅 팀장)",
      "",
      "## 논의",
      "- KB국민카드 신상품 '청년 혜택 카드' 출시 기념 퍼포먼스 캠페인",
      "- 데이터드리븐마케팅: KB Pay 거래 데이터 기반 정밀 타겟팅 가능성 논의",
      "- ROAS 목표: 신규 카드 발급 건당 CAC 50,000원 이하",
      "- 어트리뷰션: 온라인-오프라인 통합 고객 여정 추적 솔루션 요청",
      "- 예산: 론칭 캠페인 50억, 연간 250억 계획",
      "",
      "## 액션",
      "- (당사) Attribution Analytics 온오프라인 통합 데모 제공",
      "- (당사) 금융권 퍼포먼스 캠페인 사례 레퍼런스 공유",
      "- 다음 미팅: 2026-06-01",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_shinhancard",
    title: "신한카드 AI 마케팅 자동화 PoC 제안",
    at: daysAgo(14),
    summary: "AI Agent 기반 캠페인 자동 최적화 PoC 논의 — 퍼포먼스마케팅 효율화",
    topics: ["AI 자동화", "퍼포먼스마케팅", "어트리뷰션"],
    body: [
      "# 신한카드 AI 마케팅 자동화 PoC 제안",
      "장소: 신한카드 본사 회의실 8F",
      "참석(당사): 이지원(팀장), 최지훈(AE)",
      "참석(광고주): 나혜리(마케팅전략 팀장)",
      "",
      "## 논의",
      "- AI Agent 기반 캠페인 자동 최적화 PoC 범위 논의",
      "- 퍼포먼스마케팅: 크리에이티브 A/B 테스트 자동화, 입찰 최적화 AI 도입 검토",
      "- 어트리뷰션: 신한카드 앱 내 전환 추적 고도화 필요",
      "- 데이터드리븐마케팅: 카드 사용 패턴 기반 세그먼트 타겟팅 확대",
      "- PoC 기간: 3개월, 예산 10억 선집행",
      "",
      "## 액션",
      "- (당사) AI Marketing Agent PoC 제안서 1주 내 제출",
      "- (당사) 유사 금융사 AI 자동화 성과 사례 공유",
      "- 다음 미팅: 2026-05-27 화상",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_woowa",
    title: "우아한형제들 브랜드세이프티 & 퍼포먼스 통합 캠페인 미팅",
    at: daysAgo(9),
    summary: "배달의민족 앱 광고 + 외부 퍼포먼스 채널 통합 — 브랜드세이프티 강화 논의",
    topics: ["퍼포먼스마케팅", "브랜드세이프티", "ROAS", "데이터드리븐마케팅"],
    body: [
      "# 우아한형제들 브랜드세이프티 & 퍼포먼스 통합 캠페인 미팅",
      "장소: 우아한형제들 송파 본사 7F",
      "참석(당사): 이지원(팀장), 박민준(AE)",
      "참석(광고주): 강태민(마케팅 본부장), 오지현(퍼포먼스 마케팅 팀장)",
      "",
      "## 논의",
      "- 배달의민족 자체 광고 플랫폼과 외부 퍼포먼스 채널 통합 운영 방안 논의",
      "- 브랜드세이프티: 음식 카테고리 관련 민감 콘텐츠 필터링 강화 요구",
      "- 퍼포먼스마케팅: 주문 전환율 기준 ROAS 4.0x 목표, 계절성 고려한 자동 입찰",
      "- 데이터드리븐마케팅: 주문 이력 데이터 기반 재주문 타겟팅 캠페인 효율화",
      "- 예산: 연간 300억, 분기 집행 유동적",
      "",
      "## 액션",
      "- (당사) 리테일미디어 + 퍼포먼스 통합 캠페인 프레임워크 제안서 제출",
      "- (당사) 브랜드세이프티 솔루션 데모 일정 확정",
      "- 다음 미팅: 2026-06-02",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_shinhanbank",
    title: "신한은행 디지털 마케팅 전략 세션",
    at: daysAgo(30),
    summary: "디지털 신규 고객 획득 캠페인 — UA 및 어트리뷰션 고도화",
    topics: ["UA", "어트리뷰션", "퍼포먼스마케팅"],
    body: [
      "# 신한은행 디지털 마케팅 전략 세션",
      "장소: 신한금융그룹 본사 15F",
      "참석(당사): 박서연(매니저), 최지훈(AE)",
      "참석(광고주): 정우진(디지털마케팅 팀장), 이서현(브랜드 매니저)",
      "",
      "## 논의",
      "- 신한은행 SOL 앱 신규 고객 UA 캠페인 기획",
      "- 어트리뷰션: 앱 설치 → 계좌 개설 → 첫 거래 전체 퍼널 추적 솔루션 요청",
      "- 퍼포먼스마케팅: 금융 규제 준수 광고 소재 및 매체 선별 필요",
      "- 브랜드세이프티: 은행업 특성상 리스크 콘텐츠 완전 차단 요구",
      "- 예산: H2 캠페인 90억, 연간 180억 계획",
      "",
      "## 액션",
      "- (당사) 금융권 규제 준수 매체 화이트리스트 + UA 성과 사례 제공",
      "- (당사) Attribution Analytics 금융 퍼널 트래킹 옵션 제안",
      "- 다음 미팅: 2026-06-08",
    ].join("\n"),
  },
  {
    cmid: "mb_acc_kbbank",
    title: "KB국민은행 통합 디지털 캠페인 연간 계획 수립",
    at: daysAgo(18),
    summary: "KB국민은행 스타뱅킹 앱 퍼포먼스 + 브랜드 통합 연간 캠페인 협의",
    topics: ["퍼포먼스마케팅", "브랜드세이프티", "데이터드리븐마케팅", "어트리뷰션"],
    body: [
      "# KB국민은행 통합 디지털 캠페인 연간 계획 수립",
      "장소: KB국민은행 여의도 본점 18F",
      "참석(당사): 이지원(팀장), 박민준(AE)",
      "참석(광고주): 안성민(마케팅 본부장), 전소현(디지털마케팅 팀장)",
      "",
      "## 논의",
      "- KB스타뱅킹 신규 고객 획득 및 기존 고객 상품 교차판매 통합 캠페인",
      "- 퍼포먼스마케팅: CPA(cost per account) 기준 전환 최적화, 전년 대비 25% 개선 목표",
      "- 데이터드리븐마케팅: KB Pay·KB증권 연계 고객 데이터 활용 세그먼트 타겟팅",
      "- 어트리뷰션: 멀티터치 기여 모델 도입으로 채널별 기여도 정확히 측정",
      "- 브랜드세이프티: 금융 광고 관련 법적 규제 완전 준수 요구",
      "- 예산: 연간 200억, 분기별 집행",
      "",
      "## 액션",
      "- (당사) 연간 통합 캠페인 제안서 + Attribution Analytics 도입 로드맵 제출",
      "- (당사) 타 금융사 데이터드리븐 마케팅 성공 사례 공유",
      "- 다음 미팅: 2026-06-05",
    ].join("\n"),
  },
];

const EMAIL_ACTIVITIES: { cmid: string; at: Date; direction: "In" | "Out"; subject: string; body: string; topics?: string[] }[] = [
  {
    cmid: "mb_acc_samsung",
    at: daysAgo(20),
    direction: "In",
    subject: "Re: Max Summit 2026 사전 미팅 요청",
    body: "이지원 팀장님, 메일 주신 사전 미팅 일정 조율 가능합니다. 5월 첫 주가 가장 적합합니다.",
    topics: ["Max Summit"],
  },
  {
    cmid: "mb_acc_neoflight",
    at: daysAgo(30),
    direction: "Out",
    subject: "[모비데이즈] CTV 매체 카탈로그 송부의 건",
    body: "안녕하세요 김재훈 매니저님, 지난 미팅에서 약속드린 CTV 매체 카탈로그 PDF 첨부드립니다.",
    topics: ["CTV"],
  },
  {
    cmid: "mb_acc_toss",
    at: daysAgo(25),
    direction: "In",
    subject: "Re: AI 자동화 PoC 협의",
    body: "PoC 범위에 대해 추가 논의가 필요합니다. 다음 주 화상 미팅 가능하실까요?",
    topics: ["AI 자동화"],
  },
];

const PROPOSAL_SEEDS: { cmid: string; title: string; at?: Date; amount?: number; outcome: string; failReason?: string }[] = [
  { cmid: "mb_acc_neoflight", title: "Skyborne 1H 글로벌 캠페인 제안", at: daysAgo(120), amount: 5_0000_0000, outcome: "Won" },
  { cmid: "mb_acc_pixelnest", title: "픽셀네스트 신작 캠페인 제안", at: daysAgo(60), amount: 3_0000_0000, outcome: "Lost", failReason: "Price" },
  { cmid: "mb_acc_ncsoft", title: "엔씨소프트 신작 캠페인 제안", at: daysAgo(40), amount: 25_0000_0000, outcome: "Lost", failReason: "Fit" },
  { cmid: "mb_acc_amorepacific", title: "리테일미디어 그로스 제안", at: daysAgo(180), amount: 12_0000_0000, outcome: "Won" },
  { cmid: "mb_acc_yanolja", title: "야놀자 캠페인 제안", at: daysAgo(200), amount: 8_0000_0000, outcome: "Lost", failReason: "Timing" },
];

const BIDDING_SEEDS: { cmid?: string; title: string; issued: Date; deadline: Date; amount?: number; status: string; score?: number }[] = [
  { cmid: "mb_acc_hyundai", title: "현대자동차 EV 글로벌 2H 캠페인 입찰", issued: daysAgo(3), deadline: daysAgo(-25), amount: 50_0000_0000, status: "Reviewing", score: 4.2 },
  { cmid: "mb_acc_naver", title: "NAVER 클라우드 신규 캠페인 비공개 입찰", issued: daysAgo(5), deadline: daysAgo(-18), amount: 12_0000_0000, status: "Joined", score: 3.8 },
  { cmid: "mb_acc_baemin", title: "배달의민족 시즌 캠페인 RFP", issued: daysAgo(1), deadline: daysAgo(-30), amount: 18_0000_0000, status: "Detected", score: 3.5 },
];

const PRODUCT_SEEDS: { id: string; name: string; category: string; description: string; useCases?: string[]; fitTopics?: string[] }[] = [
  { id: "prd_moview", name: "MoView", category: "Solution", description: "광고 운영 & 측정 솔루션. 채널 통합 리포팅과 어트리뷰션을 한 플랫폼에서 제공.", useCases: ["멀티 채널 캠페인", "퍼포먼스 측정"], fitTopics: ["Attribution", "퍼포먼스 캠페인"] },
  { id: "prd_ctv", name: "CTV Premium Network", category: "Media", description: "글로벌 CTV/스마트TV 인벤토리 패키지. 브랜드 안전성 우선.", useCases: ["브랜드 캠페인", "글로벌 동시 출시"], fitTopics: ["CTV", "글로벌", "브랜드 안전성"] },
  { id: "prd_retail", name: "Retail Media Solution", category: "Solution", description: "리테일 플랫폼 인벤토리 큐레이션 + 분석. 커머스 광고주 맞춤.", useCases: ["리테일미디어 활성화"], fitTopics: ["리테일미디어", "Attribution"] },
  { id: "prd_attr_ai", name: "Attribution Analytics", category: "Solution", description: "AI 기반 멀티 터치 어트리뷰션 + Brand Lift.", useCases: ["측정 고도화"], fitTopics: ["Attribution", "AI 자동화"] },
  { id: "prd_ua_growth", name: "UA Growth Pack", category: "Service", description: "게임 UA 효율 개선 통합 패키지. 글로벌 매체 + AI 입찰 최적화.", useCases: ["게임 UA", "글로벌 진출"], fitTopics: ["UA", "글로벌", "퍼포먼스 캠페인"] },
  { id: "prd_ai_agent", name: "AI Marketing Agent", category: "Solution", description: "마케팅 의사결정을 보조하는 AI Agent — 캠페인 자동 최적화 / 리포팅.", useCases: ["AX 도입"], fitTopics: ["AI 자동화"] },
];

const SESSION_SEEDS: { id: string; title: string; track: string; description: string; topics?: string[]; speakers?: string[] }[] = [
  { id: "ses_ctv_track", title: "CTV가 다시 쓰는 마케팅 룰북", track: "CTV", description: "리테일·게임 광고주가 CTV로 전환을 만든 사례 모음", topics: ["CTV", "리테일미디어"], speakers: ["김상호 (삼성)"] },
  { id: "ses_retail_track", title: "리테일미디어, 진짜 ROI 구하기", track: "Retail Media", description: "어트리뷰션과 인크리멘탈리티 측정", topics: ["리테일미디어", "Attribution"] },
  { id: "ses_game_ua", title: "게임 UA: 글로벌 출시 24시간", track: "Game", description: "글로벌 동시 출시 UA 캠페인 베스트 프랙티스", topics: ["UA", "글로벌", "퍼포먼스 캠페인"] },
  { id: "ses_ai_track", title: "AI Agent와 마케팅 자동화", track: "AI", description: "Sales / 마케팅 Agent를 활용한 AX 사례", topics: ["AI 자동화"] },
  { id: "ses_brand_safety", title: "Brand Safety 다시 보기", track: "Brand", description: "Premium 인벤토리 큐레이션", topics: ["브랜드 안전성"] },
  { id: "ses_measurement", title: "측정의 미래: ID 없이 살아남기", track: "Measurement", description: "Post-cookie 어트리뷰션", topics: ["Attribution"] },
];

const INVITATION_HISTORY: { eventId: string; cmid: string; status: string; invitedAt: Date; attendedAt?: Date }[] = [
  { eventId: "evt_max2026", cmid: "mb_acc_samsung", status: "Invited", invitedAt: daysAgo(20) },
  { eventId: "evt_max2026", cmid: "mb_acc_neoflight", status: "Invited", invitedAt: daysAgo(18) },
  { eventId: "evt_max2026", cmid: "mb_acc_hyundai", status: "Confirmed", invitedAt: daysAgo(25), attendedAt: undefined },
  { eventId: "evt_max2026", cmid: "mb_acc_oliveyoung", status: "Confirmed", invitedAt: daysAgo(15) },
];

const MDM_QUEUE: { leftCmid: string | null; right: { system: string; recordId: string; name: string }; score: number; features: Record<string, number> }[] = [
  {
    leftCmid: "mb_acc_daangn",
    right: { system: "Sheet:prospects-v3", recordId: "row#311", name: "Daangn Inc." },
    score: 0.83,
    features: { name_sim: 0.92, domain: 1, address: 0, industry: 1 },
  },
  {
    leftCmid: null,
    right: { system: "Sheet:prospects-v3", recordId: "row#404", name: "삼성공구사" },
    score: 0.71,
    features: { name_sim: 0.78, domain: 0, address: 0, industry: 0.6 },
  },
];

const RULES = [
  {
    id: "rule.customer_tier.v1",
    name: "광고주 등급 자동 분류",
    description: "예산/매출/관계점수/최근접점/제안이력 기반 A~D 자동 등급",
    yaml: `id: rule.customer_tier.v1
name: 광고주 등급 자동 분류
version: 1
status: active
owner_team: sales_strategy
description: 예산/매출/관계점수/최근접점/제안이력 기반 A~D 자동 등급

trigger:
  type: any_of
  events:
    - on_change: accounts.marketing_budget_krw
    - on_change: accounts.annual_revenue_krw
    - cron: "0 4 * * *"

inputs:
  - alias: budget
    source: accounts.marketing_budget_krw
    default: 0
  - alias: revenue
    source: accounts.annual_revenue_krw
    default: 0
  - alias: rel_score
    source: accounts.relationship_score
    default: 0
  - alias: proposal_count_12m
    expr: proposals.count(12_months)
    default: 0
  - alias: days_idle
    expr: days_since_last_touch
    default: 999

logic:
  type: decision_table
  hit_policy: priority
  rules:
    - if: "budget >= 50_000_000_000 AND revenue >= 1_000_000_000_000 AND rel_score >= 70"
      then: { customer_tier: "A", confidence: 0.95 }
    - if: "budget >= 20_000_000_000 AND rel_score >= 60"
      then: { customer_tier: "B", confidence: 0.85 }
    - if: "proposal_count_12m >= 1 OR rel_score >= 40"
      then: { customer_tier: "C", confidence: 0.75 }
    - else:
        then: { customer_tier: "D", confidence: 0.65 }

outputs:
  - write: accounts.customer_tier
    requires_approval: false

sla:
  p95_latency_ms: 500
`,
  },
  {
    id: "rule.no_reply_reminder.v1",
    name: "초청 후 7일 무응답 → 리마인드",
    description: "Invited 상태로 7일 경과 + 미응답이면 리마인드 액션 생성",
    yaml: `id: rule.no_reply_reminder.v1
name: 초청 후 7일 무응답 리마인드
version: 1
status: active
owner_team: sales_ops
description: Invited 상태로 7일 경과 + 미응답이면 리마인드 액션 생성

inputs:
  - alias: stage
    source: accounts.lead_stage
  - alias: days_idle
    expr: days_since_last_touch
    default: 0

logic:
  type: decision_table
  hit_policy: priority
  rules:
    - if: 'stage == "Invited" AND days_idle >= 7'
      then: { action: "SendReminder", priority: 2 }
    - else:
        then: { action: "None" }

outputs:
  - write: accounts.lead_stage
    when: 'false'
`,
  },
  {
    id: "rule.bidding_decision.v1",
    name: "비딩 참여 권장도 산정",
    description: "비딩 공고에 대해 산업 적합·관계·과거 수주 이력 기반 1~5 권장도",
    yaml: `id: rule.bidding_decision.v1
name: 비딩 참여 권장도
version: 1
status: active
owner_team: sales_strategy

inputs:
  - alias: rel_score
    source: accounts.relationship_score
    default: 0
  - alias: budget
    source: accounts.marketing_budget_krw
    default: 0
  - alias: prop_count
    expr: proposals.count(12_months)
    default: 0

logic:
  type: decision_table
  hit_policy: priority
  rules:
    - if: "rel_score >= 70 AND prop_count >= 1"
      then: { recommendation: 5, label: "강력 추천" }
    - if: "rel_score >= 50 OR budget >= 10_000_000_000"
      then: { recommendation: 4, label: "추천" }
    - if: "rel_score >= 30"
      then: { recommendation: 3, label: "검토" }
    - else:
        then: { recommendation: 2, label: "보류 권장" }

outputs:
  - emit_event: bidding_decision_scored
`,
  },
];

// Standalone CLI entry. Only runs when this file is executed directly
// (via `npx tsx prisma/seed.ts`), not when imported by API routes.
if (require.main === module) {
  const cliPrisma = new PrismaClient();
  main(cliPrisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await cliPrisma.$disconnect();
    });
}
