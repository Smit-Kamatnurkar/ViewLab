import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';

const SYSTEM_PROMPT = `You are the ViewLab AI Assistant. You help users understand SQL, Views, Materialized Views, and execution plans.
Analyze the user's question in the context of their current database schema, recent queries, and execution plans.
Keep your answers concise, practical, and highly relevant to the provided context.`;

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
    dependencyTracker: state.dependencyTracker
  })));

  const { provider, apiKey, model, baseUrl } = aiSettings;

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

  const askOpenAI = async (userMessage: string) => {
    try {
      const url = provider === 'compatible' && baseUrl ? baseUrl + '/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + getContext() },
            ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'AI API Error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e: any) {
      throw new Error(`Failed to contact AI Provider: ${e.message}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';
      if (provider !== 'mock') {
        if (!apiKey) {
          throw new Error('API Key is missing. Please configure it in Settings -> System.');
        }
        responseText = await askOpenAI(userMessage);
      } else {
        await new Promise(r => setTimeout(r, 600));
        const query = userMessage.toLowerCase();
        responseText = "I'm a local mock assistant. Configure a real provider in Settings!";
        if (query.includes('stale')) {
          responseText = "Your source table changed after the Materialized View was created. The MV stores the previous result, so it has not automatically incorporated the new row. Refresh it to synchronize the stored result.";
        } else if (query.includes('fail') || query.includes('error')) {
          if (lastResult?.error) {
            responseText = `I see your last query failed with: "${lastResult.error}". This usually means there's a syntax error.`;
          } else {
            responseText = "I don't see any recent errors.";
          }
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
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
            {provider !== 'mock' ? `${provider} • ${model}` : 'Local Demo AI'}
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
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'neo-surface-inset text-foreground'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">Assistant is typing...</div>}
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
          <button onClick={handleSend} disabled={loading} className="neo-button-primary px-3 py-2 rounded-lg disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
