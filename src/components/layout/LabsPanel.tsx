import { Button } from '../Button';
import { Badge } from '../Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { LABS } from '../../labs/data';
import { Lab, LabState } from '../../types';

interface LabsPanelProps {
  labState: LabState;
}

export function LabsPanel({ labState }: LabsPanelProps) {
  const { setLabState } = useStore(useShallow(state => ({ setLabState: state.setLabState })));

  const currentLab = labState.currentLabId ? LABS.find((l) => l.id === labState.currentLabId) : null;
  const currentStep = currentLab?.steps[labState.currentStepIndex];

  const startLab = (labId: string) => {
    setLabState({ currentLabId: labId, currentStepIndex: 0, completedSteps: [] });
  };

  // @ts-ignore
  const completeStep = (stepId: string) => {
    if (!currentLab) return;
    const newCompleted = [...labState.completedSteps, stepId];
    const nextStepIndex = labState.currentStepIndex + 1;

    if (nextStepIndex >= currentLab.steps.length) {
      setLabState({
        completedSteps: newCompleted,
        completedLabs: [...labState.completedLabs, currentLab.id],
        currentLabId: null,
        currentStepIndex: 0,
      });
    } else {
      setLabState({ completedSteps: newCompleted, currentStepIndex: nextStepIndex });
    }
  };

  const isStepCompleted = (stepId: string) => labState.completedSteps.includes(stepId);
  const isLabCompleted = (labId: string) => labState.completedLabs.includes(labId);
  const isStepCurrent = (stepId: string) => currentStep?.id === stepId;

  if (!currentLab) {
    return (
      <div className="space-y-3">
        {LABS.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            completed={isLabCompleted(lab.id)}
            onStart={() => startLab(lab.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => setLabState({ currentLabId: null })} className="w-full justify-start">
        ← Back to Labs
      </Button>
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">{currentLab.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{currentLab.description}</p>
          <div className="space-y-2">
            {currentLab.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                completed={isStepCompleted(step.id)}
                current={isStepCurrent(step.id)}
                
              />
            ))}
          </div>
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {labState.currentStepIndex + 1} of {currentLab.steps.length}
            </span>
            <div className="flex gap-2"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LabCard({ lab, completed, onStart }: { lab: Lab; completed: boolean; onStart: () => void }) {
  return (
    <Card className={completed ? 'border-green-500/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium">{lab.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{lab.description}</p>
          </div>
          {completed ? (
            <Badge variant="success">Done</Badge>
          ) : (
            <Button size="sm" onClick={onStart}>Start</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  index,
  completed,
  current
}: {
  step: { id: string; title: string; description: string; instruction: string; hint?: string };
  index: number;
  completed: boolean;
  current: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${current ? 'border-primary bg-primary/5' : completed ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border">
          {completed ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : current ? (
            <span className="text-primary">{index + 1}</span>
          ) : (
            <span className="text-muted-foreground">{index + 1}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{step.title}</span>
            {completed && <Badge variant="success" className="text-[10px]">Done</Badge>}
            {current && !completed && <Badge variant="live" className="text-[10px]">Current</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
          <p className="text-sm font-mono text-primary mt-1 bg-muted p-2 rounded">{step.instruction}</p>
          {step.hint && (
            <p className="text-xs text-muted-foreground mt-2 italic">Hint: {step.hint}</p>
          )}
        </div>
        {!completed && current && (<Badge variant="live" className="animate-pulse">Waiting...</Badge>)}
      </div>
      {current && !completed && (
        <div className="pt-4 mt-4 border-t border-border/20 flex gap-2 justify-center">
          <button onClick={() => useStore.getState().setUI({ activePage: 'sql-lab' } as any)} className="text-[11px] text-muted-foreground hover:text-foreground">Full Editor</button>
          <span className="text-border">|</span>
          <button onClick={() => useStore.getState().setUI({ activePage: 'dependencies' } as any)} className="text-[11px] text-muted-foreground hover:text-foreground">View Graph</button>
          <span className="text-border">|</span>
          <button onClick={() => document.dispatchEvent(new CustomEvent('toggle-ai-prompt', { detail: `Give me a hint on how to complete the current lab step: ${step.title}` }))} className="text-[11px] text-primary hover:text-primary/80">Ask AI</button>
        </div>
      )}
    </div>
  );
}