import { AIProviderId, ProviderConfig, ChatMessage, ToolDefinition, ToolCall, ProviderCostTier, QuotaStatus } from '../../types';

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  provider: AIProviderId;
  model: string;
  latencyMs: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ProviderCapabilities {
  text: boolean;
  streaming: boolean;
  vision: boolean;
  toolCalling: boolean;
  maxContextTokens: number;
  isLocal: boolean;
  isFreeTierEligible: boolean;
  isPaidOnly: boolean;
  recommendedForLowRam: boolean;
  estimatedRamMB?: number;
}

export interface ProviderUsageStatus {
  providerId: AIProviderId;
  model: string;
  tier: ProviderCostTier;
  requestsCount: number;
  estimatedTokensPrompt: number;
  estimatedTokensCompletion: number;
  lastUsedTimestamp?: string;
  quotaStatus: QuotaStatus;
  cooldownUntil?: string;
  quotaNotes: string;
}

export interface IAIProvider {
  id: AIProviderId;
  name: string;
  
  // Verification and Status
  checkAvailability(config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number; error?: string }>;
  testConnection(config: ProviderConfig): Promise<{ success: boolean; latencyMs: number; error?: string }>;
  getCapabilities(): ProviderCapabilities;
  getUsageStatus(): ProviderUsageStatus;
  validateConfiguration(config: ProviderConfig): { valid: boolean; reason?: string };

  // Inference Execution
  generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): Promise<AIResponse>;

  cancelRequest?(requestId?: string): void;

  generateVisionResponse?(
    imageDataUrl: string,
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    signal?: AbortSignal
  ): Promise<AIResponse>;
}
