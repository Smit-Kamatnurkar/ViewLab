import { AISettings } from '../types';

export interface ModelInfo {
  id: string;
  name: string;
}

export function normalizeBaseUrl(provider: string, baseUrl?: string): string {
  if (provider === 'openai') return 'https://api.openai.com/v1';
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';

  if (!baseUrl || !baseUrl.trim()) {
    return 'https://openrouter.ai/api/v1';
  }

  let trimmed = baseUrl.trim().replace(/\/+$/, '');

  // Handle OpenRouter normalization
  if (trimmed.includes('openrouter.ai')) {
    if (!trimmed.endsWith('/api/v1')) {
      if (trimmed.endsWith('/api')) {
        trimmed = trimmed + '/v1';
      } else {
        trimmed = trimmed.replace(/\/+$/, '') + '/api/v1';
      }
    }
    return trimmed;
  }

  return trimmed;
}

export function getProviderHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`,
  };

  if (provider === 'compatible' || apiKey.startsWith('sk-or-v1-')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://viewlab.dev';
    headers['X-Title'] = 'ViewLab DBMS Simulator';
  }

  return headers;
}

function parseErrorMessage(status: number, responseText: string): string {
  try {
    const parsed = JSON.parse(responseText);
    if (parsed.error?.message) {
      return parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {}

  switch (status) {
    case 401:
      return 'Invalid API key. Please check your key in Settings.';
    case 403:
      return 'Access denied by provider (403). Verify account permissions.';
    case 404:
      return 'Invalid API endpoint or model ID not found (404).';
    case 429:
      return 'Rate limit reached or insufficient credits (429). Try another model.';
    case 500:
      return 'Provider internal server error (500). Please try again later.';
    default:
      return `Provider error (${status}). ${responseText.slice(0, 100)}`;
  }
}

export async function fetchAvailableModels(settings: AISettings): Promise<ModelInfo[]> {
  const { provider, apiKey, baseUrl } = settings;
  if (!apiKey || provider === 'mock') return [];

  const base = normalizeBaseUrl(provider, baseUrl);
  const url = `${base}/models`;
  const headers = getProviderHeaders(provider, apiKey);

  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(res.status, text));
    }

    const data = await res.json();
    if (Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
      }));
    }
    return [];
  } catch (err: any) {
    console.warn('[ViewLab AI] Model discovery failed:', err.message);
    throw err;
  }
}

export async function testAIConnection(settings: AISettings): Promise<{ success: boolean; message: string; reply?: string }> {
  const { provider, apiKey, baseUrl, model } = settings;

  if (provider === 'mock') {
    return { success: true, message: 'Local Mock Mode connected.' };
  }

  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'API key is required.' };
  }

  const base = normalizeBaseUrl(provider, baseUrl);
  const url = `${base}/chat/completions`;
  const headers = getProviderHeaders(provider, apiKey);

  const selectedModel = model?.trim() || (base.includes('openrouter') ? 'google/gemini-2.5-flash' : 'gpt-4o-mini');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'user', content: 'Reply with exactly: ViewLab connection successful.' },
        ],
        max_tokens: 20,
      }),
    });

    const resText = await response.text();

    if (!response.ok) {
      const errorMsg = parseErrorMessage(response.status, resText);
      return { success: false, message: errorMsg };
    }

    const data = JSON.parse(resText);
    const reply = data.choices?.[0]?.message?.content || 'Connection OK';

    return {
      success: true,
      message: 'ViewLab connection successful.',
      reply,
    };
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        success: false,
        message: 'Could not reach endpoint (Network / CORS error). Check Base URL.',
      };
    }
    return { success: false, message: err.message || 'Unknown network error.' };
  }
}

export async function sendAIChatMessage(
  settings: AISettings,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  systemContext?: string
): Promise<string> {
  const { provider, apiKey, baseUrl, model } = settings;

  if (!apiKey || provider === 'mock') {
    throw new Error('AI Assistant is in Mock Mode or missing API Key.');
  }

  const base = normalizeBaseUrl(provider, baseUrl);
  const url = `${base}/chat/completions`;
  const headers = getProviderHeaders(provider, apiKey);

  const selectedModel = model?.trim() || (base.includes('openrouter') ? 'google/gemini-2.5-flash' : 'gpt-4o-mini');

  const systemPrompt = `You are ViewLab's DBMS Assistant, an expert tutor on SQL, Views, and Materialized Views.\n${systemContext || ''}`;

  const payloadMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: selectedModel,
      messages: payloadMessages,
      temperature: 0.7,
    }),
  });

  const resText = await response.text();

  if (!response.ok) {
    throw new Error(parseErrorMessage(response.status, resText));
  }

  try {
    const data = JSON.parse(resText);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Provider returned an empty response.');
    }
    return content;
  } catch (e: any) {
    throw new Error(`Failed to parse AI response: ${e.message}`);
  }
}
