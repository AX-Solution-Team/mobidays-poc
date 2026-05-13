import { NextResponse } from "next/server";
import { z } from "zod";

import { matchRecord, type SourceRecord } from "@/lib/mdm/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  businessNo: z.string().optional().nullable(),
  dartCorpCode: z.string().optional().nullable(),
  corporateNo: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  let body: SourceRecord;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "잘못된 요청";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Slight artificial delay so the UI animation feels meaningful (~600ms)
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 300));

  const result = await matchRecord(body);
  return NextResponse.json(result);
}
