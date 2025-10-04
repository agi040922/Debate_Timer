"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Home, Volume2, VolumeX, ZapOff, Zap, Info, X, AlertCircle, Minus, Plus, Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Users } from "lucide-react"
import { DebateStep, DebateStepType, DebateTeam, Debater } from "@/lib/types/debate"
import { useDebateSync, DebateState } from "@/hooks/useDebateSync"

export default function DebatePage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.roomId as string;

  const { debateState, isConnecting, isModerator, userRole, updateDebateState, initializeDebateState } = useDebateSync(roomId);

  // Local UI state that doesn't need to be synced
  const [templateName, setTemplateName] = useState("")
  const [enableDebaters, setEnableDebaters] = useState(true); // This is part of config, not live state
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [showTimeEndAlert, setShowTimeEndAlert] = useState<{show: boolean, message: string}>({show: false, message: ""})
  const [timeEditMode, setTimeEditMode] = useState(false)
  const [showDebateEndModal, setShowDebateEndModal] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 팀 타입 확인 함수
  const hasTeamType = (steps: DebateStep[], teamType: DebateTeam): boolean => {
    return steps.some(step => step.team === teamType);
  }

  // Initialize debate state from localStorage on first load
  useEffect(() => {
    // Only initialize if debateState is not yet populated
    if (debateState || isConnecting) return;

    const debateConfigStr = localStorage.getItem("debateConfig");
    if (!debateConfigStr) {
      // If no config, maybe this user is joining late. Wait for state from websocket.
      // If it's a local room, something is wrong, so redirect.
      if (roomId.startsWith('local-')) {
        router.push("/");
      }
      return;
    }

    const config = JSON.parse(debateConfigStr);
    setTemplateName(config.templateName); // Set local UI state
    setEnableDebaters(config.enableDebaters);

    const hasPositiveTeam = hasTeamType(config.steps, "긍정");
    const hasNegativeTeam = hasTeamType(config.steps, "부정");

    const newDebaters: Debater[] = [];
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

    const freeDebateStep = config.steps.find((step: DebateStep) => step.type === "자유토론");
    const initialTeamTime = { 찬성: 0, 반대: 0, 긍정: 0, 부정: 0 };
    if (freeDebateStep) {
      if (hasPositiveTeam) initialTeamTime.긍정 = freeDebateStep.time / 2;
      else initialTeamTime.찬성 = freeDebateStep.time / 2;
      if (hasNegativeTeam) initialTeamTime.부정 = freeDebateStep.time / 2;
      else initialTeamTime.반대 = freeDebateStep.time / 2;
    }

    const initialState: DebateState = {
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

    initializeDebateState(initialState);

  }, [isConnecting, debateState, router, initializeDebateState, roomId]);

  useEffect(() => {
    // Initialize audio only once
    audioRef.current = new Audio("/beep.mp3");
    
    // 페이지 언마운트 시 방 삭제 (진행자만)
    return () => {
      if (isModerator && roomId && !roomId.startsWith('local-')) {
        fetch(`/api/check-room?room=${roomId}`, { method: 'DELETE' })
          .then(() => console.log('🗑️ 방 삭제 완료:', roomId))
          .catch(err => console.error('❌ 방 삭제 오류:', err));
      }
    };
  }, [isModerator, roomId]);

  // Timer effect
  useEffect(() => {
    if (debateState?.isRunning) {
      timerRef.current = setInterval(() => {
        updateDebateState(prevState => {
          if (!prevState || !prevState.isRunning) {
            clearInterval(timerRef.current!);
            return {};
          }

          const currentStep = prevState.steps[prevState.currentStepIndex];
          const isFreeDebate = currentStep?.type === "자유토론";
          const noSpeakerSelected = isFreeDebate && !prevState.activeSpeakingTeam && !prevState.currentSpeaker;

          if (isFreeDebate && noSpeakerSelected) {
            return {}; // No change
          }

          let newRemainingTime = prevState.remainingTime;
          let newTeamRemainingTime = { ...prevState.teamRemainingTime };
          let newSpeakerTimeRemaining = prevState.speakerTimeRemaining;
          let newDebaters = [...prevState.debaters];
          let newCurrentSpeaker = prevState.currentSpeaker;
          let newActiveSpeakingTeam = prevState.activeSpeakingTeam;
          let stopRunning = false;

          // Main step timer
          if (prevState.remainingTime > 0) {
            newRemainingTime -= 1;
          }

          // Speaker timer
          if (prevState.currentSpeaker && prevState.speakerTimeRemaining > 0) {
            newSpeakerTimeRemaining -= 1;
            newDebaters = prevState.debaters.map(d =>
              d.id === prevState.currentSpeaker?.id ? { ...d, totalSpeakTime: d.totalSpeakTime + 1 } : d
            );
          }

          // Team timer in free debate
          if (isFreeDebate && prevState.activeSpeakingTeam && newTeamRemainingTime[prevState.activeSpeakingTeam] > 0) {
            newTeamRemainingTime[prevState.activeSpeakingTeam] -= 1;
          }

          // Check for time-up conditions
          if (newRemainingTime <= 0 && prevState.remainingTime > 0) {
            stopRunning = true;
            if (soundEnabled) audioRef.current?.play();
            const message = currentStep?.team ? `${currentStep.type} (${currentStep.team}) 시간이 종료되었습니다.` : `${currentStep?.type} 시간이 종료되었습니다.`;
            setShowTimeEndAlert({ show: true, message });
            setTimeout(() => setShowTimeEndAlert({ show: false, message: "" }), 5000);
          }

          if (newSpeakerTimeRemaining <= 0 && prevState.speakerTimeRemaining > 0) {
            if (soundEnabled) audioRef.current?.play();
            setShowTimeEndAlert({ show: true, message: `${prevState.currentSpeaker?.name}의 발언 시간이 종료되었습니다.` });
            setTimeout(() => setShowTimeEndAlert({ show: false, message: "" }), 5000);
            if (isFreeDebate) {
              newCurrentSpeaker = null;
              newActiveSpeakingTeam = null;
              newDebaters = newDebaters.map(d => ({ ...d, isSpeaking: false }));
            }
          }

          if (isFreeDebate && prevState.activeSpeakingTeam && newTeamRemainingTime[prevState.activeSpeakingTeam] <= 0 && prevState.teamRemainingTime[prevState.activeSpeakingTeam] > 0) {
             if (soundEnabled) audioRef.current?.play();
             setShowTimeEndAlert({ show: true, message: `${prevState.activeSpeakingTeam}팀의 시간이 모두 종료되었습니다.` });
             setTimeout(() => setShowTimeEndAlert({ show: false, message: "" }), 5000);
          }

          return {
            remainingTime: newRemainingTime,
            teamRemainingTime: newTeamRemainingTime,
            speakerTimeRemaining: newSpeakerTimeRemaining,
            debaters: newDebaters,
            currentSpeaker: newCurrentSpeaker,
            activeSpeakingTeam: newActiveSpeakingTeam,
            isRunning: !stopRunning,
          };
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [debateState?.isRunning, soundEnabled, updateDebateState]);

  // Handle step change
  const handleStepChange = (index: number) => {
    if (!debateState) return;
    if (index >= debateState.steps.length) {
      updateDebateState(() => ({ isRunning: false }));
      setShowDebateEndModal(true);
      return;
    }
    if (index < 0) return;
    updateDebateState(prevState => ({
      isRunning: false,
      currentSpeaker: null,
      activeSpeakingTeam: null,
      currentStepIndex: index,
      remainingTime: prevState.steps[index].time,
      speakerTimeRemaining: 0,
    }));
  };

  // Handle team speaking (when individual debater tracking is off)
  const handleTeamSpeaking = (team: "찬성" | "반대" | "긍정" | "부정") => {
    if (enableDebaters) return;
    updateDebateState(prevState => {
      if (!prevState) return {};
      const { teamRemainingTime, activeSpeakingTeam, currentSpeaker, speakerTimeRemaining, steps, currentStepIndex, debaters } = prevState;
      if (activeSpeakingTeam === team) {
        return { activeSpeakingTeam: null, currentSpeaker: null };
      }
      const teamTime = teamRemainingTime[team] || 0;
      if (teamTime <= 0) {
        if (soundEnabled) audioRef.current?.play();
        return {};
      }
      const teamDebater = debaters.find(d => d.team === team);
      if (teamDebater) {
        const isSameTeam = currentSpeaker?.team === team;
        let newSpeakerTimeRemaining = speakerTimeRemaining;
        if (!isSameTeam || speakerTimeRemaining === 0) {
          const maxTime = steps[currentStepIndex].maxSpeakTime || 0;
          newSpeakerTimeRemaining = Math.min(maxTime, teamTime);
        }
        return {
          activeSpeakingTeam: team,
          currentSpeaker: teamDebater,
          speakerTimeRemaining: newSpeakerTimeRemaining,
        };
      }
      return {};
    });
  };

  // Handle individual speaker selection
  const handleSpeakerSelect = (debater: Debater) => {
    if (!enableDebaters) return;
    updateDebateState(prevState => {
      if (!prevState) return {};
      const { steps, currentStepIndex, currentSpeaker, teamRemainingTime, speakerTimeRemaining } = prevState;
      if (steps[currentStepIndex]?.type !== "자유토론") return {};
      if (currentSpeaker?.id === debater.id) {
        return {
          currentSpeaker: null,
          activeSpeakingTeam: null,
          speakerTimeRemaining: 0,
          debaters: prevState.debaters.map(d => ({ ...d, isSpeaking: false }))
        };
      }
      const teamTime = teamRemainingTime[debater.team] || 0;
      if (teamTime <= 0) {
        if (soundEnabled) audioRef.current?.play();
        return {};
      }
      const isSameTeam = currentSpeaker?.team === debater.team;
      let newSpeakerTimeRemaining = speakerTimeRemaining;
      if (!isSameTeam || speakerTimeRemaining === 0) {
        const maxTime = steps[currentStepIndex].maxSpeakTime || 0;
        newSpeakerTimeRemaining = Math.min(maxTime, teamTime);
      }
      return {
        currentSpeaker: debater,
        activeSpeakingTeam: debater.team,
        speakerTimeRemaining: newSpeakerTimeRemaining,
        debaters: prevState.debaters.map(d => ({ ...d, isSpeaking: d.id === debater.id })),
      };
    });
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const calculateProgress = (current: number, total: number): number => {
    if (total === 0) return 0;
    return Math.max(0, Math.min(100, (current / total) * 100));
  };

  // Team color utility
  const getTeamColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") return "text-blue-500";
    if (team === "반대" || team === "부정") return "text-orange-500";
    return "";
  };

  // Team background color utility
  const getTeamBgColor = (team: "찬성" | "반대" | "긍정" | "부정" | null) => {
    if (team === "찬성" || team === "긍정") return "bg-blue-100";
    if (team === "반대" || team === "부정") return "bg-orange-100";
    return "";
  };

  if (isConnecting || !debateState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium">Connecting to Debate Room...</p>
          <p className="text-sm text-gray-500 mt-2">Room ID: {roomId}</p>
           {isConnecting && <p className="text-sm text-gray-500">Attempting to establish a real-time connection.</p>}
           {!isConnecting && !debateState && <p className="text-sm text-gray-500">Waiting for the host to start the debate...</p>}
        </div>
      </div>
    );
  }

  const { steps, currentStepIndex, remainingTime, isRunning, debaters, currentSpeaker, speakerTimeRemaining, teamRemainingTime, activeSpeakingTeam } = debateState;
  const currentStep = steps[currentStepIndex];

  const isPositiveTeam = (steps: DebateStep[]) => hasTeamType(steps, "긍정");
  const isNegativeTeam = (steps: DebateStep[]) => hasTeamType(steps, "부정");

  return (
    <div className="container mx-auto py-4 px-4 flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Link href="/" className="flex items-center text-gray-600">
          <Home className="h-5 w-5 mr-1" />
          <span className="text-sm">홈</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold">{templateName}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${isModerator ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {isModerator ? '👑 진행자' : '👁️ 관찰자'}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              방 #{roomId}
            </span>
            {isConnecting && (
              <span className="text-xs text-yellow-600">연결 중...</span>
            )}
          </div>
        </div>
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
              onClick={() => isModerator && handleStepChange(index)}
              disabled={!isModerator}
            >
              {index + 1}. {step.type}
              {step.team && ` (${step.team})`}
            </Button>
          ))}
        </div>
      </div>

      {showTimeEndAlert.show && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-md p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-yellow-800">{showTimeEndAlert.message}</p>
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

        {currentStep?.type === "자유토론" && (
           <div className="w-full">
            <div className="flex justify-between mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={`text-xs h-7 ${timeEditMode ? 'bg-red-50 text-red-600 border-red-300' : ''}`} 
                onClick={() => isModerator && setTimeEditMode(!timeEditMode)}
                disabled={!isModerator}
              >
                {timeEditMode ? "수정 완료" : "시간 오류 수정"}
              </Button>
              <div className="relative">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 rounded-full" onClick={() => setShowGuide(!showGuide)}>
                  <Info className="h-4 w-4" />
                </Button>
                {showGuide && (
                  <div className="absolute right-0 top-8 z-50 bg-white shadow-lg rounded-md border p-3 w-64">
                    <p className="text-xs text-gray-600">Click a team or debater to start their timer.</p>
                  </div>
                )}
              </div>
            </div>

            {activeSpeakingTeam && (
              <div className="text-center mb-6">
                <div className="text-sm font-medium">현재 발언</div>
                <div className={`text-2xl font-bold ${getTeamColor(activeSpeakingTeam)}`}>
                  {activeSpeakingTeam}팀 {formatTime(speakerTimeRemaining)}
                </div>
                <Progress value={calculateProgress(speakerTimeRemaining, Math.min(teamRemainingTime[activeSpeakingTeam] || 0, currentStep?.maxSpeakTime || 1))} className={`w-full h-1 mt-1 ${getTeamBgColor(activeSpeakingTeam)}`} />
                {(teamRemainingTime[activeSpeakingTeam] || 0) < (currentStep?.maxSpeakTime || 0) && (
                  <div className="text-xs text-gray-500 mt-1">
                    팀 시간 제한으로 {formatTime(teamRemainingTime[activeSpeakingTeam] || 0)} 남음
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 w-full mb-6">
              <div className={`text-center p-4 rounded-lg border-2 ${isModerator ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} transition-all ${activeSpeakingTeam === "찬성" || activeSpeakingTeam === "긍정" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                onClick={() => { if (!timeEditMode && isModerator) handleTeamSpeaking(isPositiveTeam(steps) ? "긍정" : "찬성"); }}>
                <div className="font-medium mb-1">{isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}</div>
                <div className="text-3xl font-bold text-blue-500 mb-2">{formatTime(isPositiveTeam(steps) ? (teamRemainingTime.긍정 || 0) : (teamRemainingTime.찬성 || 0))}</div>
                <Progress value={calculateProgress(isPositiveTeam(steps) ? (teamRemainingTime.긍정 || 0) : (teamRemainingTime.찬성 || 0), currentStep?.time ? currentStep.time / 2 : 1)} className="w-full h-3" />
                {timeEditMode && (
                  <div className="flex justify-center items-center gap-4 mt-3">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); updateDebateState(p => ({ teamRemainingTime: { ...p.teamRemainingTime, [isPositiveTeam(steps) ? "긍정" : "찬성"]: Math.max(0, (p.teamRemainingTime[isPositiveTeam(steps) ? "긍정" : "찬성"] || 0) - 10) } })) }}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); updateDebateState(p => ({ teamRemainingTime: { ...p.teamRemainingTime, [isPositiveTeam(steps) ? "긍정" : "찬성"]: Math.min(currentStep.time / 2, (p.teamRemainingTime[isPositiveTeam(steps) ? "긍정" : "찬성"] || 0) + 10) } })) }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className={`text-center p-4 rounded-lg border-2 ${isModerator ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} transition-all ${activeSpeakingTeam === "반대" || activeSpeakingTeam === "부정" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}
                onClick={() => { if (!timeEditMode && isModerator) handleTeamSpeaking(isNegativeTeam(steps) ? "부정" : "반대"); }}>
                <div className="font-medium mb-1">{isNegativeTeam(steps) ? "부정팀" : "반대팀"}</div>
                <div className="text-3xl font-bold text-orange-500 mb-2">{formatTime(isNegativeTeam(steps) ? (teamRemainingTime.부정 || 0) : (teamRemainingTime.반대 || 0))}</div>
                <Progress value={calculateProgress(isNegativeTeam(steps) ? (teamRemainingTime.부정 || 0) : (teamRemainingTime.반대 || 0), currentStep?.time ? currentStep.time / 2 : 1)} className="w-full h-3" />
                 {timeEditMode && (
                  <div className="flex justify-center items-center gap-4 mt-3">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); updateDebateState(p => ({ teamRemainingTime: { ...p.teamRemainingTime, [isNegativeTeam(steps) ? "부정" : "반대"]: Math.max(0, (p.teamRemainingTime[isNegativeTeam(steps) ? "부정" : "반대"] || 0) - 10) } })) }}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); updateDebateState(p => ({ teamRemainingTime: { ...p.teamRemainingTime, [isNegativeTeam(steps) ? "부정" : "반대"]: Math.min(currentStep.time / 2, (p.teamRemainingTime[isNegativeTeam(steps) ? "부정" : "반대"] || 0) + 10) } })) }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {enableDebaters && debaters.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-blue-700 mb-1">{isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}</h4>
                    {debaters.filter(d => d.team === "찬성" || d.team === "긍정").map(debater => (
                      <button 
                        key={debater.id} 
                        className={`flex items-center justify-between w-full p-2 mt-1 rounded-md text-xs ${debater.isSpeaking ? "bg-blue-500 text-white" : "bg-white border"} ${!isModerator ? 'opacity-60 cursor-not-allowed' : ''}`} 
                        onClick={() => isModerator && handleSpeakerSelect(debater)}
                        disabled={!isModerator}
                      >
                        <span>{debater.name}</span><span>{formatTime(debater.totalSpeakTime)}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-orange-700 mb-1">{isNegativeTeam(steps) ? "부정팀" : "반대팀"}</h4>
                    {debaters.filter(d => d.team === "반대" || d.team === "부정").map(debater => (
                      <button 
                        key={debater.id} 
                        className={`flex items-center justify-between w-full p-2 mt-1 rounded-md text-xs ${debater.isSpeaking ? "bg-orange-500 text-white" : "bg-white border"} ${!isModerator ? 'opacity-60 cursor-not-allowed' : ''}`} 
                        onClick={() => isModerator && handleSpeakerSelect(debater)}
                        disabled={!isModerator}
                      >
                        <span>{debater.name}</span><span>{formatTime(debater.totalSpeakTime)}</span>
                      </button>
                    ))}
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
            onClick={() => isModerator && updateDebateState(p => ({ isRunning: false, remainingTime: p.steps[p.currentStepIndex].time, speakerTimeRemaining: 0 }))}
            disabled={!isModerator}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
          <Button 
            variant={isRunning ? "destructive" : "default"} 
            size="lg" 
            className="h-14 w-14" 
            onClick={() => isModerator && updateDebateState(p => ({ isRunning: !p.isRunning }))}
            disabled={!isModerator}
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
          onClick={() => isModerator && handleStepChange(currentStepIndex - 1)} 
          disabled={!isModerator || currentStepIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> 이전 단계
        </Button>
        <Button 
          variant="outline" 
          className="w-32" 
          onClick={() => isModerator && handleStepChange(currentStepIndex + 1)}
          disabled={!isModerator}
        >
          {currentStepIndex === steps.length - 1 ? "토론 종료" : "다음 단계"} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* 토론 종료 모달 */}
      {showDebateEndModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-center">토론이 끝났습니다</h3>
            {enableDebaters && debaters.length > 0 && (
               <div className="mb-6">
                 <h4 className="font-medium mb-3 text-center text-gray-700">토론자 발언 시간</h4>
                 <div className="grid grid-cols-2 gap-4">
                   {/* Affirmative Team */}
                   <div className="space-y-3">
                     <h5 className="text-sm font-medium text-blue-700">{isPositiveTeam(steps) ? "긍정팀" : "찬성팀"}</h5>
                     {debaters.filter(d => d.team === "찬성" || d.team === "긍정").sort((a,b) => b.totalSpeakTime - a.totalSpeakTime).map(debater => (
                       <div key={debater.id} className="flex items-center justify-between bg-blue-50 p-2 rounded-md">
                         <span className="text-sm">{debater.name}</span>
                         <span className="text-sm font-medium text-blue-700">{formatTime(debater.totalSpeakTime)}</span>
                       </div>
                     ))}
                   </div>
                   {/* Negative Team */}
                   <div className="space-y-3">
                     <h5 className="text-sm font-medium text-orange-700">{isNegativeTeam(steps) ? "부정팀" : "반대팀"}</h5>
                     {debaters.filter(d => d.team === "반대" || d.team === "부정").sort((a,b) => b.totalSpeakTime - a.totalSpeakTime).map(debater => (
                       <div key={debater.id} className="flex items-center justify-between bg-orange-50 p-2 rounded-md">
                         <span className="text-sm">{debater.name}</span>
                         <span className="text-sm font-medium text-orange-700">{formatTime(debater.totalSpeakTime)}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            )}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/")} className="w-28">홈으로</Button>
              <Button onClick={() => setShowDebateEndModal(false)} className="w-28">닫기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
