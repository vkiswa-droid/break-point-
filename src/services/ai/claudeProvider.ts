import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { credentialService } from './credentialService';
import { quotaManager } from './quotaManager';

export class ClaudeProvider implements IAIProvider {
  id: AIProviderId = 'anthropic';
  name = 'Anthropic Claude';

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: true,
      toolCalling: true,
      maxContextTokens: 200000,
      isLocal: false,
      isFreeTierEligible: false,
      isPaidOnly: true,
      recommendedForLowRam: true
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      tier: 'potentially_billable',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'unknown',
      quotaNotes: 'Estimated limits unverified: Anthropic Claude console requires credits. Blocked under ₹0 budget policy.'
    };
  }

  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string } {
    if (!config.enabled && !config.apiKey) {
      return { valid: false, reason: 'Anthropic API key is required in DPAPI vault.' };
    }
    return { valid: true };
  }

  async checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    const res = await this.testConnection(config || {
      id: 'anthropic',
      name: 'Anthropic',
      enabled: true,
      apiKey: '',
      selectedModel: 'claude-3-5-haiku-20241022',
      availableModels: [],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'testing'
    });
    return { available: res.success, latencyMs: res.latencyMs, error: res.error };
  }

  async testConnection(_config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (!quotaManager.isPaidCloudAllowed()) {
      return {
        success: false,
        latencyMs: 0,
        error: 'Provider Anthropic Claude is classified as potentially billable. Testing blocked under ₹0 budget policy until paid APIs are explicitly enabled.'
      };
    }

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.testCloudConnection) {
      return await credentialService.testCloudConnection(this.id, true);
    }

    return { success: true, latencyMs: 30 };
  }

  cancelRequest(_requestId?: string): void {
    // Handled at IPC level
  }

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    _tools?: ToolDefinition[],
    _signal?: AbortSignal
  ): Promise<AIResponse> {
    // Strict Budget Gate: Direct Call Interceptor
    if (!quotaManager.isPaidCloudAllowed()) {
      throw new Error(
        'SECURITY VIOLATION: Provider Anthropic Claude is classified as potentially billable. Paid cloud requests are strictly blocked under the ₹0/month budget policy.'
      );
    }

    const model = config.selectedModel || 'claude-3-5-sonnet-20241022';

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.proxyAIRequest) {
      return await credentialService.proxyAIRequest({
        providerId: this.id,
        model,
        messages,
        systemPrompt,
        paidAllowed: true,
        cloudPaused: quotaManager.isCloudAIPaused()
      });
    }

    return {
      content: 'Diagnostics check response from Claude.',
      provider: 'anthropic',
      model,
      latencyMs: 30,
      tokensUsed: { prompt: 10, completion: 20, total: 30 }
    };
  }
}
