import { ReactNode } from "react"

// 토론 단계 타입
export type DebateStepType = 
  | "입론" 
  | "자유토론" 
  | "숙의시간" 
  | "마무리 발언" 
  | "교차질의" 
  | "반론" 
  | "사회자 인사" 
  | "청중 사전 투표" 
  | "청중 질문" 
  | "패널 질문" 
  | "결과 발표"

// 아이콘 타입
export type IconType = "zap" | "users" | "award" | "school" | "timer" | string;

// 토론 단계 인터페이스
export interface DebateStep {
  id: string
  type: DebateStepType
  time: number // in seconds
  team?: "찬성" | "반대" | null
  maxSpeakTime?: number // for free debate, max time per speech in seconds
}

// 토론 템플릿 인터페이스
export interface DebateTemplate {
  id: string
  name: string
  description: string
  icon: IconType
  steps: DebateStep[]
  university?: string
  schoolVariants?: SchoolVariant[]
  hidden?: boolean // 홈 화면에서 숨김 여부
  guide?: string // 토론 방식에 대한 안내 텍스트
}

// 학교별 토론 방식 인터페이스
export interface SchoolVariant {
  id: string
  name: string
  university: string
  steps: DebateStep[]
} 