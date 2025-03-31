"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Plus, Minus, Clock, Users, ChevronRight, RotateCcw, School, Info, User, X } from "lucide-react"
import { DebateTemplate, DebateStep, SchoolVariant, IconType } from "@/lib/types/debate"
import { Card, CardContent } from "@/components/ui/card"

// 아이콘 문자열을 컴포넌트로 변환하는 함수 (필요시 사용)
const getIconComponent = (iconType: IconType) => {
  switch (iconType) {
    case "zap":
      return <School className="h-4 w-4" />; // School 아이콘으로 수정할 부분
    default:
      return <School className="h-4 w-4" />; // 기본 아이콘
  }
};

interface DebateSetupFormProps {
  selectedTemplate: DebateTemplate;
  onBackToTemplates: () => void;
  onStartDebate: (config: DebateConfig) => void;
}

export interface DebateConfig {
  steps: DebateStep[];
  affirmativeCount: number;
  negativeCount: number;
  templateName: string;
  enableDebaters: boolean;
  university?: string | null;
  debaterNames?: string[];
}

// 초 단위를 MM:SS 형식으로 변환
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// 팀 아이콘과 색상 설정 (찬성/반대/긍정/부정)
const getTeamStyle = (team: string | null | undefined) => {
  if (team === "찬성" || team === "긍정") {
    return "bg-blue-100 text-blue-800";
  } else if (team === "반대" || team === "부정") {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-gray-100 text-gray-800";
}

// getDefaultTimeForType 함수 아래에 추가
// 순서 추가 시 팀 설정
const getDefaultTeamForType = (type: string): "찬성" | "반대" | "긍정" | "부정" | null => {
  switch (type) {
    case "자유토론":
    case "숙의시간":
    case "사회자 인사":
    case "청중 사전 투표":
    case "청중 질문":
    case "패널 질문":
    case "결과 발표":
      return null;
    default:
      return "찬성"; // 기본적으로 찬성으로 설정
  }
}

export function DebateSetupForm({ selectedTemplate, onBackToTemplates, onStartDebate }: DebateSetupFormProps) {
  const [customSteps, setCustomSteps] = useState<DebateStep[]>([...selectedTemplate.steps])
  const [affirmativeCount, setAffirmativeCount] = useState(2)
  const [negativeCount, setNegativeCount] = useState(2)
  const [showAddStepModal, setShowAddStepModal] = useState(false)
  const [enableDebaters, setEnableDebaters] = useState(false)
  const [showSchoolVariantModal, setShowSchoolVariantModal] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [showGuidePopup, setShowGuidePopup] = useState(false)
  
  // 토론자 이름 설정 - 빈 문자열로 초기화
  const [debaterNames, setDebaterNames] = useState<string[]>([
    "", "", "", ""
  ])
  
  // 토론자 수가 변경되면 이름 배열 업데이트
  useEffect(() => {
    if (enableDebaters) {
      const newNames = [...debaterNames];
      
      // 기존 이름 보존하면서 새 항목은 빈 문자열로 초기화
      while (newNames.length < affirmativeCount + negativeCount) {
        newNames.push("");
      }
      
      // 초과 항목 제거
      if (newNames.length > affirmativeCount + negativeCount) {
        newNames.length = affirmativeCount + negativeCount;
      }
      
      setDebaterNames(newNames);
    }
  }, [affirmativeCount, negativeCount]);
  
  // 토론자 이름 변경 처리
  const handleDebaterNameChange = (index: number, name: string) => {
    const newNames = [...debaterNames];
    newNames[index] = name;
    setDebaterNames(newNames);
  };
  
  // 기본 시간 가져오기
  const getDefaultTimeForType = (type: string): number => {
    switch (type) {
      case "입론":
        return 120 // 2 minutes
      case "자유토론":
        return 600 // 10 minutes
      case "숙의시간":
        return 180 // 3 minutes
      case "마무리 발언":
        return 60 // 1 minute
      case "교차질의":
        return 180 // 3 minutes
      case "반론":
        return 180 // 3 minutes
      case "사회자 인사":
        return 60 // 1 minute
      case "청중 사전 투표":
        return 60 // 1 minute
      case "청중 질문":
        return 180 // 3 minutes
      case "패널 질문":
        return 180 // 3 minutes  
      case "결과 발표":
        return 120 // 2 minutes
      case "기조발언":
        return 150 // 2분 30초
      default:
        return 120
    }
  }
  
  // 순서 추가
  const handleAddStep = (type: string) => {
    const newStep: DebateStep = {
      id: `step-${Date.now()}`,
      type: type as any,
      time: getDefaultTimeForType(type),
      team: getDefaultTeamForType(type),
      ...(type === "자유토론" || type === "청중 질문" || type === "패널 질문" ? { maxSpeakTime: 60 } : {}),
    }
    setCustomSteps([...customSteps, newStep])
    setShowAddStepModal(false)
  }
  
  // 순서 제거
  const handleRemoveStep = (index: number) => {
    const newSteps = [...customSteps]
    newSteps.splice(index, 1)
    setCustomSteps(newSteps)
  }
  
  // 시간 업데이트
  const handleUpdateTime = (index: number, seconds: number) => {
    const newSteps = [...customSteps]
    newSteps[index].time = seconds
    setCustomSteps(newSteps)
  }
  
  // 시간 문자열 입력 처리
  const handleTimeInputChange = (index: number, timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      const totalSeconds = mins * 60 + secs;
      handleUpdateTime(index, totalSeconds);
    }
  }
  
  // 최대 발언 시간 업데이트
  const handleUpdateMaxSpeakTime = (index: number, seconds: number) => {
    const newSteps = [...customSteps]
    if (newSteps[index].maxSpeakTime !== undefined) {
      newSteps[index].maxSpeakTime = seconds
      setCustomSteps(newSteps)
    }
  }
  
  // 최대 발언 시간 문자열 입력 처리
  const handleMaxSpeakTimeInputChange = (index: number, timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      const totalSeconds = mins * 60 + secs;
      handleUpdateMaxSpeakTime(index, totalSeconds);
    }
  }
  
  // 팀 전환 - 찬성/반대/긍정/부정 4개 팀 간 순환
  const handleToggleTeam = (index: number) => {
    const newSteps = [...customSteps]
    const currentTeam = newSteps[index].team;
    
    // 팀 변경 - 찬성 -> 반대 -> 긍정 -> 부정 -> 찬성 순으로 순환
    if (currentTeam === "찬성") {
      newSteps[index].team = "반대";
    } else if (currentTeam === "반대") {
      newSteps[index].team = "긍정";
    } else if (currentTeam === "긍정") {
      newSteps[index].team = "부정";
    } else if (currentTeam === "부정") {
      newSteps[index].team = "찬성";
    } else {
      // null인 경우 찬성으로 설정
      newSteps[index].team = "찬성";
    }
    
    setCustomSteps(newSteps)
  }
  
  // 학교별 방식 선택
  const handleSelectSchoolVariant = (variant: SchoolVariant) => {
    const updatedTemplate = {
      ...selectedTemplate,
      name: `${variant.name} ${selectedTemplate.name}`,
      university: variant.university,
    }
    setCustomSteps([...variant.steps])
    setShowSchoolVariantModal(false)
  }
  
  // 토론 시작 함수 수정 - 비어있는 이름은 기본값으로 설정
  const handleStartDebate = () => {
    // 빈 이름을 기본값으로 설정
    const finalDebaterNames = enableDebaters 
      ? debaterNames.map((name, index) => {
          if (!name.trim()) {
            // 빈 이름인 경우 기본값 설정
            if (index < affirmativeCount) {
              return `찬성${index + 1}`;
            } else {
              return `반대${index - affirmativeCount + 1}`;
            }
          }
          return name;
        })
      : [];
    
    onStartDebate({
      steps: customSteps,
      affirmativeCount: enableDebaters ? affirmativeCount : 0,
      negativeCount: enableDebaters ? negativeCount : 0,
      templateName: selectedTemplate.name,
      enableDebaters,
      university: selectedTemplate.university || null,
      debaterNames: finalDebaterNames
    })
  }
  
  // 드래그 앤 드롭 처리
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(customSteps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setCustomSteps(items)
  }

  return (
    <div className="space-y-6 pb-20 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <h2 className="text-xl sm:text-2xl font-bold">{selectedTemplate.name} 설정</h2>
          <div className="relative ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-500 rounded-full"
              onClick={() => setShowGuidePopup(!showGuidePopup)}
            >
              <Info className="h-4 w-4" />
            </Button>
            
            {/* 설정 가이드 팝업 - 위치 조정 */}
            {showGuidePopup && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-8 z-50 bg-white shadow-lg rounded-md border p-3 w-64 max-w-[90vw]">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-medium">토론 설정 가이드</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 text-gray-400"
                    onClick={() => setShowGuidePopup(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>
                    <span className="font-medium">토론 순서 및 시간 설정</span>: 각 토론 단계의 순서를 드래그하여 변경하거나, 
                    시간을 조정할 수 있습니다. 하단의 <span className="px-1 py-0.5 bg-gray-100 rounded">순서 추가</span> 버튼으로 
                    새 단계를 추가할 수도 있습니다.
                  </p>
                  <p>
                    <span className="font-medium">토론자 설정</span>: 토론자 설정을 활성화하면 각 팀의 인원수와 토론자 이름을 
                    설정할 수 있습니다. 자유토론에서 개인별 발언 시간을 추적하는 데 유용합니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedTemplate.schoolVariants && selectedTemplate.schoolVariants.length > 0 ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSchoolVariantModal(true)}
              className="flex items-center gap-1"
            >
              <School className="h-4 w-4 mr-1" />
              학교별 변형 선택
            </Button>
          ) : null}
          
          {selectedTemplate.guide && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1"
            >
              <Info className="h-4 w-4 mr-1" />
              토론 방식 안내
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToTemplates}
          >
            다른 템플릿 선택
          </Button>
        </div>
      </div>

      {/* 토론 방식 안내 모달 */}
      {showGuide && selectedTemplate.guide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4">토론 방식 안내</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-5 mb-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">토론 안내</h4>
                  <p className="text-blue-800 text-sm">{selectedTemplate.guide}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowGuide(false)}
                className="min-w-24"
              >
                확인 후 설정하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 학교별 토론 방식 선택 모달 */}
      {showSchoolVariantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4">학교별 토론 방식 선택</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {selectedTemplate.schoolVariants?.map((variant) => (
                <Card 
                  key={variant.id} 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleSelectSchoolVariant(variant)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getIconComponent(variant.icon || "default")}
                      <h4 className="font-medium">{variant.name}</h4>
                    </div>
                    <div className="text-xs text-gray-500">{variant.university}</div>
                    <div className="text-sm mt-2">{variant.steps.length}단계 · {variant.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowSchoolVariantModal(false)}
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 토론 순서 및 시간 설정 - 모바일 앱 최적화 */}
      <div className="bg-white rounded-lg p-3 sm:p-6 border shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          토론 순서 및 시간 설정
        </h3>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="debate-steps">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 max-h-[50vh] overflow-y-auto pr-1"
              >
                {customSteps.map((step, index) => (
                  <Draggable
                    key={step.id}
                    draggableId={step.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-gray-50 p-2 sm:p-3 rounded-md border"
                      >
                        <div className="font-medium w-full md:w-24 flex-shrink-0 truncate text-sm">
                          {index + 1}. {step.type}
                        </div>

                        {step.team !== null && (
                          <div 
                            className={`flex items-center justify-center px-2 py-1 text-xs font-medium rounded cursor-pointer ${
                              getTeamStyle(step.team)
                            }`}
                            onClick={() => handleToggleTeam(index)}
                          >
                            {step.team}
                          </div>
                        )}

                        <div className="flex-1 flex items-center gap-1 sm:gap-2 min-w-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-1 sm:px-2 flex-shrink-0"
                            onClick={() => handleUpdateTime(index, Math.max(10, step.time - 10))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <Input
                            type="text"
                            value={formatTime(step.time)}
                            onChange={(e) => handleTimeInputChange(index, e.target.value)}
                            className="flex-1 text-center h-7 px-1 sm:px-2 min-w-0"
                          />

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-1 sm:px-2 flex-shrink-0"
                            onClick={() => handleUpdateTime(index, step.time + 10)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* 자유토론 설정 - 모바일 앱에서 최적화 */}
                        {step.type === "자유토론" && step.maxSpeakTime !== undefined && (
                          <div className="flex items-center gap-1 mt-1 md:mt-0 w-full md:w-auto">
                            <div className="text-xs text-gray-600">최대 발언:</div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-1 sm:px-2 flex-shrink-0"
                                onClick={() => handleUpdateMaxSpeakTime(index, Math.max(10, (step.maxSpeakTime || 60) - 10))}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <Input
                                type="text"
                                value={formatTime(step.maxSpeakTime || 60)}
                                onChange={(e) => handleMaxSpeakTimeInputChange(index, e.target.value)}
                                className="w-16 sm:w-20 text-center h-7 px-1 sm:px-2"
                              />

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-1 sm:px-2 flex-shrink-0"
                                onClick={() => handleUpdateMaxSpeakTime(index, (step.maxSpeakTime || 60) + 10)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-red-500 flex-shrink-0"
                          onClick={() => handleRemoveStep(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="mt-3 sm:mt-4 flex justify-center">
          <Button
            variant="outline"
            className="w-full text-gray-600 border-dashed"
            onClick={() => setShowAddStepModal(!showAddStepModal)}
          >
            <Plus className="mr-2 h-4 w-4" />
            순서 추가
          </Button>
        </div>

        {/* 순서 추가 버튼 그리드 레이아웃 최적화 */}
        {showAddStepModal && (
          <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 max-h-[40vh] overflow-y-auto">
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("입론")}
            >
              입론
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("기조발언")}
            >
              기조발언
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("반론")}
            >
              반론
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("자유토론")}
            >
              자유토론
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("교차질의")}
            >
              교차질의
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("숙의시간")}
            >
              숙의시간
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("마무리 발언")}
            >
              마무리 발언
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("사회자 인사")}
            >
              사회자 인사
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("청중 사전 투표")}
            >
              청중 사전 투표
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("청중 질문")}
            >
              청중 질문
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("패널 질문")}
            >
              패널 질문
            </Button>
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={() => handleAddStep("결과 발표")}
            >
              결과 발표
            </Button>
          </div>
        )}
      </div>

      {/* 토론자 설정 섹션 - 모바일 앱 최적화 */}
      <div className="bg-white rounded-lg p-3 sm:p-6 border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center">
            <Users className="mr-2 h-5 w-5" />
            토론자 설정
          </h3>
          <div className="flex items-center space-x-2">
            <Switch
              checked={enableDebaters}
              onCheckedChange={setEnableDebaters}
            />
            <Label>토론자 설정 활성화</Label>
          </div>
        </div>

        {enableDebaters && (
          <div className="space-y-4 sm:space-y-6 max-h-60 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="text-sm sm:text-base font-medium text-blue-700 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    찬성팀
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAffirmativeCount(Math.max(1, affirmativeCount - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center">{affirmativeCount}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAffirmativeCount(Math.min(4, affirmativeCount + 1))}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: affirmativeCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-14 text-xs sm:text-sm font-medium text-gray-500">찬성 {i+1}</div>
                      <Input 
                        value={debaterNames[i] || ""}
                        onChange={(e) => handleDebaterNameChange(i, e.target.value)}
                        className="flex-1 h-8 sm:h-9 text-sm"
                        placeholder={`찬성 ${i+1} 이름`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="text-sm sm:text-base font-medium text-orange-700 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    반대팀
                  </h4>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setNegativeCount(Math.max(1, negativeCount - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center">{negativeCount}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setNegativeCount(Math.min(4, negativeCount + 1))}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: negativeCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-14 text-xs sm:text-sm font-medium text-gray-500">반대 {i+1}</div>
                      <Input 
                        value={debaterNames[affirmativeCount + i] || ""}
                        onChange={(e) => handleDebaterNameChange(affirmativeCount + i, e.target.value)}
                        className="flex-1 h-8 sm:h-9 text-sm"
                        placeholder={`반대 ${i+1} 이름`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 토론 시작 버튼 - 고정된 높이로 수정 */}
      <Button className="w-full h-12 sm:h-14 text-base sm:text-lg py-2 sm:py-3" onClick={handleStartDebate} size="lg">
        토론 시작하기
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
} 