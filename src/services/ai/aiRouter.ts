import { AIProviderId, ProviderConfig, ChatMessage, ToolDefinition, RoutingMode, RoutingDecision, TaskType, PrivacyLevel } from '../../types';
import { IAIProvider, AIResponse } from './types';
import { taskClassifier, TaskClassificationResult } from './taskClassifier';
import { quotaManager } from './quotaManager';
import { multiAgentOrchestrator } from './multiAgentOrchestrator';

export interface RouterOptions {
  preferredProviderId?: AIProviderId;
  forceLocalOnly?: boolean;
  signal?: AbortSignal;
}

export class AIRouter {
  private routingMode: RoutingMode = 'auto';
  private lastRoutingDecision: RoutingDecision | null = null;
  private routingHistory: RoutingDecision[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedMode = localStorage.getItem('breakpoint_routing_mode');
      if (savedMode) {
        this.routingMode = savedMode as RoutingMode;
      }
    } catch {
      this.routingMode = 'auto';
    }
  }

  getRoutingMode(): RoutingMode {
    return this.routingMode;
  }

  setRoutingMode(mode: RoutingMode) {
    this.routingMode = mode;
    try {
      localStorage.setItem('breakpoint_routing_mode', mode);
    } catch {}
  }

  getLastDecision(): RoutingDecision | null {
    return this.lastRoutingDecision;
  }

  getRoutingHistory(): RoutingDecision[] {
    return [...this.routingHistory];
  }

  /**
   * Main intelligent entry point that routes requests safely, deterministically, and cost-effectively.
   */
  async routeAndGenerate(
    messages: ChatMessage[],
    systemPrompt: string,
    providers: Map<AIProviderId, IAIProvider>,
    configs: Map<AIProviderId, ProviderConfig>,
    tools: ToolDefinition[] = [],
    options?: RouterOptions
  ): Promise<AIResponse> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content.trim() || '';

    // 1. Task & Privacy Classification
    const classification: TaskClassificationResult = taskClassifier.classify(lastUserMsg);

    // 2. Deterministic Execution Shortcut (0ms, 0 API calls, 0 cost)
    if (classification.isDeterministic && classification.deterministicResult) {
      const decision: RoutingDecision = {
        taskType: classification.taskType,
        privacyLevel: classification.privacyLevel,
        selectedProvider: 'mock',
        selectedModel: 'deterministic-calculator',
        costTier: 'local',
        routingMode: this.routingMode,
        reason: 'Executed via deterministic local engine (0ms latency, zero cloud transmissions).',
        isFallback: false,
        timestamp: new Date().toISOString()
      };
      this.recordDecision(decision);

      return {
        content: classification.deterministicResult,
        provider: 'mock',
        model: 'deterministic-calculator',
        latencyMs: 0
      };
    }

    // 3. Privacy Defense: Never send secrets or sensitive credentials to cloud
    let effectiveRoutingMode = this.routingMode;
    if (classification.privacyLevel === 'secret_bearing' || classification.privacyLevel === 'sensitive') {
      effectiveRoutingMode = 'local_only';
    }
    if (options?.forceLocalOnly) {
      effectiveRoutingMode = 'local_only';
    }

    // 4. Provider Candidate Ranking
    const candidateOrder: AIProviderId[] = this.selectCandidateProviders(
      classification.taskType,
      effectiveRoutingMode,
      options?.preferredProviderId,
      configs
    );

    const fallbackChain: AIProviderId[] = [];
    let lastError: any = null;

    // 5. Safe Execution with Controlled Fallback Loop
    for (let i = 0; i < candidateOrder.length; i++) {
      const providerId = candidateOrder[i];
      const provider = providers.get(providerId);
      const config = configs.get(providerId);

      if (!provider || !config) continue;

      // Quota & Cost Policy Check
      const quotaCheck = quotaManager.canRouteToProvider(providerId, config.selectedModel);
      if (!quotaCheck.allowed) {
        fallbackChain.push(providerId);
        console.warn(`[AIRouter] Candidate ${providerId} rejected by QuotaPolicy: ${quotaCheck.reason}`);
        continue;
      }

      // Check if provider requires key but has none
      if (providerId !== 'mock' && providerId !== 'ollama' && (!config.apiKey || !config.enabled)) {
        fallbackChain.push(providerId);
        continue;
      }

      // Try generating response
      try {
        const isMultiAgentEligible = multiAgentOrchestrator.shouldDecompose(
          classification.taskType,
          messages.length,
          lastUserMsg
        );

        let response: AIResponse;

        if (isMultiAgentEligible && provider.id !== 'mock') {
          response = await multiAgentOrchestrator.executeSequentialPlan(
            lastUserMsg,
            provider,
            config,
            tools,
            options?.signal
          );
        } else {
          response = await provider.generateResponse(messages, systemPrompt, config, tools, options?.signal);
        }

        // Record successful usage
        quotaManager.recordRequestSuccess(providerId, config.selectedModel, {
          prompt: response.tokensUsed?.prompt || 0,
          completion: response.tokensUsed?.completion || 0
        });

        // Record Routing Decision
        const decision: RoutingDecision = {
          taskType: classification.taskType,
          privacyLevel: classification.privacyLevel,
          selectedProvider: providerId,
          selectedModel: config.selectedModel,
          costTier: providerId === 'mock' || providerId === 'ollama' ? 'local' : 'free_tier',
          routingMode: effectiveRoutingMode,
          reason: fallbackChain.length > 0
            ? `Routed to ${providerId} after fallback chain: ${fallbackChain.join(' -> ')}.`
            : `Primary optimal route selected for ${classification.taskType}.`,
          isFallback: fallbackChain.length > 0,
          fallbackChain: fallbackChain.length > 0 ? fallbackChain : undefined,
          timestamp: new Date().toISOString()
        };
        this.recordDecision(decision);

        if (fallbackChain.length > 0) {
          response.content = `[Notice: System cascaded to ${config.name} due to upstream limits]\n\n` + response.content;
        }

        return response;
      } catch (err: any) {
        lastError = err;
        fallbackChain.push(providerId);
        quotaManager.recordError(providerId, config.selectedModel, err.message || '');
        console.warn(`[AIRouter] Provider ${providerId} failed: ${err.message}. Cascading to next candidate.`);
      }
    }

    // 6. Ultimate Resilient Fallback: Autonomous JARVIS Engine (100% offline guarantee)
    const mockProvider = providers.get('mock')!;
    const mockConfig = configs.get('mock')!;
    const ultimateResponse = await mockProvider.generateResponse(messages, systemPrompt, mockConfig, tools);

    const ultimateDecision: RoutingDecision = {
      taskType: classification.taskType,
      privacyLevel: classification.privacyLevel,
      selectedProvider: 'mock',
      selectedModel: 'break-point-v1',
      costTier: 'local',
      routingMode: effectiveRoutingMode,
      reason: `All cloud routes exhausted. Autonomous JARVIS offline engine activated. Error context: ${lastError?.message || 'None configured'}`,
      isFallback: true,
      fallbackChain,
      timestamp: new Date().toISOString()
    };
    this.recordDecision(ultimateDecision);

    ultimateResponse.content = `[Autonomous Offline Protocol Engaged]\n\n` + ultimateResponse.content;
    return ultimateResponse;
  }

  /**
   * Determine candidate provider order based on task requirements, mode, and health
   */
  private selectCandidateProviders(
    taskType: TaskType,
    mode: RoutingMode,
    preferredId: AIProviderId | undefined,
    configs: Map<AIProviderId, ProviderConfig>
  ): AIProviderId[] {
    // If user explicitly picked offline autonomous
    if (mode === 'offline_autonomous') {
      return ['mock'];
    }

    // If local only mode
    if (mode === 'local_only') {
      return ['ollama', 'mock'];
    }

    // If user has a preferred provider and it is enabled
    if (preferredId && preferredId !== 'mock') {
      const conf = configs.get(preferredId);
      if (conf?.enabled) {
        return [preferredId, 'gemini', 'groq', 'ollama', 'mock'];
      }
    }

    // Adaptive Auto Policy:
    switch (taskType) {
      case 'simple_command':
      case 'calculation':
        return ['mock', 'ollama', 'groq'];

      case 'casual_conversation':
      case 'voice_interaction':
        // Fast, low latency free providers: Groq llama-3.3-70b (ultra fast inference) -> Gemini 2.0 Flash -> Ollama
        return ['groq', 'gemini', 'ollama', 'mock'];

      case 'coding':
      case 'complex_reasoning':
      case 'document_analysis':
        // High reasoning providers: Gemini 2.0 Flash -> Claude (if user authorized) -> Groq -> Ollama
        return ['gemini', 'claude' as any, 'groq', 'openai', 'ollama', 'mock'];

      case 'stock_market':
      case 'web_research':
      case 'idea_simulation':
        // Analytical providers: Gemini 2.0 Flash -> Groq -> Ollama -> Autonomous Engine
        return ['gemini', 'groq', 'openai', 'ollama', 'mock'];

      default:
        return ['gemini', 'groq', 'ollama', 'mock'];
    }
  }

  private recordDecision(decision: RoutingDecision) {
    this.lastRoutingDecision = decision;
    this.routingHistory.unshift(decision);
    if (this.routingHistory.length > 50) this.routingHistory.pop();

    // Broadcast routing event for HUD telemetry
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('breakpoint:routing_event', { detail: decision }));
    }
  }
}

export const aiRouter = new AIRouter();
