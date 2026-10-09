import { useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Badge } from './Badge';
import { Button } from './Button';
import { parseSQL } from '../sql/parser';
import { createSimulationStepsForParsedSQL } from '../sql/simulator';

const STEP_ICONS: Record<string, JSX.Element> = {
  parse: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  identify: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  resolve: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  execute: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  store: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  define: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  graph: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  result: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  refresh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  stale: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  scan: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  filter: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  group: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  aggregate: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

const HIGHLIGHT_COLORS: Record<string, string> = {
  view: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  'materialized-view': 'border-green-500/50 bg-green-500/10 text-green-400',
  table: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  stale: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  fresh: 'border-green-500/50 bg-green-500/10 text-green-400',
  refresh: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
};

const SPEED_OPTIONS = [
  { label: '0.5x', value: 2000 },
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '3x', value: 300 },
];

export function SimulationView() {
  const {
    currentSQL,
    simulationSteps,
    simulationStepIndex,
    isSimulationPlaying,
    simulationSpeedIndex,
    setSimulationState,
    runQuery,
    lastResult,
  } = useStore(
    useShallow((state) => ({
      currentSQL: state.currentSQL,
      simulationSteps: state.simulationSteps,
      simulationStepIndex: state.simulationStepIndex,
      isSimulationPlaying: state.isSimulationPlaying,
      simulationSpeedIndex: state.simulationSpeedIndex,
      setSimulationState: state.setSimulationState,
      runQuery: state.runQuery,
      lastResult: state.lastResult,
    }))
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalSteps = simulationSteps.length;
  const speed = SPEED_OPTIONS[simulationSpeedIndex]?.value || 1000;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advanceStep = useCallback(() => {
    if (simulationStepIndex < totalSteps - 1) {
      setSimulationState({ simulationStepIndex: simulationStepIndex + 1 });
    } else {
      setSimulationState({ isSimulationPlaying: false });
    }
  }, [simulationStepIndex, totalSteps, setSimulationState]);

  useEffect(() => {
    if (isSimulationPlaying && simulationStepIndex < totalSteps - 1) {
      timerRef.current = setTimeout(advanceStep, speed);
    } else if (simulationStepIndex >= totalSteps - 1 && isSimulationPlaying) {
      setSimulationState({ isSimulationPlaying: false });
    }
    return clearTimer;
  }, [isSimulationPlaying, simulationStepIndex, speed, advanceStep, clearTimer, totalSteps, setSimulationState]);

  const handlePlay = () => {
    if (totalSteps === 0) return;
    if (simulationStepIndex >= totalSteps - 1) {
      setSimulationState({ simulationStepIndex: 0, isSimulationPlaying: true });
    } else {
      setSimulationState({ isSimulationPlaying: true });
    }
  };

  const handlePause = () => {
    clearTimer();
    setSimulationState({ isSimulationPlaying: false });
  };

  const handleNext = () => {
    clearTimer();
    setSimulationState({
      isSimulationPlaying: false,
      simulationStepIndex: Math.min(totalSteps - 1, Math.max(0, simulationStepIndex + 1)),
    });
  };

  const handlePrev = () => {
    clearTimer();
    setSimulationState({
      isSimulationPlaying: false,
      simulationStepIndex: Math.max(0, simulationStepIndex - 1),
    });
  };

  const handleRestart = () => {
    clearTimer();
    setSimulationState({
      isSimulationPlaying: false,
      simulationStepIndex: 0,
    });
  };

  const handleNewSimulation = () => {
    clearTimer();
    setSimulationState({
      currentSQL: '',
      simulationSteps: [],
      simulationStepIndex: -1,
      isSimulationPlaying: false,
    });
  };

  const handleLaunchQuery = async (query: string) => {
    const parsed = parseSQL(query);
    const steps = createSimulationStepsForParsedSQL(query, parsed);
    setSimulationState({
      currentSQL: query,
      simulationSteps: steps,
      simulationStepIndex: 0,
      isSimulationPlaying: true,
    });
    await runQuery(query);
  };

  const progress = totalSteps > 0 ? Math.min(100, Math.max(0, ((simulationStepIndex + 1) / totalSteps) * 100)) : 0;

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col bg-background text-foreground">
      <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-col rounded-xl border border-border/20 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Execution Simulator</h2>
              <p className="text-xs text-muted-foreground">Animated step-by-step query pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalSteps > 0 && (
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/30">
                {SPEED_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setSimulationState({ simulationSpeedIndex: i })}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      i === simulationSpeedIndex
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {totalSteps > 0 && (
              <Button variant="secondary" size="sm" onClick={handleNewSimulation}>
                New Simulation
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {totalSteps === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-bold">No Active Simulation</h3>
              <p className="text-sm text-muted-foreground">
                Run a query in SQL Lab or click one of the preset operation templates below to watch the step-by-step execution pipeline in action.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full pt-2">
              <PresetButton
                title="1. Create Virtual View"
                desc="Store definition, live evaluation"
                icon="👁️"
                onClick={() => handleLaunchQuery('CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;')}
              />
              <PresetButton
                title="2. Create Materialized View"
                desc="Execute query, store physical table"
                icon="💾"
                onClick={() => handleLaunchQuery('CREATE MATERIALIZED VIEW expensive_artworks_mv AS SELECT * FROM ARTWORK WHERE price > 100000;')}
              />
              <PresetButton
                title="3. Modify Base Table (DML)"
                desc="Trigger update, mark MVs STALE"
                icon="📝"
                onClick={() => handleLaunchQuery('UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;')}
              />
              <PresetButton
                title="4. Query Materialized View"
                desc="Read stored physical snapshot"
                icon="🔍"
                onClick={() => handleLaunchQuery('SELECT * FROM expensive_artworks_mv;')}
              />
              <PresetButton
                title="5. Refresh Materialized View"
                desc="Re-execute query, update snapshot"
                icon="⚡"
                onClick={() => handleLaunchQuery('REFRESH MATERIALIZED VIEW expensive_artworks_mv;')}
              />
              <PresetButton
                title="6. Query Virtual View"
                desc="Evaluate definition against live data"
                icon="⚡"
                onClick={() => handleLaunchQuery('SELECT * FROM expensive_artworks;')}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Column: Timeline & Controls */}
            <div className="flex-1 flex flex-col border-r border-border/20 overflow-hidden">
              {/* SQL Statement Display */}
              <div className="p-4 border-b border-border/20 bg-muted/10 flex items-center justify-between">
                <div className="font-mono text-xs text-muted-foreground truncate max-w-xl">
                  <span className="font-semibold text-primary">Active SQL:</span> {currentSQL}
                </div>
                <Badge variant="live">Step {Math.max(1, simulationStepIndex + 1)} of {totalSteps}</Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted/40 h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls Bar */}
              <div className="p-3 border-b border-border/20 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handlePrev} disabled={simulationStepIndex <= 0}>
                    ◄ Prev
                  </Button>
                  {isSimulationPlaying ? (
                    <Button variant="secondary" size="sm" onClick={handlePause}>
                      ❚❚ Pause
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handlePlay}>
                      ▶ Play
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={handleNext} disabled={simulationStepIndex >= totalSteps - 1}>
                    Next ►
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRestart}>
                    ↺ Restart
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  {Math.round(progress)}% Completed
                </div>
              </div>

              {/* Vertical Step Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {simulationSteps.map((step, index) => {
                  const isComplete = index < simulationStepIndex;
                  const isCurrent = index === simulationStepIndex;

                  return (
                    <div
                      key={step.id || index}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                        isCurrent
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/30 scale-[1.01]'
                          : isComplete
                          ? 'border-border/30 bg-muted/10 opacity-90'
                          : 'border-border/10 bg-transparent opacity-50'
                      }`}
                    >
                      {/* Step Status Badge / Indicator */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isComplete ? (
                          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border-2 border-primary flex items-center justify-center font-bold text-xs animate-pulse ring-4 ring-primary/20">
                            ➔
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted/40 text-muted-foreground border border-border/30 flex items-center justify-center font-bold text-xs">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Step Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {STEP_ICONS[step.icon] || STEP_ICONS['execute']}
                          </span>
                          <h4 className="font-semibold text-sm tracking-tight">{step.label}</h4>
                          {step.highlight && (
                            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono ${HIGHLIGHT_COLORS[step.highlight] || ''}`}>
                              {step.highlight}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Execution Insights & Result Output */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 border-border/20 bg-muted/10 flex flex-col p-4 overflow-y-auto space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Simulation Insights
              </h3>

              <div className="neo-surface p-4 rounded-xl space-y-3">
                <div className="text-xs text-muted-foreground">Current Pipeline State</div>
                <div className="font-mono text-sm font-semibold text-primary">
                  {simulationStepIndex >= 0 && simulationSteps[simulationStepIndex]
                    ? simulationSteps[simulationStepIndex].label
                    : 'Idle'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {simulationStepIndex >= 0 && simulationSteps[simulationStepIndex]
                    ? simulationSteps[simulationStepIndex].description
                    : 'Select or run a query to begin.'}
                </div>
              </div>

              {lastResult && (
                <div className="neo-surface p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Query Execution Summary
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/10">
                      <span className="text-muted-foreground">Rows Returned:</span>
                      <span className="font-mono font-semibold">{lastResult.rowCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/10">
                      <span className="text-muted-foreground">Execution Latency:</span>
                      <span className="font-mono font-semibold">{lastResult.executionTime.toFixed(2)} ms</span>
                    </div>
                    {lastResult.sourceType && (
                      <div className="flex justify-between py-1 border-b border-border/10">
                        <span className="text-muted-foreground">Source Type:</span>
                        <span className="font-mono font-semibold">{lastResult.sourceType}</span>
                      </div>
                    )}
                    {lastResult.mvStatus && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">MV Status:</span>
                        <span className={`font-mono font-bold ${lastResult.mvStatus === 'FRESH' ? 'text-green-400' : 'text-orange-400'}`}>
                          {lastResult.mvStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PresetButton({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-3 text-left rounded-xl border border-border/20 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs font-semibold group-hover:text-primary transition-colors">{title}</span>
      </div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </button>
  );
}
