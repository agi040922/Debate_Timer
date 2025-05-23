"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { DebateTemplate, DebateStep } from "@/lib/types/debate"
import { supabase } from '@/lib/supabaseClient';
import { debateTemplates } from "@/lib/debate-templates"
import { schoolVariants } from "@/lib/school-variants"
import { DebateTemplateSelector } from "@/components/debate/DebateTemplateSelector"
import { DebateSetupForm, DebateConfig } from "@/components/debate/DebateSetupForm"
import { ArrowDown, MessageSquare, Timer, Users2 } from "lucide-react"

// 템플릿에 학교별 방식 추가
debateTemplates.forEach(template => {
  if (schoolVariants[template.id]) {
    template.schoolVariants = schoolVariants[template.id];
  }
});

export default function Home() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<DebateTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false);

  // 템플릿 선택 처리
  const handleSelectTemplate = (template: DebateTemplate) => {
    setSelectedTemplate(template)
  }

  // 토론 시작 처리
  const handleStartDebate = async (config: DebateConfig) => {
    setIsLoading(true);

    // Helper to determine actual team names based on steps
    const getTeamNames = (steps: DebateStep[]): { positiveTeam: "긍정" | "찬성", negativeTeam: "부정" | "반대" } => {
      const hasPositiveTeamStep = steps.some(step => step.team === "긍정");
      const hasNegativeTeamStep = steps.some(step => step.team === "부정");
      return {
        positiveTeam: hasPositiveTeamStep ? "긍정" : "찬성",
        negativeTeam: hasNegativeTeamStep ? "부정" : "반대",
      };
    };

    // Local Debater interface for initializing live_state
    interface InitialDebater {
      id: string;
      name: string;
      team: "찬성" | "반대" | "긍정" | "부정";
      totalSpeakTime: number;
      isSpeaking: boolean;
    }

    const initialDebaters: InitialDebater[] = [];
    const { positiveTeam, negativeTeam } = getTeamNames(config.steps);

    if (config.enableDebaters) {
      for (let i = 0; i < config.affirmativeCount; i++) {
        initialDebaters.push({
          id: `aff-${i}`,
          name: config.debaterNames?.[i] || `${positiveTeam}${i + 1}`,
          team: positiveTeam,
          totalSpeakTime: 0,
          isSpeaking: false,
        });
      }
      for (let i = 0; i < config.negativeCount; i++) {
        initialDebaters.push({
          id: `neg-${i}`,
          name: config.debaterNames?.[config.affirmativeCount + i] || `${negativeTeam}${i + 1}`,
          team: negativeTeam,
          totalSpeakTime: 0,
          isSpeaking: false,
        });
      }
    } else {
      // Add dummy debaters for team time tracking if debaters are not enabled
      initialDebaters.push({ id: `aff-team`, name: `${positiveTeam}팀`, team: positiveTeam, totalSpeakTime: 0, isSpeaking: false });
      initialDebaters.push({ id: `neg-team`, name: `${negativeTeam}팀`, team: negativeTeam, totalSpeakTime: 0, isSpeaking: false });
    }

    const firstStepTime = config.steps.length > 0 ? config.steps[0].time : 0;
    const freeDebateStep = config.steps.find(step => step.type === "자유토론");
    const initialTeamRemainingTime = {
      [positiveTeam]: freeDebateStep ? freeDebateStep.time / 2 : 0,
      [negativeTeam]: freeDebateStep ? freeDebateStep.time / 2 : 0,
    };
     // Ensure specific team keys if they are fixed e.g. "찬성", "반대"
    if (positiveTeam === "찬성") initialTeamRemainingTime["긍정"] = 0;
    if (negativeTeam === "반대") initialTeamRemainingTime["부정"] = 0;
    if (positiveTeam === "긍정") initialTeamRemainingTime["찬성"] = 0;
    if (negativeTeam === "부정") initialTeamRemainingTime["반대"] = 0;


    const initialLiveState = {
      currentStepIndex: 0,
      remainingTime: firstStepTime,
      isRunning: false,
      debaters: initialDebaters,
      currentSpeakerId: null,
      speakerTimeRemaining: 0,
      teamRemainingTime: initialTeamRemainingTime,
      activeSpeakingTeam: null,
      showDebateEndModal: false,
    };

    try {
      const { data, error } = await supabase
        .from('active_debates')
        .insert([
          { 
            initial_config: config, 
            template_name: config.templateName,
            live_state: initialLiveState 
          }
        ])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // No longer need to set localStorage as primary source of truth
        // localStorage.setItem("debateConfig", JSON.stringify(config)); 
        router.push(`/debate/${data.id}`);
      } else {
        console.error("No data returned from Supabase after insert");
        alert("Failed to start debate. Please try again.");
      }
    } catch (error) {
      console.error("Error starting debate:", error);
      // localStorage.setItem("debateConfig", JSON.stringify(config)); // Removed: No longer using localStorage as a fallback for config.
      alert(`Error starting debate: ${error.message || 'Unknown error'}. Please check your Supabase setup and network, then try again.`);
      // router.push("/debate"); // Removed: Do not redirect to old localStorage-dependent page on Supabase failure.
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 및 히어로 섹션 */}
      <section className="bg-gradient-to-b from-blue-900 to-blue-700 text-white py-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">쉽고 빠른 토론 타이머</h1>
              <p className="text-xl mb-6 text-blue-100">
                다양한 토론 양식을 지원하는 온라인 토론 타이머로 효율적인 토론을 진행하세요.
              </p>
              <div className="mb-8 space-y-3">
                <div className="flex items-center">
                  <div className="bg-blue-500 p-2 rounded-full mr-3">
                    <Timer className="h-5 w-5" />
                  </div>
                  <p>10가지 이상의 다양한 토론 포맷</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-blue-500 p-2 rounded-full mr-3">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <p>개인별 발언 시간 측정 및 관리</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-blue-500 p-2 rounded-full mr-3">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <p>학교별 맞춤 토론 방식 지원</p>
                </div>
              </div>
              <button
                onClick={() => window.scrollTo({
                  top: document.getElementById('templates')?.offsetTop || 500,
                  behavior: 'smooth'
                })}
                className="flex items-center bg-white text-blue-700 px-5 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                토론 시작하기
                <ArrowDown className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="hidden md:block">
              <img 
                src="/debate-illustration.svg" 
                alt="토론 타이머 일러스트" 
                className="w-full max-w-md mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* 메인 컨텐츠 영역 */}
      <section id="templates" className="py-12 flex-grow">
        <div className="container max-w-5xl mx-auto px-4">
          {!selectedTemplate ? (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">토론 템플릿 선택</h2>
                <p className="text-gray-600">다양한 토론 템플릿 중에서 선택하거나 맞춤 설정하세요</p>
              </div>
              <DebateTemplateSelector 
                templates={debateTemplates} 
                onSelectTemplate={handleSelectTemplate} 
              />
            </>
          ) : (
            <DebateSetupForm 
              selectedTemplate={selectedTemplate}
              onBackToTemplates={() => setSelectedTemplate(null)}
              onStartDebate={handleStartDebate}
              isLoading={isLoading}
            />
          )}
        </div>
      </section>
      
      {/* 안내 영역 */}
      {!selectedTemplate && (
        <section className="bg-gray-50 py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">어떻게 사용하나요?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                토론 타이머는 간단한 3단계로 토론을 설정하고 진행할 수 있습니다
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="bg-blue-100 w-12 h-12 flex items-center justify-center rounded-full mx-auto mb-4">
                  <span className="text-blue-700 font-bold text-xl">1</span>
                </div>
                <h3 className="font-bold text-xl mb-3">토론 형식 선택</h3>
                <p className="text-gray-600">
                  자유토론, 세다토론 등 원하는 토론 형식을 선택하거나 학교별 맞춤 형식을 활용하세요
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="bg-blue-100 w-12 h-12 flex items-center justify-center rounded-full mx-auto mb-4">
                  <span className="text-blue-700 font-bold text-xl">2</span>
                </div>
                <h3 className="font-bold text-xl mb-3">설정 조정</h3>
                <p className="text-gray-600">
                  각 단계별 시간, 토론자 수, 발언 시간 등을 토론 목적에 맞게 자유롭게 조정하세요
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="bg-blue-100 w-12 h-12 flex items-center justify-center rounded-full mx-auto mb-4">
                  <span className="text-blue-700 font-bold text-xl">3</span>
                </div>
                <h3 className="font-bold text-xl mb-3">토론 시작</h3>
                <p className="text-gray-600">
                  설정이 완료되면 토론을 시작하고 타이머를 통해 효율적인 토론을 진행하세요
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">토론 타이머</h3>
              <p className="text-gray-400 mb-4">
                다양한 토론 형식을 지원하는 온라인 토론 타이머입니다.
                교육, 동아리, 학술 활동에 자유롭게 활용하세요.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">문의하기</h3>
              <p className="text-gray-400 mb-2">
                <span className="font-semibold text-gray-300">이메일:</span> jkh040922@gmail.com
              </p>
              <p className="text-gray-400 mb-2">
                <span className="font-semibold text-gray-300">전화:</span> 010-5953-5318
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">개발자 정보</h3>
              <p className="text-gray-400 mb-2">
                <span className="font-semibold text-gray-300">개발:</span> 정경훈
              </p>
              <p className="text-gray-400 mb-4">
                <span className="font-semibold text-gray-300">버전:</span> 1.0.0
              </p>
              <p className="text-gray-500 text-sm">
                © 2025 토론 타이머. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

