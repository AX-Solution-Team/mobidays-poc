// Mock message drafting — purpose-based templates with personalization slots.

export type MessagePurpose =
  | "Invitation"
  | "Proposal"
  | "Reminder"
  | "FollowUp"
  | "PostEvent";

export interface DraftInput {
  purpose: MessagePurpose;
  accountName: string;
  contactName?: string;
  contactTitle?: string;
  tone?: "formal" | "friendly" | "concise";
  topics?: string[];
  sessionTitle?: string;
  personalTouch?: string;
  signature?: string;
}

export interface DraftOutput {
  subject: string;
  body: string;
  variables: Record<string, string>;
  evidence: { type: string; text: string }[];
}

export async function draftMessage(input: DraftInput): Promise<DraftOutput> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  const tone = input.tone ?? "formal";
  const greet =
    tone === "friendly"
      ? `${input.contactName ?? "담당자"}님 안녕하세요,`
      : `${input.contactName ?? "담당자"}${input.contactTitle ? " " + input.contactTitle : ""}님께,`;

  const signature = input.signature ?? "모비데이즈 세일즈 / 이지원";
  const topicLine =
    input.topics && input.topics.length > 0
      ? `${input.topics.slice(0, 2).join(" · ")} 관련 최근 관심`
      : "최근 미팅에서 논의된 내용";

  let subject = "";
  let body = "";

  switch (input.purpose) {
    case "Invitation":
      subject = `${input.accountName}의 ${topicLine}에 도움 될 Max Summit 2026 초대`;
      body = [
        greet,
        ``,
        `${input.personalTouch ?? "지난 미팅에서 말씀해주신 UA 효율 개선 이슈는 저희도 같은 고민을 하고 있어서 더 깊이 함께 보고 싶었습니다."}`,
        ``,
        `오는 8월 4일, 모비데이즈가 개최하는 마케팅 컨퍼런스 Max Summit 2026에 ${input.accountName}을 초대드립니다.`,
        input.sessionTitle
          ? `특히 «${input.sessionTitle}» 세션은 말씀하신 토픽과 직접 연결되어 있어서 권해드립니다.`
          : `요청 주제와 관련된 트랙을 별도 큐레이션하여 안내드릴 예정입니다.`,
        ``,
        `편하신 시간에 회신주시면 자리 미리 잡아두겠습니다.`,
        ``,
        `${signature} 드림`,
      ].join("\n");
      break;
    case "Proposal":
      subject = `${input.accountName} 캠페인 제안 — ${topicLine}`;
      body = [
        greet,
        ``,
        `검토 부탁드리고 싶은 캠페인 제안을 정리해 첨부드립니다.`,
        `요청하신 ${input.topics?.[0] ?? "퍼포먼스"} 영역에 맞춰 MoView / CTV 인벤토리 / 어트리뷰션 솔루션을 결합한 패키지로 구성했습니다.`,
        ``,
        `미팅에서 정해주신 KPI(ROAS / CTR / 신규 유저 비율)를 기준으로 BAU 시뮬레이션 결과까지 함께 첨부드렸으니 참고 부탁드립니다.`,
        ``,
        `${signature} 드림`,
      ].join("\n");
      break;
    case "Reminder":
      subject = `Re: ${input.accountName} — Max Summit 초청 확인 부탁드립니다`;
      body = [
        greet,
        ``,
        `앞서 보내드린 Max Summit 초대 건에 대해 회신을 기다리고 있어 다시 한 번 안내드립니다.`,
        `요청하신 ${input.topics?.[0] ?? "주요 토픽"} 세션의 좌석을 일주일 더 보류해두었으니, 일정만 확정 부탁드립니다.`,
        ``,
        `${signature} 드림`,
      ].join("\n");
      break;
    case "FollowUp":
      subject = `${input.accountName} — 지난 미팅 팔로업`;
      body = [
        greet,
        ``,
        `${input.personalTouch ?? "오늘 좋은 자리 만들어주셔서 감사합니다."}`,
        `미팅에서 논의된 ${input.topics?.[0] ?? "다음 단계"} 관련 자료를 첨부드립니다.`,
        ``,
        `다음 미팅 후보 일정을 두 가지 보내드리니, 가능한 시간 알려주세요.`,
        ``,
        `${signature} 드림`,
      ].join("\n");
      break;
    case "PostEvent":
      subject = `Max Summit 2026 — ${input.accountName} 다시 한 번 감사드립니다`;
      body = [
        greet,
        ``,
        `행사에서 ${input.contactName ?? "담당자"}님과 좋은 시간 가질 수 있어 감사했습니다.`,
        `행사 중 관심 보여주신 ${input.topics?.[0] ?? "리테일 미디어"} 트랙 세션 녹화본과 추가 자료를 정리해 드립니다.`,
        ``,
        `후속 미팅을 잡고 더 깊이 논의드리고 싶은데, 다음 주 일정 가능하실까요?`,
        ``,
        `${signature} 드림`,
      ].join("\n");
      break;
  }

  return {
    subject,
    body,
    variables: {
      account_name: input.accountName,
      contact_name: input.contactName ?? "",
      contact_title: input.contactTitle ?? "",
      first_topic: input.topics?.[0] ?? "",
      session_title: input.sessionTitle ?? "",
    },
    evidence: [
      input.personalTouch
        ? { type: "meeting_note", text: input.personalTouch.slice(0, 200) }
        : { type: "topic_match", text: `요청 주제: ${input.topics?.join(", ") ?? "—"}` },
    ],
  };
}
