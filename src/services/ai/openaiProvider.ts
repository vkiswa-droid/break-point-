import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { credentialService } from './credentialService';
import { quotaManager } from './quotaManager';

export class OpenAIProvider implements IAIProvider {
  id: AIProviderId = 'openai';
  name = 'OpenAI';

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: true,
      toolCalling: true,
      maxContextTokens: 128000,
      isLocal: false,
      isFreeTierEligible: false,
      isPaidOnly: true,
      recommendedForLowRam: true
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'openai',
      model: 'gpt-4o-mini',
      tier: 'potentially_billable',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'unknown',
      quotaNotes: 'Estimated limits unverified: OpenAI platform requires account credits. Blocked under ₹0 budget policy.'
    };
  }

  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string } {
    if (!config.enabled && !config.apiKey) {
      return { valid: false, reason: 'OpenAI API key is required in DPAPI vault.' };
    }
    return { valid: true };
  }

  async checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    const res = await this.testConnection(config || {
      id: 'openai',
      name: 'OpenAI',
      enabled: true,
      apiKey: '',
      selectedModel: 'gpt-4o-mini',
      availableModels: [],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'testing'
    });
    return { available: res.success, latencyMs: res.latencyMs, error: res.error };
  }

  async testConnection(_config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    // Strict Budget Gate: Block testing potentially billable endpoints unless explicitly enabled
    if (!quotaManager.isPaidCloudAllowed()) {
      return {
        success: false,
        latencyMs: 0,
        error: 'Provider OpenAI is classified as potentially billable. Testing blocked under ₹0 budget policy until paid APIs are explicitly enabled.'
      };
    }

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.testCloudConnection) {
      return await credentialService.testCloudConnection(this.id, true);
    }

    return { success: true, latencyMs: 25 };
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
        'SECURITY VIOLATION: Provider OpenAI is classified as potentially billable. Paid cloud requests are strictly blocked under the ₹0/month budget policy.'
      );
    }

    const model = config.selectedModel || 'gpt-4o-mini';

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
      content: 'Diagnostics check response from OpenAI.',
      provider: 'openai',
      model,
      latencyMs: 25,
      tokensUsed: { prompt: 10, completion: 20, total: 30 }
    };
  }

  async generateVisionResponse(
    imageDataUrl: string,
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    _signal?: AbortSignal
  ): Promise<AIResponse> {
    if (!quotaManager.isPaidCloudAllowed()) {
      throw new Error(
        'SECURITY VIOLATION: OpenAI vision is blocked under the ₹0/month budget policy.'
      );
    }

    const model = config.selectedModel || 'gpt-4o-mini';

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.proxyAIRequest) {
      return await credentialService.proxyAIRequest({
        providerId: this.id,
        model,
        isVision: true,
        imageDataUrl,
        prompt,
        systemPrompt,
        paidAllowed: true,
        cloudPaused: quotaManager.isCloudAIPaused()
      });
    }

    return {
      content: 'Visual analysis from OpenAI.',
      provider: 'openai',
      model,
      latencyMs: 40
    };
  }
}
