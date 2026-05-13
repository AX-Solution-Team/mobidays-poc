import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { runRule } from "@/lib/rules/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ruleId: z.string().optional(),
  yaml: z.string().optional(),
  cmid: z.string(),
  dryRun: z.boolean().default(true),
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

  // Single-rule execution → always audit (trigger='api'), regardless of dryRun.
  // The dryRun flag controls whether DB writes are applied; the audit log
  // captures the intent either way so operators can trace decisions.
  const result = await runRule(
    yamlText,
    { cmid: body.cmid },
    { trigger: "api", dryRun: body.dryRun, applyOutputs: !body.dryRun },
  );

  return NextResponse.json(jsonifyBig(result));
}

function jsonifyBig(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonifyBig);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = jsonifyBig(v);
    }
    return out;
  }
  return value;
}
