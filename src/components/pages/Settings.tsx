import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';

export function Settings() {
  const { aiSettings, setAISettings } = useStore(useShallow(state => ({ aiSettings: state.aiSettings, setAISettings: state.setAISettings })));
  const { provider, apiKey, model, baseUrl } = aiSettings;
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const handleSave = () => {};

  const handleRemove = () => {
    setAISettings({ apiKey: '' });
    setTestStatus('idle');
  };

  const testConnection = async () => {
    if (!apiKey && provider !== 'mock') {
      setTestError('Please provide an API key to test connection.');
      setTestStatus('error');
      return;
    }
    
    setTestStatus('testing');
    try {
      if (provider === 'mock') {
        await new Promise(r => setTimeout(r, 1000));
        setTestStatus('success');
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) throw new Error('Invalid API Key or unauthorized.');
        setTestStatus('success');
      } else {
        throw new Error('Connection test not implemented for this provider yet.');
      }
      handleSave();
    } catch (e: any) {
      setTestError(e.message);
      setTestStatus('error');
    }
  };

  return (
    <div className="p-10 flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-2 mb-8 border-b border-border/10 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">ViewLab Preferences</h1>
          <p className="text-muted-foreground">Configure AI providers, theme, and application behavior.</p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AI Assistant (BYOK)</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${testStatus === 'success' ? 'bg-green-400' : 'hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${testStatus === 'success' ? 'bg-green-500' : provider === 'mock' ? 'bg-orange-500' : 'bg-muted'}`}></span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {testStatus === 'success' ? 'Connected' : provider === 'mock' ? 'Mock Mode' : 'Not Configured'}
              </span>
            </div>
          </div>
          
          <div className="neo-surface p-8 space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Provider</label>
              <select 
                value={provider} 
                onChange={e => {
                  setAISettings({ provider: e.target.value as any });
                  setTestStatus('idle');
                }}
                className="w-full bg-background border border-border/50 p-3 rounded-lg text-sm focus:border-primary/50 focus:outline-none"
              >
                <option value="mock">Local Mock (Demo)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="compatible">OpenAI Compatible (Custom)</option>
              </select>
            </div>

            {provider !== 'mock' && (
              <>
                {provider === 'compatible' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Base URL</label>
                    <input 
                      type="text" 
                      value={baseUrl} 
                      onChange={e => setAISettings({ baseUrl: e.target.value })} 
                      placeholder="https://api.yourprovider.com/v1"
                      className="w-full bg-background border border-border/50 p-3 rounded-lg text-sm focus:border-primary/50 focus:outline-none" 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Model</label>
                  <input 
                    type="text" 
                    value={model} 
                    onChange={e => setAISettings({ model: e.target.value })} 
                    placeholder="e.g. gpt-4o-mini"
                    className="w-full bg-background border border-border/50 p-3 rounded-lg text-sm focus:border-primary/50 focus:outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center justify-between">
                    API Key
                    <span className="text-xs font-normal text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded">Stored Locally</span>
                  </label>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={e => { setAISettings({ apiKey: e.target.value }); setTestStatus('idle'); }} 
                    placeholder="sk-..." 
                    className="w-full bg-background border border-border/50 p-3 rounded-lg text-sm focus:border-primary/50 focus:outline-none" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your key is strictly stored in your browser's local storage and is sent directly to the selected provider.
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border/10">
              <button 
                onClick={testConnection} 
                disabled={testStatus === 'testing'}
                className="neo-button-primary px-6 py-2.5 rounded-lg flex items-center gap-2"
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Connection & Save'}
              </button>
              {provider !== 'mock' && apiKey && (
                <button 
                  onClick={handleRemove} 
                  className="px-6 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                >
                  Remove Key
                </button>
              )}
            </div>

            {testStatus === 'error' && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mt-4">
                <strong>Connection failed:</strong> {testError}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
