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
