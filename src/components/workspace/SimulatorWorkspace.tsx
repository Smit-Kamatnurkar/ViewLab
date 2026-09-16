import React, { useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { WorkspaceContextBar } from './WorkspaceContextBar';
import { parseSQL } from '../../sql/parser';
import { createSimulationStepsForParsedSQL } from '../../sql/simulator';

const SPEED_OPTIONS = [
  { label: '0.5x', value: 2000 },
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '3x', value: 300 },
];

export const SimulatorWorkspace: React.FC = () => {
  const {
    currentSQL,
    simulationSteps,
    simulationStepIndex,
    isSimulationPlaying,
    simulationSpeedIndex,
    setSimulationState,
    runQuery,
    setUI,
  } = useStore(useShallow(state => ({
    currentSQL: state.currentSQL,
    simulationSteps: state.simulationSteps,
    simulationStepIndex: state.simulationStepIndex,
    isSimulationPlaying: state.isSimulationPlaying,
    simulationSpeedIndex: state.simulationSpeedIndex,
    setSimulationState: state.setSimulationState,
    runQuery: state.runQuery,
    setUI: state.setUI,
  })));

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
  const currentStepObj = simulationSteps[simulationStepIndex];

  // Determine query classification
  const isViewCreate = currentSQL.toUpperCase().includes('CREATE VIEW') && !currentSQL.toUpperCase().includes('MATERIALIZED');
  const isMvCreate = currentSQL.toUpperCase().includes('CREATE MATERIALIZED VIEW') || currentSQL.toUpperCase().includes('CREATE MV');
  const isDmlUpdate = currentSQL.toUpperCase().startsWith('UPDATE') || currentSQL.toUpperCase().startsWith('INSERT') || currentSQL.toUpperCase().startsWith('DELETE');
  const isRefresh = currentSQL.toUpperCase().includes('REFRESH');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <WorkspaceContextBar />

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column: Visual Canvas & Step Progress */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-border/40 overflow-hidden">
          
          {/* Top Control Bar */}
          <div className="p-3 bg-card border-b border-border/50 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span className="text-primary font-mono font-black">∿</span> Visual Execution Simulator
              </span>
              {currentSQL && (
                <code className="text-xs font-mono text-muted-foreground truncate max-w-xs sm:max-w-md bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                  {currentSQL}
                </code>
              )}
            </div>

            <div className="flex items-center gap-2">
              {totalSteps > 0 && (
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
                  {SPEED_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.label}
                      onClick={() => setSimulationState({ simulationSpeedIndex: i })}
                      className={`px-2 py-0.5 rounded font-semibold transition-all ${
                        i === simulationSpeedIndex
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setUI({ activePage: 'sql-lab' })}
                className="px-2.5 py-1.5 bg-muted/60 hover:bg-muted text-foreground border border-border/50 rounded-lg text-xs font-semibold transition-all"
              >
                ⌘ SQL Lab
              </button>
            </div>
          </div>

          {/* Player Timeline Bar */}
          {totalSteps > 0 && (
            <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={simulationStepIndex <= 0}
                  className="px-2.5 py-1 rounded bg-card border border-border/50 text-xs font-bold hover:bg-muted disabled:opacity-40"
                >
                  ⏮ Prev
                </button>

                {isSimulationPlaying ? (
                  <button
                    onClick={handlePause}
                    className="px-3 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30"
                  >
                    ⏸ Pause
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-xs"
                  >
                    ▶ Play
                  </button>
                )}

                <button
                  onClick={handleNext}
                  disabled={simulationStepIndex >= totalSteps - 1}
                  className="px-2.5 py-1 rounded bg-card border border-border/50 text-xs font-bold hover:bg-muted disabled:opacity-40"
                >
                  Next ⏭
                </button>

                <button
                  onClick={handleRestart}
                  className="px-2.5 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-medium"
                >
                  ↻ Restart
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground font-medium">
                  Step <strong className="text-foreground">{simulationStepIndex + 1}</strong> / {totalSteps}
                </span>
                <div className="w-24 bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Central Interactive Animation Canvas */}
          <div className="flex-1 p-6 overflow-y-auto bg-background/50 flex flex-col justify-center">
            {totalSteps === 0 ? (
              <div className="max-w-xl mx-auto text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto text-2xl font-black shadow-sm">
                  ∿
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold tracking-tight">Interactive Execution Simulator</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select a preset simulation template below or run any SQL query in SQL Lab to watch the exact step-by-step data packets flow through the DBMS engine.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <PresetCard
                    title="1. Create Virtual View"
                    desc="Stores SELECT query definition in schema (0 rows precomputed)"
                    tag="VIEW"
                    onClick={() => handleLaunchQuery('CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;')}
                  />
                  <PresetCard
                    title="2. Create Materialized View"
                    desc="Executes query & precomputes physical rows to disk"
                    tag="MV"
                    onClick={() => handleLaunchQuery('CREATE MATERIALIZED VIEW expensive_artworks_mv AS SELECT * FROM ARTWORK WHERE price > 100000;')}
                  />
                  <PresetCard
                    title="3. Update Base Table (DML)"
                    desc="Mutates ARTWORK row and marks dependent MVs STALE"
                    tag="STALE"
                    onClick={() => handleLaunchQuery('UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;')}
                  />
                  <PresetCard
                    title="4. Refresh Materialized View"
                    desc="Re-evaluates query and updates stored physical snapshot"
                    tag="REFRESH"
                    onClick={() => handleLaunchQuery('REFRESH MATERIALIZED VIEW expensive_artworks_mv;')}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8 max-w-3xl mx-auto w-full">
                
                {/* Visual Pipeline Nodes Diagram with Animated Edge */}
                <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-6 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      DBMS Execution Canvas
                    </span>
                    {currentStepObj && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold font-mono">
                        Stage: {currentStepObj.label}
                      </span>
                    )}
                  </div>

                  {/* Flow Diagram */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
                    <FlowStepNode
                      num={1}
                      title="SQL Input"
                      desc="Parse & Validate"
                      active={simulationStepIndex === 0}
                      completed={simulationStepIndex > 0}
                    />
                    <FlowStepNode
                      num={2}
                      title="Dependency Check"
                      desc="Resolve Base Tables"
                      active={simulationStepIndex === 1}
                      completed={simulationStepIndex > 1}
                    />
                    <FlowStepNode
                      num={3}
                      title="Execution Pipeline"
                      desc={isViewCreate ? 'Store Query Definition' : isMvCreate ? 'Materialize Result' : 'Query Engine'}
                      active={simulationStepIndex === 2}
                      completed={simulationStepIndex > 2}
                    />
                    <FlowStepNode
                      num={4}
                      title="State Output"
                      desc={isViewCreate ? 'LIVE VIEW Registered' : isMvCreate ? 'FRESH MV Created' : isDmlUpdate ? 'MV Marked STALE ⚠' : 'Result Returned'}
                      active={simulationStepIndex >= 3}
                      completed={simulationStepIndex >= totalSteps - 1}
                    />
                  </div>

                  {/* Educational Storage Model Visualization */}
                  <div className="pt-4 border-t border-border/40">
                    {isViewCreate ? (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                            👁 VIRTUAL VIEW STORAGE MODEL
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-500 font-mono font-bold">
                            DYNAMIC QUERY
                          </span>
                        </div>
                        <div className="p-3 bg-card border border-purple-500/30 rounded-lg text-xs font-mono space-y-1">
                          <div className="text-muted-foreground font-semibold">Stored in Catalog:</div>
                          <div className="text-foreground font-bold">{currentSQL}</div>
                          <div className="text-emerald-500 text-[11px] pt-1">
                            ✓ Physical Result Rows: <strong>0 (Recomputed live on every query)</strong>
                          </div>
                        </div>
                      </div>
                    ) : isMvCreate ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            💾 MATERIALIZED VIEW STORAGE MODEL
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-mono font-bold">
                            PRECOMPUTED TABLE
                          </span>
                        </div>
                        <div className="p-3 bg-card border border-emerald-500/30 rounded-lg text-xs font-mono space-y-1">
                          <div className="text-muted-foreground font-semibold">Stored on Disk:</div>
                          <div className="text-emerald-500 font-bold">
                            Physical SQLite Table created with stored snapshot rows ✓
                          </div>
                        </div>
                      </div>
                    ) : isDmlUpdate ? (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            ⚠️ DML STALENESS PROPAGATION
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-mono font-bold">
                            DEPENDENCY ENGINE
                          </span>
                        </div>
                        <div className="p-3 bg-card border border-amber-500/30 rounded-lg text-xs font-mono text-amber-500">
                          ARTWORK (Mutated) → Dependency Tracker → Materialized View marked STALE 🟠
                        </div>
                      </div>
                    ) : isRefresh ? (
                      <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                            ↻ REFRESH MATERIALIZED VIEW
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-500 font-mono font-bold">
                            RE-EVALUATION
                          </span>
                        </div>
                        <div className="p-3 bg-card border border-cyan-500/30 rounded-lg text-xs font-mono text-emerald-500">
                          STALE 🟠 → RE-EXECUTING QUERY → REPLACING STORED SNAPSHOT → FRESH 🟢
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Step Details Panel */}
        <div className="w-full lg:w-80 p-4 bg-card/50 border-t lg:border-t-0 border-border/40 overflow-y-auto space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span>📋</span> Pipeline Step Timeline
          </h3>

          <div className="space-y-2">
            {simulationSteps.map((step, idx) => {
              const isCurrent = idx === simulationStepIndex;
              const isDone = idx < simulationStepIndex;

              return (
                <div
                  key={step.id || idx}
                  onClick={() => setSimulationState({ simulationStepIndex: idx, isSimulationPlaying: false })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-primary/10 border-primary shadow-xs'
                      : isDone
                      ? 'bg-card border-border/40 opacity-80'
                      : 'bg-muted/20 border-border/20 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone ? 'bg-emerald-500/20 text-emerald-500' : isCurrent ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </span>
                      {step.label}
                    </span>
                    {step.highlight && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold">
                        {step.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function PresetCard({ title, desc, tag, onClick }: { title: string; desc: string; tag: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-4 text-left bg-card border border-border/60 hover:border-primary/50 hover:bg-muted/30 rounded-xl transition-all space-y-1.5 group shadow-xs"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{title}</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">{tag}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </button>
  );
}

function FlowStepNode({ num, title, desc, active, completed }: { num: number; title: string; desc: string; active: boolean; completed: boolean }) {
  return (
    <div className={`p-3 rounded-xl border text-center transition-all ${
      active
        ? 'bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md scale-105'
        : completed
        ? 'bg-card border-emerald-500/30 text-foreground'
        : 'bg-muted/20 border-border/30 opacity-60'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1.5 ${
        completed ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {completed ? '✓' : num}
      </div>
      <div className="text-xs font-bold text-foreground truncate">{title}</div>
      <div className="text-[10px] text-muted-foreground truncate mt-0.5">{desc}</div>
    </div>
  );
}
