import { useState } from 'react';
import { Badge } from '../Badge';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';

interface Section {
  id: string;
  title: string;
  icon: string;
  explanation: string;
  technical: string;
  example?: string;
  diagram: JSX.Element;
  task?: { instruction: string; sql: string };
}

const SECTIONS: Section[] = [
  {
    id: 'what-is-view',
    title: 'What is a View?',
    icon: '👁️',
    explanation: 'A View is like a saved query. It doesn\'t store any data itself — it\'s just a named SELECT statement. Every time you query the View, it runs the original query against the current data.',
    technical: 'A VIEW is a virtual table defined by a SQL SELECT statement. It does not persist data physically; it re-evaluates its defining query on each access. In SQLite, CREATE VIEW registers the definition in sqlite_master.',
    example: 'CREATE VIEW expensive_art AS\nSELECT * FROM ARTWORK\nWHERE price > 100000000;',
    diagram: <ViewDiagram />,
    task: { instruction: 'Try creating a view that shows all artworks in the "Portrait" category', sql: "CREATE VIEW portrait_art AS SELECT * FROM ARTWORK WHERE category = 'Portrait';" },
  },
  {
    id: 'how-view-works',
    title: 'How a View Works',
    icon: '⚡',
    explanation: 'When you SELECT from a View, the database replaces the view name with its definition and executes the expanded query. This means the View always returns current, up-to-date data.',
    technical: 'View resolution occurs at query planning time. The optimizer inlines the view definition into the outer query, then optimizes the combined query plan. This is called view merging or view unfolding.',
    diagram: <ViewExecutionDiagram />,
  },
  {
    id: 'what-is-mv',
    title: 'What is a Materialized View?',
    icon: '💾',
    explanation: 'A Materialized View is like a View that saves its result. When created, it runs the query and stores the result in a physical table. Future reads are instant because they read from the stored copy.',
    technical: 'A Materialized View (MV) persists the query result as a physical table. In ViewLab, this is implemented by executing CREATE TABLE AS SELECT. The stored result does not automatically update when base tables change.',
    example: 'CREATE MATERIALIZED VIEW expensive_art_mv AS\nSELECT * FROM ARTWORK\nWHERE price > 100000000;',
    diagram: <MVDiagram />,
    task: { instruction: 'Create a materialized view for artwork category counts', sql: 'CREATE MATERIALIZED VIEW category_counts_mv AS SELECT category, COUNT(*) AS cnt FROM ARTWORK GROUP BY category;' },
  },
  {
    id: 'how-mv-works',
    title: 'How a Materialized View Works',
    icon: '🔧',
    explanation: 'When you query a Materialized View, it reads directly from the stored table — no computation needed. This is much faster for complex aggregations. But the trade-off is that the data might be outdated.',
    technical: 'Reads from an MV are simple table scans against the backing table. Time complexity is O(n) where n is the stored result size, regardless of the complexity of the original defining query.',
    diagram: <MVExecutionDiagram />,
  },
  {
    id: 'view-vs-mv',
    title: 'View vs Materialized View',
    icon: '⚔️',
    explanation: 'The key difference: a View always shows current data but re-executes the query each time. A Materialized View stores the result for fast access but can become outdated.',
    technical: 'Views trade computation for freshness. MVs trade freshness for performance. The choice depends on the access pattern: frequent reads with rare updates favor MVs; frequently changing data favors Views.',
    diagram: <ComparisonDiagram />,
  },
  {
    id: 'stale-data',
    title: 'Stale Data',
    icon: '⚠️',
    explanation: 'When the base table changes after a Materialized View was created, the MV still contains the old result. This is called "stale" data. The MV doesn\'t know the base data changed.',
    technical: 'Staleness occurs because MVs are not incrementally maintained in most systems (including ViewLab). The stored result is a snapshot from the last refresh. Any DML on base tables makes dependent MVs potentially stale.',
    diagram: <StaleDiagram />,
    task: { instruction: 'Try inserting a new artwork and then querying both a view and materialized view to see the difference', sql: "INSERT INTO ARTWORK VALUES (31, 'Test Art', 1, 'Modern', 200000000);" },
  },
  {
    id: 'refresh',
    title: 'Refresh',
    icon: '🔄',
    explanation: 'To update a stale Materialized View, you REFRESH it. This re-executes the original query and replaces the stored result with fresh data.',
    technical: 'REFRESH drops the backing table and recreates it via CREATE TABLE AS SELECT. Time complexity is O(query), identical to initial creation. ViewLab tracks refresh timestamps for each MV.',
    example: 'REFRESH MATERIALIZED VIEW expensive_art_mv;',
    diagram: <RefreshDiagram />,
  },
  {
    id: 'dependencies',
    title: 'Dependencies',
    icon: '🔗',
    explanation: 'Views and MVs depend on base tables (and potentially other views). When a base table changes, all dependent MVs may become stale. This chain of relationships is called the dependency graph.',
    technical: 'ViewLab extracts dependencies by parsing FROM/JOIN clauses in the view definition. Dependencies are tracked transitively — if View A depends on View B which depends on Table C, then A transitively depends on C.',
    diagram: <DependencyDiagram />,
  },
  {
    id: 'advantages',
    title: 'Advantages',
    icon: '✅',
    explanation: 'Views simplify complex queries and provide security abstraction. MVs dramatically speed up expensive aggregations and are ideal for dashboards and reports.',
    technical: 'Views: query reuse, security (column/row restriction), logical data independence. MVs: precomputed results, reduced query latency, offload computation from peak hours.',
    diagram: <AdvantagesDiagram />,
  },
  {
    id: 'limitations',
    title: 'Limitations',
    icon: '⛔',
    explanation: 'Views can be slow for complex queries since they re-execute every time. MVs use extra storage and can serve stale data if not refreshed regularly.',
    technical: 'View limitations: no index on view, performance overhead for complex definitions, cannot INSERT into complex views. MV limitations: storage cost, staleness, refresh overhead, no real-time updates.',
    diagram: <LimitationsDiagram />,
  },
  {
    id: 'use-cases',
    title: 'Real-World Use Cases',
    icon: '🌍',
    explanation: 'Views are used for security layers, API abstractions, and simplifying joins. MVs power data warehouses, dashboards, and any scenario where expensive queries are read frequently.',
    technical: 'Common patterns: View for row-level security in multi-tenant apps. MV for aggregation tables in OLAP workloads. MV for denormalized read models in CQRS architecture.',
    diagram: <UseCasesDiagram />,
  },
  {
    id: 'when-to-use',
    title: 'When to Use Each',
    icon: '🤔',
    explanation: 'Use a View when data freshness is critical and queries are simple. Use a Materialized View when query performance matters more than real-time accuracy.',
    technical: 'Decision factors: read frequency, write frequency, query complexity, latency requirements, storage budget, staleness tolerance. High read/write ratio with tolerance for staleness → MV. Low latency requirement for current data → View.',
    diagram: <DecisionDiagram />,
  },
];

export function LearnPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const { setUI } = useStore(useShallow(s => ({ setUI: s.setUI })));
  const section = SECTIONS.find(s => s.id === activeSection)!;

  const handleTrySQL = (sql: string) => {
    // Navigate to SQL lab and set query
    setUI({ activePage: 'sql-lab' });
    // Dispatch event to set SQL in editor
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('set-sql', { detail: sql }));
    }, 100);
  };

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
      <div className="neo-surface flex-1 min-h-0 overflow-hidden flex flex-row">
        {/* Section Nav */}
        <div className="w-72 border-r border-border/20 overflow-y-auto p-4 space-y-1 flex-shrink-0">
          <h2 className="text-lg font-bold mb-4 px-2">📚 Learn</h2>
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                activeSection === s.id
                  ? 'neo-surface-inset text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="text-base flex-shrink-0">{s.icon}</span>
              <span className="truncate">{i + 1}. {s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <header>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{section.icon}</span>
              <h1 className="text-2xl font-bold">{section.title}</h1>
            </div>
            <div className="flex gap-2 mt-2">
              {SECTIONS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    SECTIONS.findIndex(x => x.id === activeSection) >= i ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </header>

          {/* Simple Explanation */}
          <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Simple Explanation</h3>
            <p className="text-foreground leading-relaxed">{section.explanation}</p>
          </div>

          {/* Technical Definition */}
          <div className="p-6 rounded-xl bg-muted/50 border border-border/20">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Technical Definition</h3>
            <p className="text-foreground/80 leading-relaxed font-mono text-sm">{section.technical}</p>
          </div>

          {/* Visual Diagram */}
          <div className="p-6 rounded-xl border border-border/20">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Visual Diagram</h3>
            {section.diagram}
          </div>

          {/* Example */}
          {section.example && (
            <div className="p-6 rounded-xl bg-card border border-border/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example SQL</h3>
              <pre className="font-mono text-sm text-primary bg-muted/50 p-4 rounded-lg overflow-auto">{section.example}</pre>
              <button
                onClick={() => handleTrySQL(section.example!)}
                className="mt-3 text-xs text-primary hover:text-primary/80 font-medium"
              >
                → Try this in SQL Lab
              </button>
            </div>
          )}

          {/* Interactive Task */}
          {section.task && (
            <div className="p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">🧪 Try It Yourself</h3>
              <p className="text-foreground mb-3">{section.task.instruction}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTrySQL(section.task!.sql)}
                  className="neo-button-primary px-4 py-2 rounded-lg text-sm"
                >
                  Open in SQL Lab
                </button>
                <span className="text-xs text-muted-foreground">Hint: {section.task.sql.split('\n')[0]}...</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border/20">
            <button
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection);
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
              }}
              disabled={SECTIONS.findIndex(s => s.id === activeSection) === 0}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={() => {
                const idx = SECTIONS.findIndex(s => s.id === activeSection);
                if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
              }}
              disabled={SECTIONS.findIndex(s => s.id === activeSection) === SECTIONS.length - 1}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Diagrams ────────────────────────────────────────────

function DiagramBox({ x, y, w, h, label, sub, color }: { x: number; y: number; w: number; h: number; label: string; sub?: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={`hsl(${color} / 0.1)`} stroke={`hsl(${color} / 0.5)`} strokeWidth="1.5"/>
      <text x={x + w/2} y={y + h/2 - (sub ? 4 : 0)} textAnchor="middle" fill={`hsl(${color})`} fontSize="12" fontWeight="600">{label}</text>
      {sub && <text x={x + w/2} y={y + h/2 + 12} textAnchor="middle" fill={`hsl(${color} / 0.7)`} fontSize="10">{sub}</text>}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" markerEnd="url(#arrow)"/>
    </g>
  );
}

function SvgDefs() {
  return (
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M 0 0 L 8 3 L 0 6 Z" fill="hsl(var(--muted-foreground))" />
      </marker>
    </defs>
  );
}

function ViewDiagram() {
  return (
    <svg viewBox="0 0 500 180" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={10} y={60} w={120} h={50} label="Base Table" sub="ARTWORK" color="var(--color-table)" />
      <Arrow x1={130} y1={85} x2={180} y2={85} />
      <DiagramBox x={180} y={60} w={140} h={50} label="View Definition" sub="Stored Query" color="var(--color-view)" />
      <Arrow x1={320} y1={85} x2={370} y2={85} />
      <DiagramBox x={370} y={60} w={120} h={50} label="Live Result" sub="Current Data" color="var(--color-live)" />
      <text x={250} y={145} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">Query re-executes every time</text>
    </svg>
  );
}

function ViewExecutionDiagram() {
  return (
    <svg viewBox="0 0 500 220" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={180} y={10} w={140} h={40} label="SELECT * FROM view" color="var(--foreground)" />
      <Arrow x1={250} y1={50} x2={250} y2={70} />
      <DiagramBox x={160} y={70} w={180} h={40} label="Replace with definition" color="var(--color-view)" />
      <Arrow x1={250} y1={110} x2={250} y2={130} />
      <DiagramBox x={140} y={130} w={220} h={40} label="Execute against live data" color="var(--color-table)" />
      <Arrow x1={250} y1={170} x2={250} y2={190} />
      <text x={250} y={208} textAnchor="middle" fill="hsl(var(--color-fresh))" fontSize="12" fontWeight="600">Current Result ✓</text>
    </svg>
  );
}

function MVDiagram() {
  return (
    <svg viewBox="0 0 500 180" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={10} y={60} w={120} h={50} label="Base Table" sub="ARTWORK" color="var(--color-table)" />
      <Arrow x1={130} y1={85} x2={170} y2={85} />
      <DiagramBox x={170} y={60} w={130} h={50} label="Execute Query" sub="At Creation" color="var(--primary)" />
      <Arrow x1={300} y1={85} x2={340} y2={85} />
      <DiagramBox x={340} y={60} w={150} h={50} label="Stored Result" sub="Physical Table" color="var(--color-mv)" />
      <text x={415} y={140} textAnchor="middle" fill="hsl(var(--color-mv))" fontSize="11">💾 Data persisted to disk</text>
    </svg>
  );
}

function MVExecutionDiagram() {
  return (
    <svg viewBox="0 0 500 180" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={140} y={10} w={220} h={40} label="SELECT * FROM mv" color="var(--foreground)" />
      <Arrow x1={250} y1={50} x2={250} y2={70} />
      <DiagramBox x={140} y={70} w={220} h={40} label="Read stored table (fast!)" color="var(--color-mv)" />
      <Arrow x1={250} y1={110} x2={250} y2={130} />
      <text x={250} y={148} textAnchor="middle" fill="hsl(var(--color-mv))" fontSize="12" fontWeight="600">Pre-computed Result 🚀</text>
      <text x={250} y={168} textAnchor="middle" fill="hsl(var(--color-stale))" fontSize="10">⚠ May be outdated</text>
    </svg>
  );
}

function ComparisonDiagram() {
  return (
    <svg viewBox="0 0 520 200" className="w-full max-w-xl mx-auto">
      <SvgDefs />
      <DiagramBox x={190} y={10} w={140} h={40} label="Base Table" color="var(--color-table)" />
      <Arrow x1={220} y1={50} x2={120} y2={80} />
      <Arrow x1={300} y1={50} x2={400} y2={80} />
      <DiagramBox x={30} y={80} w={180} h={50} label="View (LIVE)" sub="Re-executes query" color="var(--color-view)" />
      <DiagramBox x={310} y={80} w={180} h={50} label="MV (STORED)" sub="Reads cached result" color="var(--color-mv)" />
      <Arrow x1={120} y1={130} x2={120} y2={155} />
      <Arrow x1={400} y1={130} x2={400} y2={155} />
      <text x={120} y={172} textAnchor="middle" fill="hsl(var(--color-live))" fontSize="11" fontWeight="600">Always Fresh ✓</text>
      <text x={400} y={172} textAnchor="middle" fill="hsl(var(--color-stale))" fontSize="11" fontWeight="600">May Be Stale ⚠</text>
    </svg>
  );
}

function StaleDiagram() {
  return (
    <svg viewBox="0 0 520 240" className="w-full max-w-xl mx-auto">
      <SvgDefs />
      <DiagramBox x={180} y={5} w={160} h={40} label="INSERT into Base" sub="Table modified" color="var(--color-table)" />
      <Arrow x1={210} y1={45} x2={120} y2={70} />
      <Arrow x1={310} y1={45} x2={400} y2={70} />
      <DiagramBox x={30} y={70} w={180} h={50} label="View" sub="Sees new data ✓" color="var(--color-view)" />
      <DiagramBox x={310} y={70} w={180} h={50} label="MV" sub="Still old data ✗" color="var(--color-stale)" />
      <Arrow x1={400} y1={120} x2={400} y2={150} />
      <rect x={330} y={150} rx="8" width="140" height="35" fill="hsl(var(--color-stale) / 0.15)" stroke="hsl(var(--color-stale) / 0.5)" strokeWidth="2" strokeDasharray="4"/>
      <text x={400} y={172} textAnchor="middle" fill="hsl(var(--color-stale))" fontSize="13" fontWeight="700">⚠ STALE</text>
      <text x={260} y={220} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">MV stored result does not match current base table data</text>
    </svg>
  );
}

function RefreshDiagram() {
  return (
    <svg viewBox="0 0 500 220" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={170} y={5} w={160} h={35} label="⚠ STALE MV" color="var(--color-stale)" />
      <Arrow x1={250} y1={40} x2={250} y2={60} />
      <DiagramBox x={140} y={60} w={220} h={35} label="REFRESH MATERIALIZED VIEW" color="var(--primary)" />
      <Arrow x1={250} y1={95} x2={250} y2={110} />
      <DiagramBox x={155} y={110} w={190} h={35} label="Re-execute definition" color="var(--color-refreshing)" />
      <Arrow x1={250} y1={145} x2={250} y2={160} />
      <DiagramBox x={165} y={160} w={170} h={35} label="🟢 FRESH" color="var(--color-fresh)" />
      <text x={250} y={215} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Stored result now matches current data</text>
    </svg>
  );
}

function DependencyDiagram() {
  return (
    <svg viewBox="0 0 400 180" className="w-full max-w-md mx-auto">
      <SvgDefs />
      <DiagramBox x={140} y={10} w={120} h={40} label="employees" sub="BASE TABLE" color="var(--color-table)" />
      <Arrow x1={170} y1={50} x2={80} y2={80} />
      <Arrow x1={230} y1={50} x2={320} y2={80} />
      <DiagramBox x={10} y={80} w={140} h={40} label="dept_view" sub="VIEW (LIVE)" color="var(--color-view)" />
      <DiagramBox x={250} y={80} w={140} h={40} label="dept_mv" sub="MV (STORED)" color="var(--color-mv)" />
      <text x={200} y={155} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Changes to employees affect both dependents</text>
      <text x={200} y={170} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">but only MV becomes STALE</text>
    </svg>
  );
}

function AdvantagesDiagram() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-2">
        <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--color-view))' }}>View Advantages</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✓ Always fresh data</li>
          <li>✓ No storage overhead</li>
          <li>✓ Security abstraction</li>
          <li>✓ Simplifies complex queries</li>
          <li>✓ Logical data independence</li>
        </ul>
      </div>
      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 space-y-2">
        <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--color-mv))' }}>MV Advantages</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>🚀 Fast repeated reads</li>
          <li>✓ Precomputed aggregations</li>
          <li>✓ Reduced query latency</li>
          <li>✓ Offload computation</li>
          <li>✓ Great for dashboards</li>
        </ul>
      </div>
    </div>
  );
}

function LimitationsDiagram() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 space-y-2">
        <h4 className="font-semibold text-sm text-red-400">View Limitations</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✗ Re-executes every time</li>
          <li>✗ Slow for complex queries</li>
          <li>✗ Cannot index view results</li>
          <li>✗ No INSERT on complex views</li>
        </ul>
      </div>
      <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-2">
        <h4 className="font-semibold text-sm text-orange-400">MV Limitations</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✗ Can become stale</li>
          <li>✗ Extra storage cost</li>
          <li>✗ Refresh overhead</li>
          <li>✗ No real-time updates</li>
        </ul>
      </div>
    </div>
  );
}

function UseCasesDiagram() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-lg border border-border/20 space-y-2">
        <Badge variant="live">VIEW</Badge>
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
          <li>• Security abstraction layers</li>
          <li>• API response formatting</li>
          <li>• Simplifying complex JOINs</li>
          <li>• Column/row restriction</li>
        </ul>
      </div>
      <div className="p-4 rounded-lg border border-border/20 space-y-2">
        <Badge variant="fresh">MATERIALIZED VIEW</Badge>
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
          <li>• Data warehouse summaries</li>
          <li>• Dashboard analytics</li>
          <li>• Reporting systems</li>
          <li>• Precomputed aggregations</li>
        </ul>
      </div>
    </div>
  );
}

function DecisionDiagram() {
  return (
    <svg viewBox="0 0 500 200" className="w-full max-w-lg mx-auto">
      <SvgDefs />
      <DiagramBox x={175} y={5} w={150} h={35} label="Need derived data?" color="var(--foreground)" />
      <Arrow x1={210} y1={40} x2={120} y2={65} />
      <Arrow x1={290} y1={40} x2={380} y2={65} />
      <text x={150} y={55} fill="hsl(var(--muted-foreground))" fontSize="9">Freshness critical</text>
      <text x={340} y={55} fill="hsl(var(--muted-foreground))" fontSize="9">Performance critical</text>
      <DiagramBox x={30} y={65} w={180} h={45} label="Use VIEW" sub="Live, always current" color="var(--color-view)" />
      <DiagramBox x={290} y={65} w={180} h={45} label="Use MATERIALIZED VIEW" sub="Fast, precomputed" color="var(--color-mv)" />
      <text x={250} y={145} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">Consider: read/write ratio, query complexity, staleness tolerance</text>
    </svg>
  );
}
