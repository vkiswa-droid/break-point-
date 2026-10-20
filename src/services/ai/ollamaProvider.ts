import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { localModelAdvisor } from './localModelAdvisor';

export class OllamaProvider implements IAIProvider {
  id: AIProviderId = 'ollama';
  name = 'Ollama Local Models';
  private abortControllers: Map<string, AbortController> = new Map();

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: false,
      toolCalling: false,
      maxContextTokens: 8192,
      isLocal: true,
      isFreeTierEligible: true,
      isPaidOnly: false,
      recommendedForLowRam: true,
      estimatedRamMB: 2048
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'ollama',
      model: 'llama3',
      tier: 'local',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'available',
      quotaNotes: 'Local on-device inference (100% free, 0 network bandwidth, private)'
    };
  }

  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string } {
    const baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return { valid: false, reason: 'Invalid Ollama base URL schema.' };
    }
    return { valid: true };
  }

  async checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    const conf = config || {
      id: 'ollama',
      name: 'Ollama',
      enabled: true,
      apiKey: '',
      baseUrl: 'http://127.0.0.1:11434',
      selectedModel: 'llama3',
      availableModels: [],
      capabilities: { text: true, streaming: true, vision: false, toolCalling: false },
      status: 'testing'
    };
    const res = await this.testConnection(conf);
    return { available: res.success, latencyMs: res.latencyMs, error: res.error };
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        return { success: false, latencyMs, error: `Ollama returned HTTP ${res.status}` };
      }
      return { success: true, latencyMs };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        error: 'Could not connect to Ollama daemon at 127.0.0.1:11434. Is `ollama serve` running?'
      };
    }
  }

  cancelRequest(requestId?: string): void {
    if (requestId && this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId)!.abort();
      this.abortControllers.delete(requestId);
    } else {
      this.abortControllers.forEach(c => c.abort());
      this.abortControllers.clear();
    }
  }

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    _tools?: ToolDefinition[],
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
    const model = config.selectedModel || 'llama3';

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const reqId = `req_ollama_${Date.now()}`;
    const controller = new AbortController();
    this.abortControllers.set(reqId, controller);

    // Run within localModelAdvisor sequential lock to prevent multi-model memory crash
    return await localModelAdvisor.runSequentially(async () => {
      const start = performance.now();
      try {
        const activeSignal = signal || controller.signal;
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            stream: false
          }),
          signal: activeSignal
        });

        const latencyMs = Math.round(performance.now() - start);
        if (!res.ok) {
          throw new Error(
            `Ollama Error HTTP ${res.status}: Ensure model "${model}" is downloaded via 'ollama pull ${model}'`
          );
        }

        const data = await res.json();
        return {
          content: data.message?.content || 'No response returned from Ollama.',
          provider: 'ollama',
          model,
          latencyMs,
          tokensUsed: {
            prompt: data.prompt_eval_count || 0,
            completion: data.eval_count || 0,
            total: (data.prompt_eval_count || 0) + (data.eval_count || 0)
          }
        };
      } finally {
        this.abortControllers.delete(reqId);
      }
    });
  }
}
