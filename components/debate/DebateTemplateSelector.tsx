"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, School } from "lucide-react"
import { DebateTemplate } from "@/lib/types/debate"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { schoolVariants } from "@/lib/school-variants"

interface DebateTemplateSelectorProps {
  templates: DebateTemplate[];
  onSelectTemplate: (template: DebateTemplate) => void;
}

export function DebateTemplateSelector({ templates, onSelectTemplate }: DebateTemplateSelectorProps) {
  const router = useRouter()
  // 홈 화면에서 숨길 템플릿 필터링
  const visibleTemplates = templates.filter(template => !template.hidden);
  
  // 학교별 토론 방식 - school-variants.ts에서 직접 가져오기
  const allSchoolVariants = [];
  
  // schoolVariants 객체의 각 카테고리에서 학교 변형 추출
  for (const key in schoolVariants) {
    if (Object.prototype.hasOwnProperty.call(schoolVariants, key)) {
      allSchoolVariants.push(...schoolVariants[key]);
    }
  }
  
  // 학교 변형 즉시 시작 처리
  const handleStartSchoolVariant = (variant: any, templateId: string) => {
    const baseTemplate = templates.find(t => t.id === templateId);
    
    if (baseTemplate) {
      // 토론 설정을 localStorage에 저장
      localStorage.setItem(
        "debateConfig",
        JSON.stringify({
          steps: variant.steps,
          affirmativeCount: 2,
          negativeCount: 2,
          templateName: `${variant.name} ${baseTemplate.name}`,
          enableDebaters: true,
          university: variant.university,
        })
      );
      
      // 토론 페이지로 이동
      router.push("/debate");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 토론 템플릿 */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold mb-4">토론 템플릿</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTemplates.map((template) => (
            <Card 
              key={template.id}
              className="cursor-pointer h-full border transition-all duration-300 hover:border-primary/50 hover:shadow-md" 
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{template.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* 학교별 토론 방식 */}
      <div className="md:w-64 lg:w-72">
        <h2 className="text-xl font-semibold mb-4">학교별 토론 방식</h2>
        <div className="space-y-3">
          {allSchoolVariants.map((variant) => (
            <Card 
              key={variant.id}
              className="cursor-pointer border transition-all duration-300 hover:border-primary/50 hover:shadow-md"
              onClick={() => handleStartSchoolVariant(variant, variant.id.includes('free-debate') ? 'free-debate' : 'seda-debate')}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <School className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold">{variant.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{variant.university}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">
                        {variant.id.includes('free-debate') ? '자유토론' : 
                         variant.id.includes('seda-debate') ? '세다 토론' : 
                         variant.id.includes('oxford-debate') ? '옥스포드식' : 
                         variant.id.includes('spar-debate') ? '스팍 토론' : 
                         variant.id.includes('fishbowl-debate') ? '피쉬볼 토론' : '맞춤 토론'}
                      </span>
                      <Button size="sm" className="h-7 px-2 text-xs">
                        시작하기
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 