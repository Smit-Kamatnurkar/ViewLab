

interface BookItem {
  title: string;
  authors: string;
  publisher: string;
  edition?: string;
}

interface WebDocItem {
  title: string;
  url: string;
  topics: string[];
}

const BOOKS: BookItem[] = [
  {
    title: 'Database System Concepts',
    authors: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    publisher: 'McGraw-Hill',
    edition: '7th Edition',
  },
  {
    title: 'Fundamentals of Database Systems',
    authors: 'Ramez Elmasri, Shamkant B. Navathe',
    publisher: 'Pearson',
    edition: '7th Edition',
  },
  {
    title: 'Database Management Systems',
    authors: 'Raghu Ramakrishnan, Johannes Gehrke',
    publisher: 'McGraw-Hill',
    edition: '3rd Edition',
  },
];

const WEBSITES: WebDocItem[] = [
  {
    title: 'PostgreSQL Documentation',
    url: 'https://www.postgresql.org/docs/current/rules-views.html',
    topics: ['CREATE VIEW', 'Materialized Views', 'REFRESH MATERIALIZED VIEW', 'Database dependencies'],
  },
  {
    title: 'SQLite Documentation',
    url: 'https://www.sqlite.org/lang_createview.html',
    topics: ['SQL syntax', 'CREATE VIEW', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  },
  {
    title: 'React Documentation',
    url: 'https://react.dev/',
    topics: ['Components', 'State management', 'Hooks'],
  },
  {
    title: 'Vite Documentation',
    url: 'https://vitejs.dev/',
    topics: ['React development environment', 'Build and development workflow'],
  },
];

const EDUCATIONAL_TOPICS = [
  'Database Views & Virtual Relation Processing',
  'Materialized Views & Storage vs Compute Tradeoffs',
  'Query Execution Plans & Index Scanning',
  'Dependency Graph (DAG) Tracking for Cascading Invalidation',
  'DBMS Transactional Behavior & Snapshot Refresh',
];

export function ReferencesPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background text-foreground p-6 md:p-10 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
            <span>Academic Documentation</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            3. References
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Students must clearly mention the resources used while developing the learning content and application.
          </p>
        </header>

        {/* 1. Books Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg shadow-sm">
              📚
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Standard DBMS Textbooks</h2>
              <p className="text-xs text-muted-foreground">Foundational database architecture and query optimization texts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {BOOKS.map((book, idx) => (
              <div 
                key={idx}
                className="group relative bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {idx + 1}
                  </div>
                  <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {book.authors}
                  </p>
                </div>
                <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>{book.publisher}</span>
                  {book.edition && <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-sans">{book.edition}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Technical Documentation */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg shadow-sm">
              🌐
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Websites & Technical Documentation</h2>
              <p className="text-xs text-muted-foreground">Official specifications and framework documentation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WEBSITES.map((site, idx) => (
              <div 
                key={idx}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-all duration-200 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                    {site.title}
                  </h3>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <span>Visit Site</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Topics Referenced:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {site.topics.map((t, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground font-mono border border-border/50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Educational Resources */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-lg shadow-sm">
              🎓
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Educational DBMS Modules</h2>
              <p className="text-xs text-muted-foreground">Core subjects modeled into the interactive simulator</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EDUCATIONAL_TOPICS.map((topic, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Research & Academic Material */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-lg shadow-sm">
              🔬
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Research & Academic Material</h2>
              <p className="text-xs text-muted-foreground">Academic publications and technical literature review</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              No external research papers were directly incorporated into the implementation. Standard DBMS textbooks and official technical documentation were used for conceptual and technical reference.
            </p>
          </div>
        </section>

        {/* 5. Educational Videos & Tutorials */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-lg shadow-sm">
              🎬
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Videos & Learning Resources</h2>
              <p className="text-xs text-muted-foreground">Visual walkthroughs and interactive tutorial media</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Educational videos and tutorials were consulted for understanding SQL, DBMS Views, Materialized Views and React-based visualization techniques.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
