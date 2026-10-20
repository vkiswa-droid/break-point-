import { AIProviderId, ProviderCostTier, QuotaStatus, ProviderUsageRecord } from '../../types';

export interface QuotaConfig {
  cloudAIPaused: boolean;
  localOnlyMode: boolean;
  paidCloudAllowed: boolean; // STRICTLY false by default
  dailyRequestBudget: number; // e.g. 500 requests
}

export class QuotaManager {
  private records: Map<string, ProviderUsageRecord> = new Map();
  private config: QuotaConfig = {
    cloudAIPaused: false,
    localOnlyMode: false,
    paidCloudAllowed: false, // Default disabled!
    dailyRequestBudget: 500
  };

  // Known free-tier limits catalog (honest reference points, marked as estimates)
  private knownProviderLimits: Record<AIProviderId, { tier: ProviderCostTier; notes: string }> = {
    mock: {
      tier: 'local',
      notes: 'Autonomous offline engine. 100% free, unlimited, zero network usage.'
    },
    ollama: {
      tier: 'local',
      notes: 'Local hardware inference. Zero cloud costs, private on-device.'
    },
    gemini: {
      tier: 'free_tier',
      notes: 'Google AI Studio Free Tier: 15 Requests/Min, 1,500 Requests/Day (gemini-2.0-flash).'
    },
    groq: {
      tier: 'free_tier',
      notes: 'Groq Cloud Free Allowance: 30 Requests/Min, 14,400 Requests/Day (llama-3.3-70b).'
    },
    openai: {
      tier: 'potentially_billable',
      notes: 'OpenAI platform requires preloaded account credits or active free trial tier.'
    },
    anthropic: {
      tier: 'potentially_billable',
      notes: 'Anthropic Claude console requires credit balance. Paid tier unless promotional grant active.'
    }
  };

  constructor() {
    this.loadState();
    this.initDefaultRecords();
  }

  private loadState() {
    try {
      const savedConfig = localStorage.getItem('breakpoint_quota_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = {
          ...this.config,
          ...parsed,
          // Guarantee safety: paidCloudAllowed is NEVER defaulted to true from storage tampering
          paidCloudAllowed: Boolean(parsed.paidCloudAllowed)
        };
      }

      const savedRecords = localStorage.getItem('breakpoint_quota_records');
      if (savedRecords) {
        const parsed: ProviderUsageRecord[] = JSON.parse(savedRecords);
        parsed.forEach(r => this.records.set(`${r.providerId}_${r.model}`, r));
      }
    } catch (e) {
      console.warn('[QuotaManager] Failed loading persisted quota state:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem('breakpoint_quota_config', JSON.stringify(this.config));
      localStorage.setItem(
        'breakpoint_quota_records',
        JSON.stringify(Array.from(this.records.values()))
      );
    } catch (e) {
      console.error('[QuotaManager] Failed saving quota state:', e);
    }
  }

  private initDefaultRecords() {
    const defaultModels: Record<AIProviderId, string> = {
      mock: 'break-point-v1',
      ollama: 'llama3',
      gemini: 'gemini-2.0-flash',
      groq: 'llama-3.3-70b-versatile',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022'
    };

    (Object.keys(this.knownProviderLimits) as AIProviderId[]).forEach(provId => {
      const model = defaultModels[provId];
      const key = `${provId}_${model}`;
      if (!this.records.has(key)) {
        const info = this.knownProviderLimits[provId];
        this.records.set(key, {
          providerId: provId,
          model,
          costTier: info.tier,
          requestsCount: 0,
          estimatedTokensPrompt: 0,
          estimatedTokensCompletion: 0,
          quotaStatus: provId === 'mock' || provId === 'ollama' ? 'available' : 'unknown',
          quotaNotes: info.notes
        });
      }
    });
  }

  // --- Policy Controls ---

  isCloudAIPaused(): boolean {
    return this.config.cloudAIPaused;
  }

  setCloudAIPaused(paused: boolean) {
    this.config.cloudAIPaused = paused;
    this.persist();
  }

  isLocalOnlyMode(): boolean {
    return this.config.localOnlyMode;
  }

  setLocalOnlyMode(enabled: boolean) {
    this.config.localOnlyMode = enabled;
    this.persist();
  }

  isPaidCloudAllowed(): boolean {
    return this.config.paidCloudAllowed;
  }

  setPaidCloudAllowed(allowed: boolean) {
    this.config.paidCloudAllowed = allowed;
    this.persist();
  }

  getConfig(): QuotaConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<QuotaConfig>) {
    this.config = { ...this.config, ...updates };
    this.persist();
  }

  // --- Pre-Route Guard ---

  canRouteToProvider(providerId: AIProviderId, model?: string): { allowed: boolean; reason?: string } {
    const isLocal = providerId === 'mock' || providerId === 'ollama';

    // 1. Cloud AI Pause enforcement
    if (!isLocal && this.config.cloudAIPaused) {
      return {
        allowed: false,
        reason: 'Cloud AI is currently paused by user policy. Route rejected to prevent external requests.'
      };
    }

    // 2. Local-Only Mode enforcement
    if (!isLocal && this.config.localOnlyMode) {
      return {
        allowed: false,
        reason: 'Local-only privacy mode is active. Only on-device and autonomous models are permitted.'
      };
    }

    const targetModel = model || 'default';
    const record = this.getOrCreateRecord(providerId, targetModel);

    // 3. Paid provider blocking (Default strict security rule)
    if (record.costTier === 'potentially_billable' && !this.config.paidCloudAllowed) {
      return {
        allowed: false,
        reason: `Provider ${providerId.toUpperCase()} is classified as potentially billable. Paid cloud APIs are disabled by default (₹0/mo budget). Explicit user approval required.`
      };
    }

    // 4. Rate-limit and cooldown check
    if (record.quotaStatus === 'cooling_down' && record.cooldownUntil) {
      const cooldownTime = new Date(record.cooldownUntil).getTime();
      const now = Date.now();
      if (now < cooldownTime) {
        const remainingSec = Math.ceil((cooldownTime - now) / 1000);
        return {
          allowed: false,
          reason: `${providerId.toUpperCase()} is cooling down after a rate-limit response. Cooldown expires in ${remainingSec}s.`
        };
      } else {
        // Cooldown passed, return to available
        record.quotaStatus = 'available';
        record.cooldownUntil = undefined;
        this.persist();
      }
    }

    return { allowed: true };
  }

  // --- Usage & Event Logging ---

  recordRequestSuccess(
    providerId: AIProviderId,
    model: string,
    tokens?: { prompt: number; completion: number }
  ) {
    const record = this.getOrCreateRecord(providerId, model);
    record.requestsCount += 1;
    if (tokens) {
      record.estimatedTokensPrompt += tokens.prompt || 0;
      record.estimatedTokensCompletion += tokens.completion || 0;
    }
    record.lastUsedTimestamp = new Date().toISOString();
    if (record.quotaStatus === 'cooling_down') {
      record.quotaStatus = 'available';
      record.cooldownUntil = undefined;
    }
    this.persist();
  }

  recordRateLimit(providerId: AIProviderId, model: string, cooldownSeconds: number = 60) {
    const record = this.getOrCreateRecord(providerId, model);
    record.quotaStatus = 'cooling_down';
    const cooldownDate = new Date(Date.now() + cooldownSeconds * 1000);
    record.cooldownUntil = cooldownDate.toISOString();
    console.warn(`[QuotaManager] Provider ${providerId} entered rate-limit cooldown until ${record.cooldownUntil}`);
    this.persist();
  }

  recordError(providerId: AIProviderId, model: string, errorMsg: string) {
    const record = this.getOrCreateRecord(providerId, model);
    if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
      this.recordRateLimit(providerId, model, 60);
    }
  }

  getUsageRecord(providerId: AIProviderId, model: string): ProviderUsageRecord {
    return this.getOrCreateRecord(providerId, model);
  }

  getAllRecords(): ProviderUsageRecord[] {
    return Array.from(this.records.values());
  }

  resetStats(providerId?: AIProviderId) {
    if (providerId) {
      for (const [key, record] of this.records.entries()) {
        if (record.providerId === providerId) {
          record.requestsCount = 0;
          record.estimatedTokensPrompt = 0;
          record.estimatedTokensCompletion = 0;
          record.quotaStatus = providerId === 'mock' || providerId === 'ollama' ? 'available' : 'unknown';
          record.cooldownUntil = undefined;
        }
      }
    } else {
      this.records.clear();
      this.initDefaultRecords();
    }
    this.persist();
  }

  private getOrCreateRecord(providerId: AIProviderId, model: string): ProviderUsageRecord {
    const key = `${providerId}_${model}`;
    if (!this.records.has(key)) {
      const info = this.knownProviderLimits[providerId] || {
        tier: 'potentially_billable',
        notes: 'External cloud model.'
      };
      const newRec: ProviderUsageRecord = {
        providerId,
        model,
        costTier: info.tier,
        requestsCount: 0,
        estimatedTokensPrompt: 0,
        estimatedTokensCompletion: 0,
        quotaStatus: providerId === 'mock' || providerId === 'ollama' ? 'available' : 'unknown',
        quotaNotes: info.notes
      };
      this.records.set(key, newRec);
      this.persist();
      return newRec;
    }
    return this.records.get(key)!;
  }
}

export const quotaManager = new QuotaManager();
