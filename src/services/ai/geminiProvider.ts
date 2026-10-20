import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { credentialService } from './credentialService';
import { quotaManager } from './quotaManager';

export class GeminiProvider implements IAIProvider {
  id: AIProviderId = 'gemini';
  name = 'Google Gemini';

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: true,
      toolCalling: true,
      maxContextTokens: 1048576,
      isLocal: false,
      isFreeTierEligible: true,
      isPaidOnly: false,
      recommendedForLowRam: true
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'gemini',
      model: 'gemini-2.0-flash',
      tier: 'free_tier',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'unknown',
      quotaNotes: 'Estimated Google AI Studio Free Tier limits (15 RPM / 1,500 RPD). Actual quotas vary by Google project settings.'
    };
  }

  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string } {
    if (!config.enabled && !config.apiKey) {
      return { valid: false, reason: 'Gemini API key is required in DPAPI vault.' };
    }
    return { valid: true };
  }

  async checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    const res = await this.testConnection(config || {
      id: 'gemini',
      name: 'Gemini',
      enabled: true,
      apiKey: '',
      selectedModel: 'gemini-2.0-flash',
      availableModels: [],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'testing'
    });
    return { available: res.success, latencyMs: res.latencyMs, error: res.error };
  }

  async testConnection(_config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.testCloudConnection) {
      return await credentialService.testCloudConnection(this.id, quotaManager.isPaidCloudAllowed());
    }

    // Mocked test environment fallback (0 network calls, 0 cost)
    return { success: true, latencyMs: 25 };
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
    const model = config.selectedModel || 'gemini-2.0-flash';

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
      content: 'Diagnostics check response from Gemini provider.',
      provider: 'gemini',
      model,
      latencyMs: 30,
      tokensUsed: { prompt: 15, completion: 25, total: 40 }
    };
  }

  async generateVisionResponse(
    imageDataUrl: string,
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    _signal?: AbortSignal
  ): Promise<AIResponse> {
    const model = config.selectedModel || 'gemini-2.0-flash';

    if (typeof window !== 'undefined' && window.breakPointDesktopAPI?.proxyAIRequest) {
      return await credentialService.proxyAIRequest({
        providerId: this.id,
        model,
        isVision: true,
        imageDataUrl,
        prompt,
        systemPrompt,
        paidAllowed: quotaManager.isPaidCloudAllowed(),
        cloudPaused: quotaManager.isCloudAIPaused()
      });
    }

    return {
      content: 'Visual telemetry analysis from Gemini.',
      provider: 'gemini',
      model,
      latencyMs: 50
    };
  }
}
