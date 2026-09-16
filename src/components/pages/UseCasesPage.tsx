import { Badge } from '../Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { SCENARIOS } from '../../labs/scenarios';

export function UseCasesPage() {
  const { db, runQuery, setUI } = useStore(useShallow(state => ({
    db: state.db,
    runQuery: state.runQuery,
    setUI: state.setUI,
  })));

  const handleLoadScenario = async (scenario: typeof SCENARIOS[0]) => {
    if (!db) return;
    // Execute schema, seed, view, and MV creation
    try {
      await runQuery(scenario.schemaSQL);
      await runQuery(scenario.seedSQL);
      await runQuery(scenario.createViewSQL);
      await runQuery(scenario.createMVSQL);
      setUI({ activePage: 'sql-lab' });
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('set-sql', { detail: scenario.dmlSQL }));
      }, 100);
    } catch (e) {
      console.error('Failed to load scenario:', e);
    }
  };

  const viewUseCases = [
    {
      title: 'Security Abstraction',
      icon: '🔒',
      description: 'Restrict access to specific columns or rows. A View can hide sensitive data (like salary or SSN) while exposing non-sensitive fields.',
      example: 'CREATE VIEW public_employees AS\nSELECT name, department FROM employees;\n-- Hides salary column',
    },
    {
      title: 'Query Simplification',
      icon: '✨',
      description: 'Encapsulate complex JOINs into a simple View name. Users can SELECT from the View without knowing the underlying table structure.',
      example: 'CREATE VIEW full_artwork AS\nSELECT a.title, ar.name AS artist, a.price\nFROM ARTWORK a JOIN ARTIST ar ON a.artist_id = ar.artist_id;',
    },
    {
      title: 'Reporting Layer',
      icon: '📊',
      description: 'Create standardized reporting views that present data consistently. Reports always reference Views instead of raw tables.',
      example: 'CREATE VIEW monthly_report AS\nSELECT strftime(\'%Y-%m\', sale_date) AS month,\nSUM(amount) AS revenue\nFROM sales GROUP BY 1;',
    },
    {
      title: 'API Response Formatting',
      icon: '🔌',
      description: 'Format database output to match API response shape. The View acts as a mapping layer between raw schema and API contract.',
      example: 'CREATE VIEW api_products AS\nSELECT id, name AS productName,\nprice AS unitPrice, stock AS quantity\nFROM products;',
    },
  ];

  const mvUseCases = [
    {
      title: 'Data Warehouse Summaries',
      icon: '🏭',
      description: 'Precompute expensive aggregations overnight. Analysts query the MV during the day for instant results.',
      example: 'CREATE MATERIALIZED VIEW sales_summary_mv AS\nSELECT region, product, SUM(revenue)\nFROM fact_sales\nGROUP BY region, product;',
    },
    {
      title: 'Dashboard Analytics',
      icon: '📈',
      description: 'Power real-time dashboards with precomputed metrics. The MV is refreshed periodically, and reads are always fast.',
      example: 'CREATE MATERIALIZED VIEW dashboard_metrics_mv AS\nSELECT COUNT(*) AS total_users,\nSUM(CASE WHEN active THEN 1 ELSE 0 END) AS active_users\nFROM users;',
    },
    {
      title: 'Expensive Aggregations',
      icon: '💎',
      description: 'Queries involving multiple JOINs and GROUP BYs can be materialized. One slow computation, many fast reads.',
      example: 'CREATE MATERIALIZED VIEW category_stats_mv AS\nSELECT c.name, COUNT(p.id), AVG(p.price)\nFROM categories c JOIN products p\nON c.id = p.category_id\nGROUP BY c.name;',
    },
    {
      title: 'CQRS Read Models',
      icon: '⚙️',
      description: 'In CQRS architecture, MVs serve as denormalized read models optimized for specific query patterns.',
      example: 'CREATE MATERIALIZED VIEW user_profile_mv AS\nSELECT u.*, COUNT(o.id) AS order_count,\nSUM(o.total) AS lifetime_value\nFROM users u LEFT JOIN orders o\nON u.id = o.user_id GROUP BY u.id;',
    },
  ];

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
      <div className="neo-surface flex-1 min-h-0 overflow-y-auto p-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Use Cases & Scenarios</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore real-world applications of Views and Materialized Views, and load interactive scenarios to experiment with.
          </p>
        </div>

        {/* View Use Cases */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="live" className="text-sm px-3 py-1">VIEW</Badge>
            <h2 className="text-xl font-bold">View Use Cases</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {viewUseCases.map(uc => (
              <Card key={uc.title} className="hover:border-purple-500/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{uc.icon}</span>
                    <CardTitle className="text-base">{uc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">{uc.description}</p>
                  <pre className="text-xs font-mono text-primary bg-muted/50 p-3 rounded-lg overflow-auto">{uc.example}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* MV Use Cases */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="fresh" className="text-sm px-3 py-1">MATERIALIZED VIEW</Badge>
            <h2 className="text-xl font-bold">Materialized View Use Cases</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mvUseCases.map(uc => (
              <Card key={uc.title} className="hover:border-green-500/30 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{uc.icon}</span>
                    <CardTitle className="text-base">{uc.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">{uc.description}</p>
                  <pre className="text-xs font-mono text-primary bg-muted/50 p-3 rounded-lg overflow-auto">{uc.example}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Interactive Scenarios */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="running" className="text-sm px-3 py-1">INTERACTIVE</Badge>
            <h2 className="text-xl font-bold">Load a Scenario</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Load Scenario" to set up a complete schema with data, views, and materialized views. 
            Then modify the data to see the difference between View and MV behavior.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCENARIOS.map(scenario => (
              <Card key={scenario.id} className="hover:border-primary/30 transition-colors group">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl mb-2 block">{scenario.icon}</span>
                      <h3 className="font-bold">{scenario.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/10">
                    <p className="text-xs text-muted-foreground italic">{scenario.expectedStale}</p>
                  </div>
                  <button
                    onClick={() => handleLoadScenario(scenario)}
                    className="w-full neo-button-primary py-2.5 rounded-lg text-sm font-medium"
                  >
                    Load Scenario →
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
