import { SchoolVariant } from "./types/debate";

// 학교별 토론 방식 데이터
export const schoolVariants: Record<string, SchoolVariant[]> = {
  "free-debate": [
    {
      id: "visual-free-debate",
      name: "비주얼식",
      university: "명지대학교",
      steps: [
        { id: "step-1", type: "입론", time: 60, team: "찬성" },
        { id: "step-2", type: "입론", time: 60, team: "반대" },
        { id: "step-3", type: "자유토론", time: 1200, maxSpeakTime: 120 }, // 팀당 10분, 최대 발언 2분
        { id: "step-4", type: "마무리 발언", time: 60, team: "찬성" },
        { id: "step-5", type: "마무리 발언", time: 60, team: "반대" },
      ],
    }
  ],
  "seda-debate": [
    {
      id: "todalrae-seda-debate",
      name: "토달래식",
      university: "성신여대",
      steps: [
        { id: "step-1", type: "입론", time: 90, team: "찬성" }, // 기조발언
        { id: "step-2", type: "입론", time: 90, team: "반대" }, // 기조발언
        { id: "step-3", type: "교차질의", time: 120, team: "찬성" },
        { id: "step-4", type: "교차질의", time: 120, team: "반대" },
        { id: "step-5", type: "숙의시간", time: 60, team: null },
        { id: "step-6", type: "자유토론", time: 1200, maxSpeakTime: 120 }, // 팀당 10분, 최대 발언 2분
        { id: "step-7", type: "숙의시간", time: 60, team: null },
        { id: "step-8", type: "마무리 발언", time: 90, team: "반대" },
        { id: "step-9", type: "마무리 발언", time: 90, team: "찬성" },
      ],
    }
  ],
}; 