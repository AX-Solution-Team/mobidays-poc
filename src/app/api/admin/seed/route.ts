import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { runSeed } from "../../../../../prisma/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/admin/seed
//   Idempotent destructive seed — drops + re-inserts all demo data.
//   The demo is publicly accessible, so a SEED_SECRET env var gates this
//   endpoint to prevent random visitors from wiping the DB.
export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  if (secret) {
    const provided =
      req.headers.get("x-seed-secret") ??
      new URL(req.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const t0 = Date.now();
    await runSeed(prisma);
    const ms = Date.now() - t0;
    const counts = await collectCounts();
    return NextResponse.json({
      ok: true,
      latencyMs: ms,
      counts,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// GET /api/admin/seed → row counts (handy health probe, no destructive op)
export async function GET() {
  return NextResponse.json({ counts: await collectCounts() });
}

async function collectCounts() {
  const [
    accounts,
    sfAccounts,
    sheetProspects,
    documents,
    activities,
    rules,
    executions,
    mdmCandidates,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.sfAccount.count(),
    prisma.sheetProspect.count(),
    prisma.document.count(),
    prisma.activity.count(),
    prisma.ruleDefinition.count(),
    prisma.ruleExecution.count(),
    prisma.mdmCandidate.count(),
  ]);
  return {
    accounts,
    sfAccounts,
    sheetProspects,
    documents,
    activities,
    rules,
    executions,
    mdmCandidates,
  };
}
