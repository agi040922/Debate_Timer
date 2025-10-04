"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { DebateTemplate, DebateStep } from "@/lib/types/debate"
import { debateTemplates } from "@/lib/debate-templates"
import { DebateTemplateSelector } from "@/components/debate/DebateTemplateSelector"
import { DebateSetupForm, DebateConfig } from "@/components/debate/DebateSetupForm"
import { ArrowDown, MessageSquare, Timer, Users2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


export default function Home() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<DebateTemplate | null>(null)
  const [joinRoomId, setJoinRoomId] = useState("")
  const [joinError, setJoinError] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  // 팀 타입 확인 함수
  const hasTeamType = (steps: any[], teamType: string): boolean => {
    return steps.some(step => step.team === teamType);
  }

  // 템플릿 선택 처리
  const handleSelectTemplate = (template: DebateTemplate) => {
    setSelectedTemplate(template)
  }

  // 토론 시작 처리 (진행자로 입장)
  const handleStartDebate = async (config: DebateConfig) => {
    // 토론 설정을 localStorage에 저장
    localStorage.setItem("debateConfig", JSON.stringify(config));

    if (config.roomId) {
      try {
        console.log('🔍 방 중복 확인 중...', config.roomId);
        
        // 방 존재 여부 확인
        const checkResponse = await fetch(`/api/check-room?room=${config.roomId}`);
        const checkData = await checkResponse.json();
        
        if (checkData.exists) {
          alert(`방 번호 "${config.roomId}"는 이미 사용 중입니다. 다른 번호를 선택해주세요.`);
          return;
        }
        
        // 토론 상태 생성
        const hasPositiveTeam = hasTeamType(config.steps, "긍정");
        const hasNegativeTeam = hasTeamType(config.steps, "부정");

        const newDebaters: any[] = [];
        if (config.enableDebaters) {
          const positiveTeam = hasPositiveTeam ? "긍정" : "찬성";
          const negativeTeam = hasNegativeTeam ? "부정" : "반대";
          for (let i = 0; i < config.affirmativeCount; i++) {
            newDebaters.push({ id: `aff-${i}`, name: config.debaterNames?.[i] || `${positiveTeam}${i + 1}`, team: positiveTeam, totalSpeakTime: 0, isSpeaking: false });
          }
          for (let i = 0; i < config.negativeCount; i++) {
            newDebaters.push({ id: `neg-${i}`, name: config.debaterNames?.[config.affirmativeCount + i] || `${negativeTeam}${i + 1}`, team: negativeTeam, totalSpeakTime: 0, isSpeaking: false });
          }
        }

        const freeDebateStep = config.steps.find((step: any) => step.type === "자유토론");
        const initialTeamTime = { 찬성: 0, 반대: 0, 긍정: 0, 부정: 0 };
        if (freeDebateStep) {
          if (hasPositiveTeam) initialTeamTime.긍정 = freeDebateStep.time / 2;
          else initialTeamTime.찬성 = freeDebateStep.time / 2;
          if (hasNegativeTeam) initialTeamTime.부정 = freeDebateStep.time / 2;
          else initialTeamTime.반대 = freeDebateStep.time / 2;
        }

        const initialDebateState = {
          steps: config.steps,
          currentStepIndex: 0,
          remainingTime: config.steps.length > 0 ? config.steps[0].time : 0,
          isRunning: false,
          debaters: newDebaters,
          currentSpeaker: null,
          speakerTimeRemaining: 0,
          teamRemainingTime: initialTeamTime,
          activeSpeakingTeam: null,
        };

        // 새 방 생성 등록 (토론 상태 포함)
        const createResponse = await fetch('/api/check-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId: config.roomId,
            debateState: initialDebateState
          })
        });
        
        if (!createResponse.ok) {
          throw new Error('방 생성 실패');
        }
        
        console.log('✅ 방 생성 완료, 진행자로 입장');
        router.push(`/debate/${config.roomId}`);
      } catch (error) {
        console.error('❌ 방 생성 오류:', error);
        alert('방 생성 중 오류가 발생했습니다.');
      }
    } else {
      // 실시간이 아닌 로컬 토론의 경우, 고유한 ID를 생성하여 충돌 방지
      const localRoomId = `local-${Date.now()}`;
      router.push(`/debate/${localRoomId}`);
    }
  }

  // 방 참가 처리 (참가자로만 입장)
  const handleJoinRoom = async () => {
    const roomId = joinRoomId.trim();
    if (!roomId) return;
    
    setIsJoining(true);
    setJoinError("");
    
    try {
      console.log('🔍 방 존재 여부 확인 중...', roomId);
      const response = await fetch(`/api/check-room?room=${roomId}`);
      const data = await response.json();
      
      if (!data.exists) {
        setJoinError("존재하지 않는 방입니다. 방 번호를 확인해주세요.");
        setIsJoining(false);
        return;
      }
      
      // 토론 상태가 있는지 확인
      if (data.state) {
        console.log('✅ 방에 토론 상태 존재함 - 즉시 참가 가능');
      } else {
        console.log('⏳ 방에 토론 상태 없음 - 호스트가 설정할 때까지 대기');
      }
      
      console.log('✅ 방 존재 확인됨, 참가자로 입장');
      
      // 참가자로 입장하기 전에 해당 방의 localStorage 삭제 (진행자 권한 제거)
      const debateConfig = localStorage.getItem("debateConfig");
      if (debateConfig) {
        try {
          const config = JSON.parse(debateConfig);
          if (config.roomId === roomId) {
            console.log('🗑️ 해당 방의 진행자 권한 제거');
            localStorage.removeItem("debateConfig");
          }
        } catch (error) {
          console.error('localStorage 처리 오류:', error);
        }
      }
      
      router.push(`/debate/${roomId}`);
    } catch (error) {
      console.error('❌ 방 확인 오류:', error);
      setJoinError("방 확인 중 오류가 발생했습니다.");
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 2.0 업데이트 공지 배너 */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-3 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="flex items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                NEW
              </div>
              <span className="font-semibold">
                🎉 DebateTimer 2.0 대규모 업데이트! 실시간 연동 지원 - 이제 한 타이머에서 모두 함께 사용하세요!
              </span>
            </div>
          </div>
          <div className="text-center text-sm mt-1 opacity-90">
            방을 만들고 코드를 공유하고, debatetimer.org에서 방 번호를 입력해 참가하세요! 📱💻
          </div>
          <div className="absolute inset-0 pointer-events-none overflow-hidden h-20">
          </div>
        </div>
      </div>
      
      {/* 헤더 및 히어로 섹션 */}
      <section className="bg-gradient-to-b from-blue-900 to-blue-700 text-white py-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">쉽고 빠른 토론 타이머</h1>
              <p className="text-xl mb-6 text-blue-100">
                실시간 연동으로 모든 참가자가 함께 사용할 수 있는 온라인 토론 타이머입니다.
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
                  <p>실시간 연동으로 모든 기기에서 동시 사용</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-blue-500 p-2 rounded-full mr-3">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <p>개인별 발언 시간 측정 및 관리</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => window.scrollTo({
                    top: document.getElementById('templates')?.offsetTop || 500,
                    behavior: 'smooth'
                  })}
                  className="flex items-center justify-center bg-white text-blue-700 px-5 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  토론 시작하기
                  <ArrowDown className="ml-2 h-4 w-4" />
                </button>
                
                {/* 바로 들어가기 */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="방 ID 입력 (참가자로 입장)"
                      value={joinRoomId}
                      onChange={(e) => {
                        setJoinRoomId(e.target.value);
                        setJoinError(""); // 입력 시 오류 메시지 초기화
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !isJoining && handleJoinRoom()}
                      className="bg-white/90 border-white/20 text-gray-700 placeholder:text-gray-500"
                      disabled={isJoining}
                    />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={!joinRoomId.trim() || isJoining}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <LogIn className="h-4 w-4 mr-1" />
                      {isJoining ? "확인 중..." : "참가"}
                    </Button>
                  </div>
                  {joinError && (
                    <div className="text-red-200 text-sm bg-red-500/20 px-3 py-2 rounded">
                      {joinError}
                    </div>
                  )}
                </div>
              </div>
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
                  자유토론, 세다토론 등 다양한 토론 형식 중에서 원하는 형식을 선택하세요
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
                <span className="font-semibold text-gray-300">버전:</span> 2.0.0
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

