"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Home, Volume2, VolumeX, ZapOff, Zap, Info, X, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users } from "lucide-react"
import { DebateStep, DebateStepType, DebateTeam } from "@/lib/types/debate"

// Define debater interface
interface Debater {
  id: string
  name: string
  team: "찬성" | "반대" | "긍정" | "부정"
  totalSpeakTime: number
  isSpeaking: boolean
}

export default function DebatePage() {
  const router = useRouter()
  const [steps, setSteps] = useState<DebateStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [debaters, setDebaters] = useState<Debater[]>([])
  const [templateName, setTemplateName] = useState("")
  const [currentSpeaker, setCurrentSpeaker] = useState<Debater | null>(null)
  const [speakerTimeRemaining, setSpeakerTimeRemaining] = useState(0)
  const [teamRemainingTime, setTeamRemainingTime] = useState<{
    찬성: number
    반대: number
    긍정: number
    부정: number
  }>({ 찬성: 0, 반대: 0, 긍정: 0, 부정: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [enableDebaters, setEnableDebaters] = useState(true)
  const [activeSpeakingTeam, setActiveSpeakingTeam] = useState<"찬성" | "반대" | "긍정" | "부정" | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showTimeEndAlert, setShowTimeEndAlert] = useState<{show: boolean, message: string}>({show: false, message: ""})

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 팀 타입 확인 함수
  const hasTeamType = (steps: DebateStep[], teamType: DebateTeam): boolean => {
    return steps.some(step => step.team === teamType);
  }

  // Load debate configuration from localStorage
  useEffect(() => {
    const debateConfig = localStorage.getItem("debateConfig")
    if (!debateConfig) {
      router.push("/")
      return
    }

    const config = JSON.parse(debateConfig)
    setSteps(config.steps)
    setTemplateName(config.templateName)
    setEnableDebaters(config.enableDebaters)

    // Initialize remaining time for the first step
    if (config.steps.length > 0) {
      setRemainingTime(config.steps[0].time)
    }

    // Initialize debaters
    const newDebaters: Debater[] = []
    if (config.enableDebaters) {
      // 팀 타입 확인 (긍정/부정 또는 찬성/반대)
      const hasPositiveTeam = hasTeamType(config.steps, "긍정");
      const hasNegativeTeam = hasTeamType(config.steps, "부정");
      
      const positiveTeam = hasPositiveTeam ? "긍정" : "찬성";
      const negativeTeam = hasNegativeTeam ? "부정" : "반대";
      
      for (let i = 0; i < config.affirmativeCount; i++) {
        newDebaters.push({
          id: `aff-${i}`,
          name: config.debaterNames && config.debaterNames[i] ? config.debaterNames[i] : `${positiveTeam}${i + 1}`,
          team: positiveTeam as "찬성" | "반대" | "긍정" | "부정",
          totalSpeakTime: 0,
          isSpeaking: false,
        })
      }
      for (let i = 0; i < config.negativeCount; i++) {
        newDebaters.push({
          id: `neg-${i}`,
          name: config.debaterNames && config.debaterNames[config.affirmativeCount + i] 
            ? config.debaterNames[config.affirmativeCount + i] 
            : `${negativeTeam}${i + 1}`,
          team: negativeTeam as "찬성" | "반대" | "긍정" | "부정",
          totalSpeakTime: 0,
          isSpeaking: false,
        })
      }
    } else {
      // 토론자 설정이 비활성화되어 있어도 팀 시간 조절을 위한 더미 토론자 추가
      // 팀 타입 확인 (긍정/부정 또는 찬성/반대)
      const hasPositiveTeam = hasTeamType(config.steps, "긍정");
      const hasNegativeTeam = hasTeamType(config.steps, "부정");
      
      const positiveTeam = hasPositiveTeam ? "긍정" : "찬성";
      const negativeTeam = hasNegativeTeam ? "부정" : "반대";
      
      newDebaters.push({
        id: `aff-team`,
        name: `${positiveTeam}팀`,
        team: positiveTeam as "찬성" | "반대" | "긍정" | "부정",
        totalSpeakTime: 0,
        isSpeaking: false,
      })
      newDebaters.push({
        id: `neg-team`,
        name: `${negativeTeam}팀`,
        team: negativeTeam as "찬성" | "반대" | "긍정" | "부정",
        totalSpeakTime: 0,
        isSpeaking: false,
      })
    }
    setDebaters(newDebaters)

    // Initialize team remaining time for free debate
    const freeDebateStep = config.steps.find((step: DebateStep) => step.type === "자유토론")
    if (freeDebateStep) {
      // 팀 타입 확인 (긍정/부정 또는 찬성/반대)
      const hasPositiveTeam = hasTeamType(config.steps, "긍정");
      const hasNegativeTeam = hasTeamType(config.steps, "부정");
      
      setTeamRemainingTime({
        찬성: hasPositiveTeam ? 0 : freeDebateStep.time / 2,
        반대: hasNegativeTeam ? 0 : freeDebateStep.time / 2,
        긍정: hasPositiveTeam ? freeDebateStep.time / 2 : 0,
        부정: hasNegativeTeam ? freeDebateStep.time / 2 : 0,
      });
    }

    // Initialize audio
    audioRef.current = new Audio("/beep.mp3")
  }, [router])

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        // 자유토론에서 발언자/팀이 선택되지 않았다면 타이머 작동 안함
        const isFreeDabate = steps[currentStepIndex]?.type === "자유토론";
        const noSpeakerSelected = isFreeDabate && !activeSpeakingTeam && !currentSpeaker;
        
        if (isFreeDabate && noSpeakerSelected) {
          // 자유토론이고 발언자/팀이 선택되지 않았으면 타이머가 진행되지 않음
          return;
        }

        setRemainingTime((prev) => {
          if (prev <= 1) {
            // Time's up for current step
            clearInterval(timerRef.current!)
            setIsRunning(false)
            if (soundEnabled) {
              audioRef.current?.play()
            }
            
            // 타이머 종료 알림 표시
            setShowTimeEndAlert({
              show: true, 
              message: currentStep?.team 
                ? `${currentStep.type} (${currentStep.team}) 시간이 종료되었습니다.`
                : `${currentStep?.type} 시간이 종료되었습니다.`
            })
            
            // 일정 시간 후 알림 숨기기
            setTimeout(() => {
              setShowTimeEndAlert({show: false, message: ""})
            }, 5000)
            
            return 0
          }
          return prev - 1
        })

        // 자유토론에서 현재 발언 중인 팀이 있다면 팀 시간 갱신
        if (steps[currentStepIndex]?.type === "자유토론" && activeSpeakingTeam) {
          setTeamRemainingTime((prev) => {
            // 이 팀의 남은 시간 가져오기 (null/undefined 체크 포함)
            const prevTime = prev[activeSpeakingTeam] || 0;
            const newTime = Math.max(0, prevTime - 1);
            
            // 팀 시간이 종료된 경우
            if (newTime === 0 && prevTime > 0) {
              if (soundEnabled) {
                audioRef.current?.play();
              }
              
              // 타이머 종료 알림 표시
              setShowTimeEndAlert({
                show: true, 
                message: `${activeSpeakingTeam}팀의 시간이 모두 종료되었습니다.`
              });
              
              // 일정 시간 후 알림 숨기기
              setTimeout(() => {
                setShowTimeEndAlert({show: false, message: ""});
              }, 5000);
            }
            
            // 새 시간 상태 반환
            return {
              ...prev,
              [activeSpeakingTeam]: newTime
            };
          })
        }

        // Update speaker time if someone is speaking
        if (currentSpeaker) {
          setSpeakerTimeRemaining((prev) => {
            if (prev <= 1) {
              // Speaker's time is up
              if (soundEnabled) {
                audioRef.current?.play()
              }
              
              // 발언자 시간 종료 알림 표시
              setShowTimeEndAlert({
                show: true, 
                message: `${currentSpeaker.name}의 발언 시간이 종료되었습니다.`
              })
              
              // 일정 시간 후 알림 숨기기
              setTimeout(() => {
                setShowTimeEndAlert({show: false, message: ""})
              }, 5000)
              
              // 발언자의 시간이 종료되면 발언 종료 (자유토론에서)
              if (steps[currentStepIndex]?.type === "자유토론") {
                setCurrentSpeaker(null)
                setActiveSpeakingTeam(null)
                
                // 다른 토론자들의 발언 상태도 초기화
                setDebaters((prev) =>
                  prev.map((d) => ({
                    ...d,
                    isSpeaking: false,
                  }))
                )
              }
              
              return 0
            }
            return prev - 1
          })

          // Update debater's total speak time
          setDebaters((prev) =>
            prev.map((d) => (d.id === currentSpeaker.id ? { ...d, totalSpeakTime: d.totalSpeakTime + 1 } : d)),
          )
        }
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, currentSpeaker, currentStepIndex, steps, soundEnabled, activeSpeakingTeam])

  // Handle step change
  const handleStepChange = (index: number) => {
    if (index < 0 || index >= steps.length) return

    // Stop timer
    setIsRunning(false)

    // Reset current speaker
    setCurrentSpeaker(null)
    setActiveSpeakingTeam(null)

    // Update current step index
    setCurrentStepIndex(index)

    // Set remaining time for the new step
    setRemainingTime(steps[index].time)

    // Reset speaker time remaining
    setSpeakerTimeRemaining(0)
  }

  // 팀 발언 토글 - 타입 수정
  const handleTeamSpeaking = (team: "찬성" | "반대" | "긍정" | "부정") => {
    // 토론자 설정이 비활성화된 경우
    if (!enableDebaters || debaters.length <= 2) {
      // 같은 팀을 다시 클릭하면 끄기
      if (activeSpeakingTeam === team) {
        setActiveSpeakingTeam(null)
        return
      }

      // 팀 남은 시간 체크
      const teamTime = teamRemainingTime[team] || 0
      if (teamTime <= 0) {
        if (soundEnabled) {
          audioRef.current?.play()
        }
        return
      }

      // 활성 팀 설정 및 발언자 찾기
      setActiveSpeakingTeam(team)
      const teamDebater = debaters.find(d => d.team === team)
      if (teamDebater) {
        // 이전에 선택된 팀과 같으면 발언 시간 유지
        const isSameTeam = currentSpeaker?.team === team;
        let newSpeakerTimeRemaining = speakerTimeRemaining;
        
        // 다른 팀이거나 발언 시간이 0이면 새로 계산
        if (!isSameTeam || speakerTimeRemaining === 0) {
          const maxTime = steps[currentStepIndex].maxSpeakTime || 0;
          newSpeakerTimeRemaining = Math.min(maxTime, teamTime);
        }
        
        setCurrentSpeaker(teamDebater)
        setSpeakerTimeRemaining(newSpeakerTimeRemaining)
      }
    }
  }

  // Handle speaker selection
  const handleSpeakerSelect = (debater: Debater) => {
    // Only allow speaker selection in free debate
    if (steps[currentStepIndex]?.type !== "자유토론") return

    // If the same speaker is clicked, toggle speaking state
    if (currentSpeaker?.id === debater.id) {
      setCurrentSpeaker(null)
      setActiveSpeakingTeam(null)
      setSpeakerTimeRemaining(0)
      return
    }

    // Team time check with null/undefined check
    const teamTime = teamRemainingTime[debater.team] || 0;
    
    // Check if team has remaining time
    if (teamTime <= 0) {
      if (soundEnabled) {
        audioRef.current?.play()
      }
      return
    }

    // 이전 발언자와 새 발언자의 팀이 같은 경우, 이전 발언 시간 유지
    const isSameTeam = currentSpeaker?.team === debater.team;
    let newSpeakerTimeRemaining = speakerTimeRemaining;
    
    // 새 발언자나 팀이 다른 경우에만 최대 발언 시간 새로 계산
    if (!isSameTeam || speakerTimeRemaining === 0) {
      const maxTime = steps[currentStepIndex].maxSpeakTime || 0;
      newSpeakerTimeRemaining = Math.min(maxTime, teamTime);
    }
    
    // Set new speaker
    setCurrentSpeaker(debater)
    setActiveSpeakingTeam(debater.team)

    // 계산된 발언 시간 설정
    setSpeakerTimeRemaining(newSpeakerTimeRemaining)

    // Update debaters to show who is speaking
    setDebaters((prev) =>
      prev.map((d) => ({
        ...d,
        isSpeaking: d.id === debater.id,
      })),
    )
  }

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Get current step
  const currentStep = steps[currentStepIndex]

  // Calculate progress percentage
  const calculateProgress = (current: number, total: number): number => {
    return Math.max(0, Math.min(100, (current / total) * 100))
  }

  // 팀 색상 반환 함수 추가
  const getTeamColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") {
      return "text-blue-500";
    } else if (team === "반대" || team === "부정") {
      return "text-orange-500";
    }
    return "";
  };

  // 팀 배경색 반환 함수
  const getTeamBgColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") {
      return "bg-blue-100";
    } else if (team === "반대" || team === "부정") {
      return "bg-orange-100";
    }
    return "";
  };

  // 긍정/찬성 팀 여부 확인
  const isPositiveTeam = (steps: DebateStep[]) => {
    return hasTeamType(steps, "긍정");
  };

  // 부정/반대 팀 여부 확인
  const isNegativeTeam = (steps: DebateStep[]) => {
    return hasTeamType(steps, "부정");
  };

  return (
    <div className="container mx-auto py-4 px-4 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center text-gray-600">
          <Home className="h-5 w-5 mr-1" />
          <span className="text-sm">홈</span>
        </Link>
        <h1 className="text-xl font-bold">{templateName}</h1>
        <Button variant="ghost" size="sm" className="text-gray-600" onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>

      {/* Debate flow */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {steps.map((step, index) => (
            <Button
              key={step.id}
              variant={index === currentStepIndex ? "default" : "outline"}
              className={`text-xs px-2 py-1 h-auto whitespace-nowrap ${index === currentStepIndex ? "bg-primary" : ""}`}
              onClick={() => handleStepChange(index)}
            >
              {index + 1}. {step.type}
              {step.team && ` (${step.team})`}
            </Button>
          ))}
        </div>
      </div>

      {/* 시간 종료 알림 */}
      {showTimeEndAlert.show && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-md p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">{showTimeEndAlert.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 -mt-1 -mr-1"
            onClick={() => setShowTimeEndAlert({show: false, message: ""})}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main timer */}
      <Card className="flex-1 flex flex-col items-center justify-center p-6 mb-6">
        <div className="text-sm font-medium mb-2">
          {currentStep?.type}
          {currentStep?.team && ` - ${currentStep.team}`}
        </div>

        {currentStep?.type !== "자유토론" && (
          <>
            <div className="text-6xl font-bold mb-4">{formatTime(remainingTime)}</div>
            <Progress value={calculateProgress(remainingTime, currentStep?.time || 1)} className="w-full h-2 mb-6" />
          </>
        )}

        {/* Free debate info */}
        {currentStep?.type === "자유토론" && (
          <div className="w-full">
            {/* 자유토론 가이드 버튼 */}
            <div className="flex justify-end mb-2">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-gray-500 rounded-full"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <Info className="h-4 w-4" />
                </Button>
                
                {/* 가이드 메시지 */}
                {showGuide && (
                  <div className="absolute right-0 top-8 z-50 bg-white shadow-lg rounded-md border p-3 w-64">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-medium">자유토론 사용 가이드</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 w-5 p-0 text-gray-400"
                        onClick={() => setShowGuide(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600">
                      {enableDebaters && debaters.length > 2 ? (
                        <p>
                          1. 발언할 토론자 버튼을 선택하세요.<br />
                          2. 재생 버튼을 눌러 타이머를 시작하세요.<br />
                          3. 다른 토론자 버튼을 클릭하여 변경 가능합니다.<br />
                          4. 각 토론자의 발언 시간이 자동 기록됩니다.
                        </p>
                      ) : (
                        <p>
                          1. 발언할 팀(찬성/반대)을 선택하세요.<br />
                          2. 재생 버튼을 눌러 타이머를 시작하세요.<br />
                          3. 다른 팀을 클릭하여 변경할 수 있습니다.<br />
                          4. 현재 선택된 팀을 다시 클릭하면 발언 중지됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 현재 팀 발언 상태 표시 */}
            {activeSpeakingTeam && (
              <div className="text-center mb-6">
                <div className="text-sm font-medium">현재 발언</div>
                <div className={`text-2xl font-bold ${getTeamColor(activeSpeakingTeam)}`}>
                  {activeSpeakingTeam}팀 {formatTime(speakerTimeRemaining)}
                </div>
                <Progress
                  value={calculateProgress(speakerTimeRemaining, currentStep?.maxSpeakTime || 1)}
                  className={`w-full h-1 mt-1 ${getTeamBgColor(activeSpeakingTeam)}`}
                />
              </div>
            )}

            {/* 팀별 남은 시간 - 더 크게 표시 */}
            <div className="grid grid-cols-2 gap-8 w-full mb-6">
              <div 
                className={`text-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeSpeakingTeam === "찬성" || activeSpeakingTeam === "긍정"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => {
                  // 현재 설정된 팀 타입 확인 (긍정/찬성)
                  const positiveTeam = isPositiveTeam(steps) ? "긍정" : "찬성";
                  handleTeamSpeaking(positiveTeam);
                }}
              >
                <div className="font-medium mb-1">
                  {isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}
                </div>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {isPositiveTeam(steps) 
                    ? formatTime(teamRemainingTime.긍정 || 0) 
                    : formatTime(teamRemainingTime.찬성 || 0)}
                </div>
                <Progress 
                  value={calculateProgress(
                    isPositiveTeam(steps)
                      ? (teamRemainingTime.긍정 || 0) 
                      : (teamRemainingTime.찬성 || 0), 
                    currentStep?.time ? currentStep.time / 2 : 1
                  )} 
                  className="w-full h-3" 
                />
              </div>

              <div 
                className={`text-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeSpeakingTeam === "반대" || activeSpeakingTeam === "부정"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-orange-300"
                }`}
                onClick={() => {
                  // 현재 설정된 팀 타입 확인 (부정/반대)
                  const negativeTeam = isNegativeTeam(steps) ? "부정" : "반대";
                  handleTeamSpeaking(negativeTeam);
                }}
              >
                <div className="font-medium mb-1">
                  {isNegativeTeam(steps) ? "부정팀" : "반대팀"}
                </div>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  {isNegativeTeam(steps) 
                    ? formatTime(teamRemainingTime.부정 || 0) 
                    : formatTime(teamRemainingTime.반대 || 0)}
                </div>
                <Progress 
                  value={calculateProgress(
                    isNegativeTeam(steps)
                      ? (teamRemainingTime.부정 || 0) 
                      : (teamRemainingTime.반대 || 0), 
                    currentStep?.time ? currentStep.time / 2 : 1
                  )} 
                  className="w-full h-3" 
                />
              </div>
            </div>
            
            {/* 토론자 활성화 시 토론자 목록을 별도 섹션으로 분리 */}
            {enableDebaters && debaters.length > 2 && (
              <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                <h3 className="text-xs font-medium mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-1 text-gray-500" />
                  <span>발언자 기록</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-blue-700 mb-1">
                      {isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {debaters.filter(d => d.team === "찬성" || d.team === "긍정").map((debater) => (
                        <button
                          key={debater.id}
                          className={`flex items-center justify-between w-full p-2 rounded-md text-xs ${
                            debater.isSpeaking
                              ? "bg-blue-500 text-white font-medium"
                              : "bg-white border border-blue-100 text-blue-700 hover:bg-blue-50"
                          } ${teamRemainingTime[debater.team] <= 0 ? "opacity-50" : ""}`}
                          onClick={() => handleSpeakerSelect(debater)}
                        >
                          <span>{debater.name}</span>
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-orange-700 mb-1">
                      {isNegativeTeam(steps) ? "부정팀" : "반대팀"}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {debaters.filter(d => d.team === "반대" || d.team === "부정").map((debater) => (
                        <button
                          key={debater.id}
                          className={`flex items-center justify-between w-full p-2 rounded-md text-xs ${
                            debater.isSpeaking
                              ? "bg-orange-500 text-white font-medium"
                              : "bg-white border border-orange-100 text-orange-700 hover:bg-orange-50"
                          } ${teamRemainingTime[debater.team] <= 0 ? "opacity-50" : ""}`}
                          onClick={() => handleSpeakerSelect(debater)}
                        >
                          <span>{debater.name}</span>
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full text-xs">
                            {formatTime(debater.totalSpeakTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timer controls */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-14"
            onClick={() => {
              setIsRunning(false)
              setRemainingTime(currentStep?.time || 0)
              setSpeakerTimeRemaining(currentStep?.maxSpeakTime || 0)
            }}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>

          <Button
            variant={isRunning ? "destructive" : "default"}
            size="lg"
            className="h-14 w-14"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
        </div>
      </Card>

      {/* Navigation controls */}
      <div className="flex justify-between mb-4">
        <Button
          variant="outline"
          className="w-32"
          onClick={() => handleStepChange(currentStepIndex - 1)}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          이전 단계
        </Button>

        <Button
          variant="outline"
          className="w-32"
          onClick={() => handleStepChange(currentStepIndex + 1)}
          disabled={currentStepIndex === steps.length - 1}
        >
          다음 단계
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

