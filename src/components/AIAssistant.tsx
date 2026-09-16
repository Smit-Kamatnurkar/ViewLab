import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';



const MOCK_RESPONSES: Record<string, string> = {
  'stale': `**Why is a Materialized View STALE?**

A Materialized View stores a *snapshot* of the query result at creation (or last refresh) time. When you INSERT, UPDATE, or DELETE rows in the base table, the MV's stored result becomes *outdated* — it doesn't know the data changed.

**To fix:** Run \`REFRESH MATERIALIZED VIEW <name>;\` to re-execute the defining query and store the fresh result.

The key difference: A normal **View** would show the updated data immediately because it re-runs the query each time.`,
  
  'view': `**What is a View?**

A View is a *virtual table* defined by a SQL query. It does NOT store data — it stores the query definition. Every time you SELECT from a View, the database:

1. Looks up the stored query definition
2. Replaces the view name with the query
3. Executes the expanded query against current data
4. Returns the live result

**Key property:** Views always return current, up-to-date data because they re-execute their definition on every access.`,

  'materialized': `**What is a Materialized View?**

A Materialized View (MV) executes its defining query once and stores the result as a real table. When you query it:

1. The database reads from the stored physical table
2. No computation is needed — it's a simple table scan
3. This is much faster than re-computing complex aggregations

**Trade-off:** The stored result can become *stale* when base tables change. You must manually REFRESH to sync.

**Use when:** You have expensive aggregations that are read frequently and you can tolerate some staleness.`,

  'refresh': `**How does REFRESH work?**

When you run \`REFRESH MATERIALIZED VIEW <name>\`:

1. The system finds the MV's original defining query
2. Drops the existing stored result table
3. Re-executes the defining query against the current database state
4. Creates a new table with the fresh results
5. Updates the MV status from STALE → FRESH

**Performance note:** Refresh time is proportional to the complexity of the defining query, not the number of changes. It fully recomputes.`,

  'depend': `**Dependencies in ViewLab**

When a View or MV references a base table, a *dependency* is created:

- **Table → View**: The View depends on the table
- **Table → MV**: The MV depends on the table
- **View → View**: Nested views create transitive dependencies

When a base table is modified (INSERT/UPDATE/DELETE), ViewLab:
1. Finds all dependent MVs
2. Marks them as STALE
3. Views remain unaffected (they always re-execute)

View the dependency graph in the Dependencies page.`,

  'compare': `**View vs Materialized View Comparison:**

| Feature | View | Materialized View |
|---------|------|------------------|
| Storage | None (query only) | Physical table |
| Speed | Re-computes each time | Reads stored result |
| Freshness | Always current ✅ | Can become stale ⚠️ |
| Refresh | Not needed | Required after changes |
| Best for | Simple queries, security | Dashboards, analytics |

**Rule of thumb:** If freshness matters → View. If performance matters → Materialized View.`,

  'create': `**Creating Views and MVs in ViewLab:**

**Normal View:**
\`\`\`sql
CREATE VIEW expensive_art AS
SELECT * FROM ARTWORK WHERE price > 100000000;
\`\`\`

**Materialized View:**
\`\`\`sql
CREATE MATERIALIZED VIEW expensive_art_mv AS
SELECT * FROM ARTWORK WHERE price > 100000000;
\`\`\`

The key difference: The MV runs the query immediately and stores the result. The View just stores the query definition.

After creating both, try modifying the base table to see how they behave differently!`,

  'error': `I see you're having trouble with a query. Common issues:

1. **Table not found** — Check the table name matches exactly (case-sensitive)
2. **Column not found** — Verify column names in your schema
3. **Syntax error** — Check for missing semicolons, unmatched quotes
4. **View already exists** — Use DROP VIEW first, then CREATE VIEW

Try checking the table structure in the Overview page, or ask me about a specific error message.`,

  'help': `**Welcome to ViewLab! Here's what you can do:**

🔬 **SQL Lab** — Write and execute SQL queries
🧪 **Simulator** — Step-by-step animated execution visualization
📊 **Compare** — Side-by-side View vs MV comparison
🔗 **Dependencies** — Visual dependency graph
📚 **Tutorial** — Learn about Views and MVs step by step
🧫 **Labs** — Guided hands-on exercises
🌍 **Use Cases** — Real-world scenarios to explore

**Try this workflow:**
1. Create a View and a Materialized View with the same query
2. Insert data into the base table
3. Compare the results — the View updates, the MV doesn't!`,
};

const QUICK_PROMPTS = [
  'What is a View?',
  'View vs Materialized View?',
  'Why is my MV stale?',
  'How does REFRESH work?',
  'How do dependencies work?',
  'Help me get started',
];

import { sendAIChatMessage } from '../ai/client';

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([
    { role: 'assistant', content: 'Hi! I am your ViewLab Assistant. Ask me anything about SQL, Views, Materialized Views, or this experiment.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { lastResult, mvManager, aiSettings, activePage, dependencyTracker } = useStore(useShallow(state => ({
    lastResult: state.lastResult,
    mvManager: state.mvManager,
    aiSettings: state.aiSettings,
    activePage: (state.ui as any).activePage || 'overview',
    dependencyTracker: state.dependencyTracker,
  })));

  const { provider, apiKey, model } = aiSettings;

  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    const handlePrompt = (e: any) => {
      setOpen(true);
      setInput(e.detail);
    };
    document.addEventListener('toggle-ai', handleToggle);
    document.addEventListener('toggle-ai-prompt', handlePrompt);
    return () => {
      document.removeEventListener('toggle-ai', handleToggle);
      document.removeEventListener('toggle-ai-prompt', handlePrompt);
    };
  }, []);

  const getContext = () => {
    const mvCount = mvManager.getViewNames().length;
    const mvs = Array.from(mvManager.getAllViews().values()).map(mv => `${mv.name} (Status: ${mv.status})`).join(', ');
    const lastError = lastResult?.error ? lastResult.error : 'None';
    const graphState = dependencyTracker.getGraph();
    
    return `Current Context:
Active Page User is Viewing: ${activePage}
Materialized Views: ${mvCount} (${mvs})
Last Query Error: ${lastError}
Last Result Rows: ${lastResult?.rowCount || 0}
Dependency Graph Nodes: ${graphState.nodes.map(n => n.id + ' (' + n.type + ')').join(', ')}`;
  };

  const getMockResponse = (query: string): string => {
    const lower = query.toLowerCase();
    
    for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
      if (lower.includes(key)) return response;
    }

    if (lower.includes('fail') || lower.includes('error')) {
      if (lastResult?.error) {
        return `I see your last query failed with: "${lastResult.error}". Check column/table names in the Overview page.`;
      }
      return MOCK_RESPONSES['error'];
    }

    return `I'm in **Local Educational Mock Mode**. To get live responses from OpenRouter, OpenAI, or Claude, configure an API key in Settings → System.`;
  };

  const handleSend = async (customInput?: string) => {
    const userMessage = customInput || input;
    if (!userMessage.trim() || loading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';
      if (provider !== 'mock') {
        if (!apiKey) {
          throw new Error('API Key is missing. Please configure it in Settings.');
        }
        const messageHistory = messages.filter(m => m.role !== 'system');
        responseText = await sendAIChatMessage(aiSettings, [...messageHistory, { role: 'user', content: userMessage }], getContext());
      } else {
        await new Promise(r => setTimeout(r, 400));
        responseText = getMockResponse(userMessage);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 neo-surface z-50 flex flex-col border-l border-border shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b border-border/10">
        <h3 className="font-bold text-primary flex items-center gap-2">
          ViewLab Assistant
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {provider !== 'mock' ? `${provider} • ${model}` : 'Educational AI'}
          </span>
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'neo-surface-inset text-foreground'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">Assistant is typing...</div>}
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-t border-border/5 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-30"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border/10 bg-background/50">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            disabled={loading}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <button onClick={() => handleSend()} disabled={loading} className="neo-button-primary px-3 py-2 rounded-lg disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
