import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store';
import { fetchAvailableModels, testAIConnection, normalizeBaseUrl, ModelInfo } from '../../ai/client';

export function Settings() {
  const { aiSettings, setAISettings } = useStore(
    useShallow((state) => ({
      aiSettings: state.aiSettings,
      setAISettings: state.setAISettings,
    }))
  );

  const { provider, apiKey, model, baseUrl, testStatus = 'idle', testError, lastVerifiedAt } = aiSettings;

  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelList, setModelList] = useState<ModelInfo[]>([]);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [testReply, setTestReply] = useState<string | null>(null);

  const handleProviderChange = (newProvider: 'mock' | 'openai' | 'anthropic' | 'compatible') => {
    let defaultBase = baseUrl;
    let defaultModel = model;

    if (newProvider === 'compatible') {
      defaultBase = baseUrl || 'https://openrouter.ai/api/v1';
      defaultModel = model || 'google/gemini-2.5-flash';
    } else if (newProvider === 'openai') {
      defaultBase = 'https://api.openai.com/v1';
      defaultModel = 'gpt-4o-mini';
    } else if (newProvider === 'anthropic') {
      defaultBase = 'https://api.anthropic.com/v1';
      defaultModel = 'claude-3-5-sonnet-20241022';
    }

    setAISettings({
      provider: newProvider,
      baseUrl: defaultBase,
      model: defaultModel,
      testStatus: 'idle',
      testError: undefined,
    });
    setTestReply(null);
  };

  const handleRefreshModels = async () => {
    if (!apiKey) {
      setModelFetchError('API key is required to discover models.');
      return;
    }

    setLoadingModels(true);
    setModelFetchError(null);
    try {
      const models = await fetchAvailableModels(aiSettings);
      setModelList(models);
      if (models.length === 0) {
        setModelFetchError('No models returned by provider. You can enter a model ID manually.');
      }
    } catch (err: any) {
      setModelFetchError(err.message || 'Could not load models. Enter model ID manually.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTestAndSave = async () => {
    setTesting(true);
    setTestReply(null);
    setAISettings({ testStatus: 'testing', testError: undefined });

    // Normalize Base URL before testing
    const normalizedUrl = normalizeBaseUrl(provider, baseUrl);
    const updatedSettings = {
      ...aiSettings,
      baseUrl: normalizedUrl,
    };

    const result = await testAIConnection(updatedSettings);
    setTesting(false);

    if (result.success) {
      setTestReply(result.reply || null);
      setAISettings({
        baseUrl: normalizedUrl,
        testStatus: 'success',
        testError: undefined,
        lastVerifiedAt: Date.now(),
      });
    } else {
      setAISettings({
        baseUrl: normalizedUrl,
        testStatus: 'error',
        testError: result.message,
      });
    }
  };

  const handleRemove = () => {
    setAISettings({
      apiKey: '',
      testStatus: 'idle',
      testError: undefined,
      lastVerifiedAt: undefined,
    });
    setTestReply(null);
  };

  const getStatusDisplay = () => {
    if (provider === 'mock') {
      return { text: 'Local Mock (Demo)', color: 'bg-amber-500', badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    if (!apiKey) {
      return { text: 'Not Configured', color: 'bg-muted-foreground', badgeBg: 'bg-muted text-muted-foreground border-border/40' };
    }
    if (testStatus === 'success') {
      return { text: 'Connected', color: 'bg-emerald-500', badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse' };
    }
    if (testStatus === 'error') {
      return { text: 'Connection Failed', color: 'bg-red-500', badgeBg: 'bg-red-500/10 text-red-500 border-red-500/20' };
    }
    if (lastVerifiedAt) {
      return { text: 'Configuration Saved', color: 'bg-amber-500', badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    return { text: 'Unverified', color: 'bg-amber-500', badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="p-6 md:p-10 flex-1 overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2 border-b border-border/40 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">ViewLab Settings</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Configure AI Providers (BYOK), Base URLs, and Models.</p>
            </div>
          </div>
        </header>

        {/* AI Provider Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🤖</span> AI Assistant Configuration (BYOK)
            </h2>
            <div className={`px-3 py-1 rounded-full border text-xs font-bold font-mono flex items-center gap-2 ${statusInfo.badgeBg}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
              <span>{statusInfo.text}</span>
            </div>
          </div>

          <div className="p-6 bg-card border border-border/60 rounded-2xl space-y-6 shadow-xs">
            
            {/* Provider Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">Select AI Provider</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="w-full bg-background border border-border/60 p-3 rounded-xl text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
              >
                <option value="compatible">OpenAI Compatible (OpenRouter, Custom, Local)</option>
                <option value="openai">OpenAI Direct (api.openai.com)</option>
                <option value="anthropic">Anthropic Direct (api.anthropic.com)</option>
                <option value="mock">Local Educational Mock (No API Key Required)</option>
              </select>
            </div>

            {provider !== 'mock' && (
              <>
                {/* Base URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span>Base API URL</span>
                    <span className="text-[10px] text-muted-foreground font-mono">Auto-normalized</span>
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setAISettings({ baseUrl: e.target.value, testStatus: 'idle' })}
                    placeholder={provider === 'compatible' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1'}
                    className="w-full bg-background border border-border/60 p-3 rounded-xl text-xs font-mono text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    For OpenRouter, enter <code className="text-primary font-bold">https://openrouter.ai/</code> or <code className="text-primary font-bold">https://openrouter.ai/api/v1</code>.
                  </p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span>API Key</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold">
                      Stored in Browser LocalStorage
                    </span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setAISettings({ apiKey: e.target.value, testStatus: 'idle' })}
                    placeholder="sk-or-v1-... or sk-..."
                    className="w-full bg-background border border-border/60 p-3 rounded-xl text-xs font-mono text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your key is strictly stored client-side in your browser and used to make direct API requests.
                  </p>
                </div>

                {/* Model Selection & Discovery */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">Model Identifier</label>
                    <button
                      type="button"
                      onClick={handleRefreshModels}
                      disabled={loadingModels || !apiKey}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      {loadingModels ? 'Discovering Models...' : '🔄 Discover Models'}
                    </button>
                  </div>

                  {modelList.length > 0 ? (
                    <select
                      value={model}
                      onChange={(e) => setAISettings({ model: e.target.value, testStatus: 'idle' })}
                      className="w-full bg-background border border-border/60 p-3 rounded-xl text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    >
                      {modelList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setAISettings({ model: e.target.value, testStatus: 'idle' })}
                      placeholder="e.g. google/gemini-2.5-flash or openrouter/free"
                      className="w-full bg-background border border-border/60 p-3 rounded-xl text-xs font-mono text-foreground focus:border-primary focus:outline-none transition-colors"
                    />
                  )}

                  {modelFetchError && (
                    <p className="text-xs text-amber-500 font-mono">{modelFetchError}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Examples: <code className="text-primary font-bold">google/gemini-2.5-flash</code>, <code className="text-primary font-bold">openrouter/free</code>, <code className="text-primary font-bold">meta-llama/llama-3.3-70b-instruct:free</code>, <code className="text-primary font-bold">gpt-4o-mini</code>.
                  </p>
                </div>
              </>
            )}

            {/* Test Connection Button */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
              <button
                onClick={handleTestAndSave}
                disabled={testing}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <span>Test Connection & Save</span>
                )}
              </button>

              {provider !== 'mock' && apiKey && (
                <button
                  onClick={handleRemove}
                  className="px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold rounded-xl transition-all"
                >
                  Remove Key
                </button>
              )}
            </div>

            {/* Result Feedback Banner */}
            {testStatus === 'success' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-xs text-emerald-600 dark:text-emerald-400">
                <div className="font-bold flex items-center gap-2">
                  <span>✓</span> Connection Successful! Configuration Saved.
                </div>
                {testReply && (
                  <div className="font-mono text-[11px] pt-1 text-foreground">
                    Provider Response: <strong>"{testReply}"</strong>
                  </div>
                )}
              </div>
            )}

            {testStatus === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1 text-xs text-red-500 font-mono">
                <div className="font-bold flex items-center gap-2">
                  <span>🔴</span> Connection Failed
                </div>
                <div className="text-foreground">{testError}</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
