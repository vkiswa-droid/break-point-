import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { credentialService } from './credentialService';
import { quotaManager } from './quotaManager';

export class GroqProvider implements IAIProvider {
  id: AIProviderId = 'groq';
  name = 'Groq Low-Latency Engine';

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: false,
      toolCalling: true,
      maxContextTokens: 131072,
      isLocal: false,
      isFreeTierEligible: true,
      isPaidOnly: false,
      recommendedForLowRam: true
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'groq',
      model: 'llama-3.3-70b-versatile',
      tier: 'free_tier',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'unknown',
      quotaNotes: 'Estimated Groq Cloud Free Tier limits (30 RPM / 14,400 RPD). Actual quotas subject to account tier.'
    };
  }

  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string } {
    if (!config.enabled && !config.apiKey) {
      return { valid: false, reason: 'Groq API key is required in DPAPI vault.' };
    }
    return { valid: true };
  }

  async checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    const res = await this.testConnection(config || {
      id: 'groq',
      name: 'Groq',
      enabled: true,
      apiKey: '',
      selectedModel: 'llama-3.3-70b-versatile',
      availableModels: [],
      capabilities: { text: true, streaming: true, vision: false, toolCalling: true },
      status: 'testing'
    });
    return { available: res.success, latencyMs: res.latencyMs, error: res.error };
  }

  async testConnection(_config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.testCloudConnection) {
      return await credentialService.testCloudConnection(this.id, quotaManager.isPaidCloudAllowed());
    }

    return { success: true, latencyMs: 20 };
  }

  cancelRequest(_requestId?: string): void {
    // Cancellation handled at IPC/controller level
  }

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    _tools?: ToolDefinition[],
    _signal?: AbortSignal
  ): Promise<AIResponse> {
    const model = config.selectedModel || 'llama-3.3-70b-versatile';

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.proxyAIRequest) {
      return await credentialService.proxyAIRequest({
        providerId: this.id,
        model,
        messages,
        systemPrompt,
        paidAllowed: quotaManager.isPaidCloudAllowed(),
        cloudPaused: quotaManager.isCloudAIPaused()
      });
    }

    // Mock/Unit test fallback
    return {
      content: 'Diagnostics check response from Groq low-latency engine.',
      provider: 'groq',
      model,
      latencyMs: 22,
      tokensUsed: { prompt: 10, completion: 20, total: 30 }
    };
  }
}
