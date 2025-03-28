import { DebateTemplate } from "./types/debate";

// 기본 토론 템플릿 데이터
export const debateTemplates: DebateTemplate[] = [
  {
    id: "free-debate",
    name: "자유토론",
    description: "찬반 입론 후 자유롭게 의견 교환하고 마무리 발언으로 마무리하는 기본형 토론",
    icon: "zap",
    guide: "자유토론은 가장 일반적인 토론 형식으로, 찬성과 반대 측이 자유롭게 의견을 교환합니다. 시작 시 각 측의 기본 입장을 발표하고, 자유토론 시간에는 자유롭게 발언할 수 있습니다. 마지막에는 각 측이 마무리 발언을 통해 자신의 입장을 정리합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 120, team: "찬성" },
      { id: "step-2", type: "입론", time: 120, team: "반대" },
      { id: "step-3", type: "자유토론", time: 1200, maxSpeakTime: 120 }, // 20분, 최대 발언 2분
      { id: "step-4", type: "마무리 발언", time: 60, team: "반대" },
      { id: "step-5", type: "마무리 발언", time: 60, team: "찬성" },
    ],
  },
  {
    id: "facilitation-debate",
    name: "퍼실리테이션 토론",
    description: "사회자 주도 하에 협력과 합의를 중심으로 결론을 도출하는 참여형 토론",
    icon: "users",
    guide: "퍼실리테이션 토론은 '공동 결론 도출'을 목표로 하는 협력적 토론 형식입니다. 사회자(퍼실리테이터)가 토론을 진행하며, 참가자들이 소그룹으로 나뉘어 토론하고 발표하는 과정을 거칩니다. 갈등보다는 합의에 초점을 두는 형식입니다.",
    steps: [
      { id: "step-1", type: "사회자 인사", time: 120, team: null }, // 주제 안내 및 목표 설정
      { id: "step-2", type: "입론", time: 180, team: null }, // 참가자 문제 인식 공유
      { id: "step-3", type: "자유토론", time: 600, team: null, maxSpeakTime: 120 }, // 소그룹 토론 10분
      { id: "step-4", type: "자유토론", time: 300, team: null, maxSpeakTime: 60 }, // 소그룹 발표 및 전체 공유
      { id: "step-5", type: "자유토론", time: 300, team: null, maxSpeakTime: 60 }, // 퍼실리테이터가 갈등 조율 및 종합
      { id: "step-6", type: "자유토론", time: 180, team: null, maxSpeakTime: 30 }, // 전체 공동 결론 도출
      { id: "step-7", type: "마무리 발언", time: 120, team: null }, // 요약 및 피드백 공유
    ],
  },
  {
    id: "spar-debate",
    name: "SPAR 토론",
    description: "즉흥 주제로 짧고 강하게 진행되는 1:1 스피치형 토론",
    icon: "zap",
    guide: "SPAR 토론은 6분 정도의 짧고 강한 1:1 즉흥 토론 형식입니다. 주제 제시 후 짧은 준비 시간을 가진 뒤, 찬반 각각 1분씩 입론하고 2분간 자유롭게 질문과 반박을 교환합니다. 마지막으로 각 30초씩 마무리 발언을 합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 30, team: null }, // 주제 제시 및 입장 선택
      { id: "step-2", type: "숙의시간", time: 30, team: null }, // 준비 시간
      { id: "step-3", type: "입론", time: 60, team: "찬성" }, // 찬성 입론
      { id: "step-4", type: "입론", time: 60, team: "반대" }, // 반대 입론
      { id: "step-5", type: "교차질의", time: 120, team: null }, // 교차 질문/반박
      { id: "step-6", type: "마무리 발언", time: 30, team: "찬성" }, // 찬성 마무리 발언
      { id: "step-7", type: "마무리 발언", time: 30, team: "반대" }, // 반대 마무리 발언
    ],
  },
  {
    id: "lincoln-douglas",
    name: "링컨-더글라스 토론",
    description: "긴 시간의 입론과 반론을 통해 깊이 있게 주제를 다루는 미국식 토론",
    icon: "award",
    guide: "링컨-더글라스 토론은 구조화된 토론 형식으로, 미국의 정치 토론에서 유래했습니다. 찬성 측이 먼저 입론을 하고, 이후 교차질의와 반론 시간이 교대로 이어집니다. 발언 시간이 길어 주제에 대한 깊이 있는 논의가 가능합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 360, team: "찬성" },
      { id: "step-2", type: "교차질의", time: 180, team: "반대" },
      { id: "step-3", type: "입론", time: 360, team: "반대" },
      { id: "step-4", type: "교차질의", time: 180, team: "찬성" },
      { id: "step-5", type: "반론", time: 240, team: "찬성" },
      { id: "step-6", type: "반론", time: 240, team: "반대" },
      { id: "step-7", type: "마무리 발언", time: 120, team: "찬성" },
    ],
  },
  {
    id: "seda-debate",
    name: "세다토론",
    description: "교차질의와 자유토론을 포함한 대학 맞춤형 구조화 토론",
    icon: "users",
    guide: "세다토론은 대학 토론에서 자주 사용되는 방식으로, 입론-교차질의-자유토론-마무리 발언의 순서로 진행됩니다. 각 팀의 논리적 주장과 반박을 중시하며, 교차질의 시간을 통해 상대방 주장의 약점을 파악하는 것이 중요합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 180, team: "찬성" },
      { id: "step-2", type: "입론", time: 180, team: "반대" },
      { id: "step-3", type: "교차질의", time: 120, team: "찬성" },
      { id: "step-4", type: "교차질의", time: 120, team: "반대" },
      { id: "step-5", type: "자유토론", time: 600, maxSpeakTime: 90 },
      { id: "step-6", type: "마무리 발언", time: 90, team: "반대" },
      { id: "step-7", type: "마무리 발언", time: 90, team: "찬성" },
    ],
  },
  {
    id: "oxford-debate",
    name: "옥스퍼드 토론",
    description: "찬반 토론 후 청중 투표를 통해 설득력을 평가하는 대중 참여형 토론",
    icon: "award",
    guide: "옥스퍼드 토론은 영국 옥스퍼드 대학에서 유래한 형식으로, 청중의 참여가 특징입니다. 토론 전후에 청중 투표를 실시하여 어느 쪽이 더 많은 청중을 설득했는지 평가합니다. 청중 질문 시간과 패널 질문 시간이 포함되어 있습니다.",
    steps: [
      { id: "step-1", type: "사회자 인사", time: 60, team: null }, // 사회자 인사 및 주제 소개
      { id: "step-2", type: "입론", time: 90, team: "찬성" }, // 찬성 측 입론 (기조발언)
      { id: "step-3", type: "입론", time: 90, team: "반대" }, // 반대 측 입론 (기조발언)
      { id: "step-4", type: "청중 사전 투표", time: 60, team: null }, // 청중 사전 투표
      { id: "step-5", type: "교차질의", time: 180, team: null }, // 교차 질의 및 짧은 반박
      { id: "step-6", type: "청중 질문", time: 150, maxSpeakTime: 30 }, // 청중 질문
      { id: "step-7", type: "패널 질문", time: 150, maxSpeakTime: 30 }, // 패널 질문
      { id: "step-8", type: "숙의시간", time: 60, team: null }, // 숙의 시간
      { id: "step-9", type: "마무리 발언", time: 90, team: "반대" }, // 반대 측 마무리 발언
      { id: "step-10", type: "마무리 발언", time: 90, team: "찬성" }, // 찬성 측 마무리 발언
      { id: "step-11", type: "결과 발표", time: 120, team: null }, // 청중 최종 투표 및 결과 발표
    ],
  },
  {
    id: "roleplaying-debate",
    name: "롤플레잉 토론",
    description: "참가자가 특정 역할에 몰입해 다양한 관점에서 주장하는 시뮬레이션형 토론",
    icon: "users",
    guide: "롤플레잉 토론은 참가자들이 특정 역할(예: 정치인, 시민, 기업가 등)을 맡아 그 관점에서 토론하는 방식입니다. 자신의 실제 의견이 아닌 맡은 역할의 관점에서 주장해야 하므로 다양한 시각을 이해하는 데 도움이 됩니다.",
    steps: [
      { id: "step-1", type: "사회자 인사", time: 60, team: null }, // 사회자 인사 및 주제 소개
      { id: "step-2", type: "숙의시간", time: 180, team: null }, // 역할 배정 및 준비 시간
      { id: "step-3", type: "입론", time: 90, team: "찬성" }, // 각 역할별 입론 발표 찬성
      { id: "step-4", type: "입론", time: 90, team: "반대" }, // 각 역할별 입론 발표 반대
      { id: "step-5", type: "자유토론", time: 600, maxSpeakTime: 60 }, // 자유 토론 (역할 내 주장 강화)
      { id: "step-6", type: "교차질의", time: 300, team: null }, // 질의응답 or 다른 역할 교차 질문
      { id: "step-7", type: "숙의시간", time: 180, team: null }, // 숙의 및 팀별 입장 조정 시간
      { id: "step-8", type: "마무리 발언", time: 90, team: "반대" }, // 마무리 발표 반대
      { id: "step-9", type: "마무리 발언", time: 90, team: "찬성" }, // 마무리 발표 찬성
      { id: "step-10", type: "사회자 인사", time: 180, team: null }, // 청중 or 평가 피드백
    ],
  },
  {
    id: "fishbowl-debate",
    name: "피쉬볼 토론",
    description: "내부 토론자와 외부 청중이 순환 참여하는 개방형 원형 토론",
    icon: "users",
    guide: "피쉬볼 토론은 참가자들이 내부 원(토론자)과 외부 원(청중)으로 나뉘어 진행하는 방식입니다. 내부 원에서 토론이 진행되며, 외부 원의 청중은 토론에 참여하고 싶을 때 내부로 들어와 토론할 수 있습니다. 모든 사람이 참여할 기회를 갖는 포용적인 토론 방식입니다.",
    steps: [
      { id: "step-1", type: "사회자 인사", time: 60, team: null }, // 사회자 인사 및 주제 소개
      { id: "step-2", type: "입론", time: 300, team: null }, // 초기 토론자 (3~4명) 선정 및 발언
      { id: "step-3", type: "자유토론", time: 600, maxSpeakTime: 120 }, // 청중 중 희망자 교체 참여
      { id: "step-4", type: "자유토론", time: 600, maxSpeakTime: 120 }, // 전체 토론 진행 및 정리
      { id: "step-5", type: "마무리 발언", time: 240, team: null }, // 마무리 정리 및 청중 피드백
    ],
  },
  // 학교별 토론 방식 (홈 화면에서 숨김)
  {
    id: "visual-debate",
    name: "비주얼 토론",
    description: "명지대학교 방식의 토론 형식",
    icon: "school",
    university: "명지대학교",
    hidden: true, // 홈 화면에서 숨김
    guide: "비주얼 토론은 명지대학교의 비주얼 토론 동아리에서 사용하는 방식으로, 교차질의와 자유토론이 특징입니다. 숙의시간을 통해 각 팀이 전략을 조율할 수 있으며, 마무리 발언을 통해 최종 입장을 정리합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 180, team: "찬성" },
      { id: "step-2", type: "입론", time: 180, team: "반대" },
      { id: "step-3", type: "교차질의", time: 240, team: "찬성" },
      { id: "step-4", type: "교차질의", time: 240, team: "반대" },
      { id: "step-5", type: "숙의시간", time: 120, team: null },
      { id: "step-6", type: "자유토론", time: 900, maxSpeakTime: 60 },
      { id: "step-7", type: "마무리 발언", time: 120, team: "반대" },
      { id: "step-8", type: "마무리 발언", time: 120, team: "찬성" },
    ],
  },
  {
    id: "todalrae-debate",
    name: "토달래 토론",
    description: "성신여대 방식의 토론 형식",
    icon: "school",
    university: "성신여대",
    hidden: true, // 홈 화면에서 숨김
    guide: "토달래 토론은 성신여대 토론 동아리 '토달래'에서 사용하는 방식입니다. 교차질의와, 팀별 숙의시간을 포함하고 있으며, 일정 시간 자유토론을 진행한 후 마무리 발언으로 논점을 정리합니다.",
    steps: [
      { id: "step-1", type: "입론", time: 150, team: "찬성" },
      { id: "step-2", type: "입론", time: 150, team: "반대" },
      { id: "step-3", type: "교차질의", time: 180, team: "찬성" },
      { id: "step-4", type: "교차질의", time: 180, team: "반대" },
      { id: "step-5", type: "자유토론", time: 720, maxSpeakTime: 60 },
      { id: "step-6", type: "숙의시간", time: 120, team: null },
      { id: "step-7", type: "마무리 발언", time: 120, team: "반대" },
      { id: "step-8", type: "마무리 발언", time: 120, team: "찬성" },
    ],
  },
  {
    id: "custom-debate",
    name: "커스텀 토론",
    description: "사용자가 시간과 단계 구성을 자유롭게 설정할 수 있는 DIY 토론 방식",
    icon: "timer",
    guide: "커스텀 토론은 사용자가 직접 토론 형식을 설계할 수 있는 옵션입니다. 원하는 단계를 추가하고, 시간을 조절하여 상황에 맞는 토론 형식을 만들 수 있습니다. 필요한 단계와 시간을 자유롭게 설정해보세요.",
    steps: [
      { id: "step-1", type: "입론", time: 120, team: "찬성" },
      { id: "step-2", type: "입론", time: 120, team: "반대" },
      { id: "step-3", type: "자유토론", time: 600, maxSpeakTime: 60 },
      { id: "step-4", type: "마무리 발언", time: 60, team: "반대" },
      { id: "step-5", type: "마무리 발언", time: 60, team: "찬성" },
    ],
  },
]; 