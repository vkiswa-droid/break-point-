import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { ClaudeProvider } from './claudeProvider';
import { GroqProvider } from './groqProvider';
import { OllamaProvider } from './ollamaProvider';
import { AutonomousJarvisEngine } from './autonomousJarvisEngine';
import { AIProviderId, ProviderConfig, ChatMessage, ToolDefinition, RoutingMode, RoutingDecision } from '../../types';
import { aiRouter } from './aiRouter';
import { quotaManager } from './quotaManager';
import { credentialService } from './credentialService';

export class ProviderManager {
  private providers: Map<AIProviderId, IAIProvider> = new Map();
  private configs: Map<AIProviderId, ProviderConfig> = new Map();
  private activeProviderId: AIProviderId = 'mock';

  constructor() {
    this.registerProvider(new AutonomousJarvisEngine());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OllamaProvider());

    this.initDefaultConfigs();
    this.loadPersistedConfigs();
    this.syncWithCredentialVault();
  }

  private registerProvider(provider: IAIProvider) {
    this.providers.set(provider.id, provider);
  }

  private initDefaultConfigs() {
    this.configs.set('mock', {
      id: 'mock',
      name: 'Break Point Autonomous Engine (Offline/Local)',
      enabled: true,
      apiKey: '',
      selectedModel: 'break-point-v1',
      availableModels: ['break-point-v1', 'jarvis-articulate', 'jarvis-technical'],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'connected',
      latencyMs: 10
    });

    this.configs.set('gemini', {
      id: 'gemini',
      name: 'Google Gemini',
      enabled: false,
      apiKey: '',
      selectedModel: 'gemini-2.0-flash',
      availableModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'disconnected'
    });

    this.configs.set('groq', {
      id: 'groq',
      name: 'Groq Low-Latency Engine',
      enabled: false,
      apiKey: '',
      selectedModel: 'llama-3.3-70b-versatile',
      availableModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant'],
      capabilities: { text: true, streaming: true, vision: false, toolCalling: true },
      status: 'disconnected'
    });

    this.configs.set('ollama', {
      id: 'ollama',
      name: 'Ollama Local Models',
      enabled: false,
      apiKey: '',
      baseUrl: 'http://127.0.0.1:11434',
      selectedModel: 'llama3',
      availableModels: ['llama3.2:1b', 'llama3.2:3b', 'qwen2.5:1.5b', 'deepseek-r1:1.5b', 'llama3', 'mistral'],
      capabilities: { text: true, streaming: true, vision: false, toolCalling: false },
      status: 'disconnected'
    });

    this.configs.set('openai', {
      id: 'openai',
      name: 'OpenAI',
      enabled: false,
      apiKey: '',
      selectedModel: 'gpt-4o-mini',
      availableModels: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'disconnected'
    });

    this.configs.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic Claude',
      enabled: false,
      apiKey: '',
      selectedModel: 'claude-3-5-sonnet-20241022',
      availableModels: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
      capabilities: { text: true, streaming: true, vision: true, toolCalling: true },
      status: 'disconnected'
    });
  }

  private loadPersistedConfigs() {
    try {
      const saved = localStorage.getItem('breakpoint_provider_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach((k) => {
          const id = k as AIProviderId;
          if (this.configs.has(id)) {
            const current = this.configs.get(id)!;
            this.configs.set(id, {
              ...current,
              enabled: parsed[id].enabled ?? current.enabled,
              baseUrl: parsed[id].baseUrl ?? current.baseUrl,
              selectedModel: parsed[id].selectedModel ?? current.selectedModel,
              // Note: Never restore plaintext raw apiKey from browser storage!
              apiKey: parsed[id].apiKey || ''
            });
          }
        });
      }

      const savedActive = localStorage.getItem('breakpoint_active_provider');
      if (savedActive && this.providers.has(savedActive as AIProviderId)) {
        this.activeProviderId = savedActive as AIProviderId;
      }
    } catch {
      // Fallback
    }
  }

  async syncWithCredentialVault() {
    try {
      const status = await credentialService.getStatus();
      Object.entries(status.providers).forEach(([provId, info]) => {
        const conf = this.configs.get(provId as AIProviderId);
        if (conf && info.configured) {
          conf.enabled = true;
          // Store masked placeholder if raw key is hidden in DPAPI
          if (!conf.apiKey) {
            conf.apiKey = info.masked;
          }
        }
      });
    } catch (err) {
      console.warn('[ProviderManager] Vault synchronization skipped:', err);
    }
  }

  saveConfigs() {
    try {
      const serializable: Record<string, any> = {};
      this.configs.forEach((val, key) => {
        serializable[key] = {
          enabled: val.enabled,
          baseUrl: val.baseUrl,
          selectedModel: val.selectedModel
          // Notice: Raw API keys are omitted from plain storage for security!
        };
      });
      localStorage.setItem('breakpoint_provider_configs', JSON.stringify(serializable));
      localStorage.setItem('breakpoint_active_provider', this.activeProviderId);
    } catch {
      // Storage error
    }
  }

  getAllConfigs(): ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  getConfig(id: AIProviderId): ProviderConfig | undefined {
    return this.configs.get(id);
  }

  getProvider(id: AIProviderId): IAIProvider | undefined {
    return this.providers.get(id);
  }

  getProviders(): Map<AIProviderId, IAIProvider> {
    return this.providers;
  }

  getConfigs(): Map<AIProviderId, ProviderConfig> {
    return this.configs;
  }

  updateConfig(id: AIProviderId, updates: Partial<ProviderConfig>) {
    const current = this.configs.get(id);
    if (current) {
      this.configs.set(id, { ...current, ...updates });
      this.saveConfigs();
    }
  }

  getActiveProviderId(): AIProviderId {
    return this.activeProviderId;
  }

  setActiveProviderId(id: AIProviderId) {
    if (this.providers.has(id)) {
      this.activeProviderId = id;
      this.saveConfigs();
    }
  }

  // --- Secure Credential Operations ---

  async storeProviderKey(id: AIProviderId, plainKey: string): Promise<{ success: boolean; masked: string }> {
    const res = await credentialService.storeKey(id, plainKey);
    const conf = this.configs.get(id);
    if (conf) {
      conf.apiKey = plainKey;
      conf.enabled = true;
      conf.status = 'connected';
      this.saveConfigs();
    }
    return res;
  }

  async deleteProviderKey(id: AIProviderId): Promise<boolean> {
    await credentialService.deleteKey(id);
    const conf = this.configs.get(id);
    if (conf) {
      conf.apiKey = '';
      conf.enabled = false;
      conf.status = 'disconnected';
      this.saveConfigs();
    }
    return true;
  }

  // --- Verification and Status ---

  async testProvider(id: AIProviderId): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const provider = this.providers.get(id);
    const config = this.configs.get(id);
    if (!provider || !config) {
      return { success: false, latencyMs: 0, error: 'Provider not found.' };
    }

    // Pre-test budget check
    if ((id === 'openai' || id === 'anthropic') && !quotaManager.isPaidCloudAllowed()) {
      return {
        success: false,
        latencyMs: 0,
        error: `Provider ${id.toUpperCase()} is classified as potentially billable. Testing blocked under ₹0 budget policy until paid APIs are explicitly enabled.`
      };
    }

    this.updateConfig(id, { status: 'testing' });
    const result = await provider.testConnection(config);
    this.updateConfig(id, {
      status: result.success ? 'connected' : 'error',
      latencyMs: result.latencyMs,
      lastTested: new Date().toISOString(),
      errorMessage: result.error
    });
    return result;
  }

  getCapabilities(id: AIProviderId): ProviderCapabilities | undefined {
    return this.providers.get(id)?.getCapabilities();
  }

  getUsageStatus(id: AIProviderId): ProviderUsageStatus | undefined {
    return this.providers.get(id)?.getUsageStatus();
  }

  cancelRequest(id?: AIProviderId) {
    if (id && this.providers.has(id)) {
      this.providers.get(id)?.cancelRequest?.();
    } else {
      this.providers.forEach(p => p.cancelRequest?.());
    }
  }

  // --- Routing & Inference ---

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    tools: ToolDefinition[] = [],
    signal?: AbortSignal
  ): Promise<AIResponse> {
    // Delegate to central AIRouter (Keys remain isolated in main process)
    return await aiRouter.routeAndGenerate(
      messages,
      systemPrompt,
      this.providers,
      this.configs,
      tools,
      {
        preferredProviderId: this.activeProviderId,
        signal
      }
    );
  }

  async generateVisionResponse(
    imageDataUrl: string,
    prompt: string,
    systemPrompt: string
  ): Promise<AIResponse> {
    const primaryId = this.activeProviderId;
    const primaryProvider = this.providers.get(primaryId);
    const primaryConfig = this.configs.get(primaryId);

    // Verify quota guard for primary provider before dispatching vision
    if (primaryProvider?.generateVisionResponse && primaryConfig?.capabilities.vision && primaryConfig.enabled) {
      const quotaCheck = quotaManager.canRouteToProvider(primaryId, primaryConfig.selectedModel);
      if (quotaCheck.allowed) {
        try {
          return await primaryProvider.generateVisionResponse(imageDataUrl, prompt, systemPrompt, primaryConfig);
        } catch (err: any) {
          console.warn(`Vision provider [${primaryId}] failed: ${err.message}. Cascading.`);
        }
      }
    }

    // Check Gemini for vision if permitted by quota policy
    const gemini = this.providers.get('gemini');
    const geminiConf = this.configs.get('gemini');
    if (gemini?.generateVisionResponse && geminiConf?.enabled) {
      const quotaCheck = quotaManager.canRouteToProvider('gemini', geminiConf.selectedModel);
      if (quotaCheck.allowed) {
        try {
          return await gemini.generateVisionResponse(imageDataUrl, prompt, systemPrompt, geminiConf);
        } catch {}
      }
    }

    // Autonomous fallback vision (0 cost, 100% offline)
    const mockProvider = this.providers.get('mock')!;
    return await mockProvider.generateVisionResponse!(imageDataUrl, prompt, systemPrompt, this.configs.get('mock')!);
  }

  getRoutingMode(): RoutingMode {
    return aiRouter.getRoutingMode();
  }

  setRoutingMode(mode: RoutingMode) {
    aiRouter.setRoutingMode(mode);
  }

  getLastRoutingDecision(): RoutingDecision | null {
    return aiRouter.getLastDecision();
  }
}

export const providerManager = new ProviderManager();
