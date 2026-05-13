import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { MessageComposer } from "./message-composer";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ cmid?: string; purpose?: string; sessionId?: string }>;
}) {
  const params = await searchParams;
  const accounts = await prisma.account.findMany({
    orderBy: { canonicalName: "asc" },
    select: {
      cmid: true,
      canonicalName: true,
      industryLabel: true,
      contacts: {
        where: { isPrimary: true },
        select: { fullName: true, title: true, email: true },
        take: 1,
      },
    },
  });
  const sessions = await prisma.session.findMany({
    select: { id: true, title: true, track: true },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales Solution Agent"
        title="메시지 초안 작성"
        description="AI Agent가 초청·제안·리마인드·팔로업 메시지 초안을 자동 생성합니다. 사용자가 검토·수정 후 Gmail Deep-link로 발송합니다."
        breadcrumbs={[
          { href: "/", label: "홈" },
          { href: "/agent", label: "Agent" },
          { label: "메시지 초안" },
        ]}
      />
      <MessageComposer
        accounts={accounts}
        sessions={sessions}
        initialCmid={params.cmid}
        initialPurpose={params.purpose}
        initialSessionId={params.sessionId}
      />
    </AppShell>
  );
}
