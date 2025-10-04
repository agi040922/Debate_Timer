"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { DebateTemplate } from "@/lib/types/debate"

interface DebateTemplateSelectorProps {
  templates: DebateTemplate[];
  onSelectTemplate: (template: DebateTemplate) => void;
}

export function DebateTemplateSelector({ templates, onSelectTemplate }: DebateTemplateSelectorProps) {
  // 홈 화면에서 숨길 템플릿 필터링
  const visibleTemplates = templates.filter(template => !template.hidden);
  

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">토론 템플릿</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  )
} 