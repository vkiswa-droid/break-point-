export type ToneState = 
  | 'calm' 
  | 'friendly' 
  | 'empathetic' 
  | 'excited' 
  | 'curious' 
  | 'playful' 
  | 'focused' 
  | 'alert';

export type OrbState = 
  | 'idle' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'alert';

export type AIProviderId = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'groq' 
  | 'ollama' 
  | 'mock';

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
  selectedModel: string;
  availableModels: string[];
  capabilities: {
    text: boolean;
    streaming: boolean;
    vision: boolean;
    toolCalling: boolean;
  };
  latencyMs?: number;
  lastTested?: string;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  errorMessage?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tone?: ToneState;
  timestamp: string;
  toolCalls?: ToolCall[];
  providerUsed?: AIProviderId;
  latencyMs?: number;
  audioGenerated?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type MemoryCategory = 
  | 'fact' 
  | 'preference' 
  | 'context' 
  | 'goal' 
  | 'decision';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  provenance: string;
  confidence: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  verifiedByUser?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'system' | 'files' | 'automation' | 'web' | 'vision';
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    }>;
    required: string[];
  };
  requiresConfirmation: boolean;
  permissionKey?: string;
}

export interface ToolExecutionAudit {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  result: any;
  status: 'success' | 'failed' | 'denied' | 'pending_confirmation';
  executedAt: string;
  confirmedByUser: boolean;
  durationMs: number;
}

export interface Reminder {
  id: string;
  title: string;
  dueAt: string;
  recurrence?: 'none' | 'daily' | 'weekly';
  status: 'pending' | 'completed' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  query: string;
  summary: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  savedAt: string;
}

export interface PersonalityConfig {
  humor: number;
  verbosity: 'concise' | 'balanced' | 'elaborate';
  formality: 'formal' | 'casual';
  proactivity: 'low' | 'medium' | 'high';
  currentTone: ToneState;
}

export interface VoiceConfig {
  wakePhrase: string;
  sensitivity: number;
  selectedMicrophoneId?: string;
  selectedVoiceName?: string;
  speechRate: number;
  pitch: number;
  listeningMode: 'push_to_talk' | 'continuous' | 'wake_word_only';
  autoSpeak: boolean;
  bargeInEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface SecurityConfig {
  allowlistedDirs: string[];
  allowlistedApps: string[];
  requireConfirmationForDestructive: boolean;
  autoLaunchAtLogin: boolean;
  micPermissionGranted: boolean;
  screenPermissionGranted: boolean;
  offlineModeOnly: boolean;
}

export interface SystemTelemetry {
  cpuUsage: number;
  memoryUsage: number;
  freeMemoryMB: number;
  totalMemoryMB: number;
  platform: string;
  uptimeSeconds: number;
  isOnline: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  activeMic: boolean;
  activeVision: boolean;
  isLowRam?: boolean;
}

export type TaskType = 
  | 'simple_command' 
  | 'calculation' 
  | 'casual_conversation' 
  | 'complex_reasoning' 
  | 'coding' 
  | 'document_analysis' 
  | 'web_research' 
  | 'stock_market' 
  | 'voice_interaction' 
  | 'idea_simulation';

export type PrivacyLevel = 'public' | 'personal' | 'sensitive' | 'secret_bearing';

export type RoutingMode = 'auto' | 'local_only' | 'free_cloud_preferred' | 'offline_autonomous';

export type QuotaStatus = 'available' | 'limited' | 'cooling_down' | 'unknown' | 'unavailable';

export type ProviderCostTier = 'local' | 'free_tier' | 'potentially_billable';

export type AgentRole = 'planner' | 'researcher' | 'analyst' | 'verifier' | 'synthesizer';

export interface AgentStep {
  role: AgentRole;
  instruction: string;
  output?: string;
  timestamp: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface ProviderUsageRecord {
  providerId: AIProviderId;
  model: string;
  costTier: ProviderCostTier;
  requestsCount: number;
  estimatedTokensPrompt: number;
  estimatedTokensCompletion: number;
  lastUsedTimestamp?: string;
  quotaStatus: QuotaStatus;
  cooldownUntil?: string;
  quotaNotes: string;
}

export interface RoutingDecision {
  taskType: TaskType;
  privacyLevel: PrivacyLevel;
  selectedProvider: AIProviderId;
  selectedModel: string;
  costTier: ProviderCostTier;
  routingMode: RoutingMode;
  reason: string;
  isFallback: boolean;
  fallbackChain?: AIProviderId[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Companion, Emotional Intelligence & Gaming Types
// ---------------------------------------------------------------------------

export type CompanionMode = 
  | 'girlfriend' 
  | 'comfort' 
  | 'chaos' 
  | 'growth' 
  | 'gaming' 
  | 'focus';

export type PersonalityState = 
  | 'CHAOTIC_PLAYFUL' 
  | 'AFFECTIONATE' 
  | 'ACTIVE_LISTENING' 
  | 'COMFORTING' 
  | 'MOTIVATING' 
  | 'CURIOUS' 
  | 'GAMING' 
  | 'FOCUSED' 
  | 'SLEEPY_NIGHT_CHAT' 
  | 'QUIET';

export interface CompanionConfig {
  name: string;
  mode: CompanionMode;
  state: PersonalityState;
  intensity: number; // 1 to 100
  voiceFemininePreference: boolean;
  initiativeEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "08:00"
  checkInFrequencyHours: number; // e.g. 2, 4, 8
  pausedUntil?: string; // ISO timestamp
  userNickname?: string;
  companionNickname?: string;
}

export type GameType = 
  | 'riddles' 
  | 'riddle'
  | 'trivia' 
  | 'word_guess' 
  | 'guess_number' 
  | 'number_guess'
  | 'would_you_rather';

export interface GameSession {
  id: string;
  type: GameType;
  title: string;
  status: 'idle' | 'playing' | 'won' | 'lost' | 'paused';
  score: number;
  streak: number;
  turnCount: number;
  turns?: number;
  currentRound: number;
  maxRounds: number;
  difficulty: 'easy' | 'medium' | 'chaotic';
  data: any;
  companionMessage?: string;
  currentPrompt?: string;
  isComplete?: boolean;
  history: Array<{ round: number; prompt: string; userGuess: string; correct: boolean; companionReaction: string }>;
}

export type SpecializedAgentId = 
  | 'companion'
  | 'companion_agent' 
  | 'emotional_support_agent' 
  | 'growth'
  | 'personal_growth_agent' 
  | 'gaming'
  | 'gaming_agent' 
  | 'research'
  | 'research_agent' 
  | 'voice'
  | 'voice_controller' 
  | 'diagnostics'
  | 'system_diagnostics_agent';

export type OrchestratorIntentCategory = 
  | 'companion_chat' 
  | 'emotional_support' 
  | 'personal_growth' 
  | 'gaming' 
  | 'research' 
  | 'system_utility' 
  | 'voice_control' 
  | 'deterministic_shortcut';

export type OrchestratorIntent = OrchestratorIntentCategory | {
  category: OrchestratorIntentCategory;
  confidence: number;
  targetAgent: SpecializedAgentId;
  needsConfirmation: boolean;
  isLocalOnly: boolean;
  extractedEntities?: Record<string, any>;
};


declare global {
  interface Window {
    breakPointDesktopAPI?: {
      bringToForeground: () => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;
      launchApp: (command: string) => Promise<{ launched: string }>;
      captureDesktop: () => Promise<string>;
      setLoginItem: (enabled: boolean) => Promise<boolean>;
      getHardwareInfo: () => Promise<{
        totalMemMB: number;
        freeMemMB: number;
        cpuCores: number;
        isLowRam: boolean;
        platform: string;
        arch: string;
      }>;
      getCredentialStatus: () => Promise<{
        secureStorageAvailable: boolean;
        providers: Record<string, {
          configured: boolean;
          masked: string;
          isEncrypted: boolean;
          updatedAt: string | null;
        }>;
      }>;
      storeCredential: (providerId: string, apiKey: string) => Promise<{ success: boolean; masked: string }>;
      deleteCredential: (providerId: string) => Promise<boolean>;
      proxyAIRequest: (payload: {
        providerId: AIProviderId;
        model: string;
        messages?: ChatMessage[];
        systemPrompt?: string;
        isVision?: boolean;
        imageDataUrl?: string;
        prompt?: string;
        paidAllowed: boolean;
        cloudPaused: boolean;
      }) => Promise<any>;
      testCloudConnection: (providerId: string, paidAllowed?: boolean) => Promise<{ success: boolean; latencyMs: number; error?: string }>;
      getSecurityPolicy: () => Promise<{
        paidCloudAllowed: boolean;
        cloudPaused: boolean;
        localOnlyMode: boolean;
        budgetPolicy: string;
        billableProvidersLocked: boolean;
      }>;
      setPaidPermission: (allowed: boolean, confirmationKey?: string) => Promise<boolean>;
      setCloudPaused: (paused: boolean) => Promise<boolean>;
      setLocalOnly: (localOnly: boolean) => Promise<boolean>;
      onWakeTriggered: (callback: () => void) => void;
    };
  }
}

