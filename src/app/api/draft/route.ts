import { NextResponse } from "next/server";
import { z } from "zod";

import { draftMessage } from "@/lib/agent/message";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  cmid: z.string(),
  purpose: z.enum(["Invitation", "Proposal", "Reminder", "FollowUp", "PostEvent"]),
  tone: z.enum(["formal", "friendly", "concise"]).default("formal"),
  sessionId: z.string().optional(),
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
  const account = await prisma.account.findUnique({
    where: { cmid: body.cmid },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      activities: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
  });
  if (!account) {
    return NextResponse.json({ error: "광고주를 찾을 수 없습니다" }, { status: 404 });
  }
  let sessionTitle: string | undefined;
  if (body.sessionId) {
    const s = await prisma.session.findUnique({ where: { id: body.sessionId } });
    if (s) sessionTitle = s.title;
  }
  const draft = await draftMessage({
    purpose: body.purpose,
    accountName: account.canonicalName,
    contactName: account.contacts[0]?.fullName,
    contactTitle: account.contacts[0]?.title ?? undefined,
    tone: body.tone,
    topics: account.activities[0]
      ? JSON.parse(account.activities[0].topicsJson) as string[]
      : [],
    sessionTitle,
    personalTouch: account.activities[0]?.bodySummary ?? undefined,
  });
  return NextResponse.json(draft);
}
