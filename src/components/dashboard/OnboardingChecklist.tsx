import { type ReactNode } from 'react';
import { Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconBadge } from '@/components/layout/IconBadge';
import { GrowthEcho } from '@/components/brand/GrowthEcho';

interface OnboardingStep {
  title: string;
  description: ReactNode;
}

interface OnboardingChecklistProps {
  description: string;
  steps: OnboardingStep[];
}

// Substitui o card "🚀 Primeiros Passos" que era copiado quase igual em cada
// dashboard de marketplace (emoji como marcador de título, mesma estrutura).
// É o componente de menor frequência de uso do sistema (aparece só até o
// usuário completar os passos), por isso é o que recebe o motion mais rico
// (hairline + GrowthEcho) — não compete com telas de trabalho diário.
export function OnboardingChecklist({ description, steps }: OnboardingChecklistProps) {
  return (
    <Card className="panel-accent border-dashed border-primary/25 bg-primary/[0.02]">
      <CardHeader>
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <IconBadge icon={Rocket} size="sm" />
            <div>
              <CardTitle className="text-base">Primeiros Passos</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <GrowthEcho variant="ribbon" trigger="in-view" className="hidden h-4 w-16 shrink-0 opacity-70 sm:block" />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal list-inside space-y-3 text-muted-foreground text-sm">
          {steps.map((step, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">{step.title}</span>
              {' — '}
              {step.description}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
