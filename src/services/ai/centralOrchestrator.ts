import {
  ChatMessage,
  ToolDefinition,
  AIProviderId,
  ProviderConfig,
  SpecializedAgentId,
  OrchestratorIntentCategory
} from '../../types';
import { IAIProvider, AIResponse } from './types';
import { aiRouter, RouterOptions } from './aiRouter';
import { companionPersonalityService } from '../personality/companionPersonalityService';
import { gameEngine } from '../games/gameEngine';
import { localModelAdvisor } from './localModelAdvisor';
import { toolRegistry } from '../tools/toolRegistry';
import { memoryDatabase } from '../memory/database';
import { speechService } from '../voice/speechService';

export interface OrchestrationTask {
  id: string;
  userPrompt: string;
  intent: OrchestratorIntentCategory;
  assignedAgent: SpecializedAgentId;
  recursionDepth: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  timestamp: string;
}

export interface OrchestrationResult extends AIResponse {
  intent: OrchestratorIntentCategory;
  assignedAgent: SpecializedAgentId;
  taskSteps: string[];
}


export class CentralOrchestrator {
  private static instance: CentralOrchestrator;
  private currentTasks: OrchestrationTask[] = [];
  private readonly MAX_RECURSION_DEPTH = 3;

  private constructor() {}

  static getInstance(): CentralOrchestrator {
    if (!CentralOrchestrator.instance) {
      CentralOrchestrator.instance = new CentralOrchestrator();
    }
    return CentralOrchestrator.instance;
  }

  /**
   * Classify intent based on semantic markers and companion state
   */
  classifyIntent(userText: string): { intent: OrchestratorIntentCategory; agent: SpecializedAgentId } {
    const lower = userText.toLowerCase().trim();

    // 1. Math / Pure Deterministic Shortcut (numbers, math symbols, calculate)
    if (/^(calculate|solve)\b/i.test(lower) || /^\d+\s*[\+\-\*\/\^%]\s*\d+/.test(lower) || /^what is \d+/i.test(lower)) {
      return { intent: 'deterministic_shortcut', agent: 'diagnostics' };
    }



    // 2. Gaming triggers
    if (
      lower.startsWith('play') ||
      lower.includes('riddle') ||
      lower.includes('trivia') ||
      lower.includes('word game') ||
      lower.includes('would you rather') ||
      lower.includes('guess the number') ||
      lower.includes('start a game')
    ) {
      return { intent: 'gaming', agent: 'gaming' };
    }

    // 3. Voice control & speech commands
    if (
      lower.includes('change voice') ||
      lower.includes('preview voice') ||
      lower.includes('mute voice') ||
      lower.includes('voice settings') ||
      lower.includes('speak faster') ||
      lower.includes('speak slower') ||
      lower.includes('stop talking')
    ) {
      return { intent: 'voice_control', agent: 'voice' };
    }

    // 4. Emotional distress / venting / comfort seeking
    if (
      lower.includes('sad') ||
      lower.includes('crying') ||
      lower.includes('depressed') ||
      lower.includes('heartbroken') ||
      lower.includes('overwhelmed') ||
      lower.includes('panic') ||
      lower.includes('vent') ||
      lower.includes('feel terrible') ||
      lower.includes('lonely') ||
      lower.includes('exhausted') ||
      lower.includes('burned out') ||
      lower.includes('bad day')
    ) {
      return { intent: 'emotional_support', agent: 'companion' };
    }

    // 5. Personal growth / habits / goals
    if (
      lower.includes('habit') ||
      lower.includes('routine') ||
      lower.includes('workout') ||
      lower.includes('goal') ||
      lower.includes('discipline') ||
      lower.includes('progress') ||
      lower.includes('reflection') ||
      lower.includes('productivity')
    ) {
      return { intent: 'personal_growth', agent: 'growth' };
    }

    // 6. System diagnostics & desktop utilities
    if (
      lower.includes('battery') ||
      lower.includes('system info') ||
      lower.includes('system time') ||
      lower.includes('timer') ||
      lower.includes('alarm') ||
      lower.includes('speed test') ||
      lower.includes('network') ||
      lower.includes('weather') ||
      lower.includes('reminder')
    ) {
      return { intent: 'system_utility', agent: 'diagnostics' };
    }

    // 7. Deep research / analysis
    if (
      lower.startsWith('research') ||
      lower.startsWith('deep dive') ||
      lower.includes('analyze this') ||
      lower.includes('comprehensive breakdown') ||
      (userText.length > 300 && lower.includes('compare'))
    ) {
      return { intent: 'research', agent: 'research' };
    }

    // Default: Companion chat (chaotic silly girlfriend banter & companionship)
    return { intent: 'companion_chat', agent: 'companion' };
  }

  /**
   * Dispatch and orchestrate the execution flow across specialized agents
   */
  async dispatch(
    messages: ChatMessage[],
    providers: Map<AIProviderId, IAIProvider>,
    configs: Map<AIProviderId, ProviderConfig>,
    options?: RouterOptions & { recursionDepth?: number }
  ): Promise<OrchestrationResult> {
    const recursionDepth = options?.recursionDepth || 0;
    if (recursionDepth > this.MAX_RECURSION_DEPTH) {
      throw new Error(`Orchestration recursion depth limit (${this.MAX_RECURSION_DEPTH}) exceeded.`);
    }

    const lastMsg = [...messages].reverse().find(m => m.role === 'user')?.content.trim() || '';
    const { intent, agent } = this.classifyIntent(lastMsg);

    const task: OrchestrationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userPrompt: lastMsg,
      intent,
      assignedAgent: agent,
      recursionDepth,
      status: 'running',
      timestamp: new Date().toISOString()
    };
    this.currentTasks.push(task);
    this.notifyActivity(task);

    const taskSteps: string[] = [`Classified intent as "${intent}" -> Assigned to ${agent} agent`];

    try {
      // 1. Direct Voice Control Shortcut
      if (intent === 'voice_control') {
        const result = this.handleVoiceCommand(lastMsg);
        task.status = 'completed';
        task.result = result;
        this.notifyActivity(task);
        return {
          content: result,
          provider: 'mock',
          model: 'offline-voice-controller',
          latencyMs: 5,
          intent,
          assignedAgent: agent,
          taskSteps
        };
      }

      // 2. Direct Gaming Engine Shortcut
      if (intent === 'gaming') {
        const gamingResponse = this.handleGamingInteraction(lastMsg);
        if (gamingResponse) {
          task.status = 'completed';
          task.result = gamingResponse;
          this.notifyActivity(task);
          return {
            content: gamingResponse,
            provider: 'mock',
            model: 'deterministic-game-engine',
            latencyMs: 10,
            intent,
            assignedAgent: agent,
            taskSteps: [...taskSteps, 'Processed turn via local deterministic game engine']
          };
        }
      }

      // 3. System Utility / Deterministic Tool Dispatch
      if (intent === 'system_utility') {
        const utilityResponse = await this.handleSystemUtility(lastMsg);
        if (utilityResponse) {
          task.status = 'completed';
          task.result = utilityResponse;
          this.notifyActivity(task);
          return {
            content: utilityResponse,
            provider: 'mock',
            model: 'deterministic-system-tools',
            latencyMs: 15,
            intent,
            assignedAgent: agent,
            taskSteps: [...taskSteps, 'Executed deterministic local system tool']
          };
        }
      }

      // 4. Emotional Intelligence & Companion State Adjustment
      companionPersonalityService.evaluateEmotionalContext(lastMsg);
      const systemPrompt = companionPersonalityService.buildCompanionPrompt();

      // Filter tools bounded to the agent's role
      const permittedTools = this.getPermittedToolsForAgent(agent);

      // Low-RAM Protection: Run sequentially using localModelAdvisor
      const aiResponse = await localModelAdvisor.runSequentially(async () => {
        return await aiRouter.routeAndGenerate(
          messages,
          systemPrompt,
          providers,
          configs,
          permittedTools,
          options
        );
      });

      task.status = 'completed';
      task.result = aiResponse.content;
      this.notifyActivity(task);

      return {
        ...aiResponse,
        intent,
        assignedAgent: agent,
        taskSteps: [...taskSteps, `Generated response via ${aiResponse.provider} (${aiResponse.model})`]
      };
    } catch (err: any) {
      task.status = 'failed';
      task.error = err.message || 'Unknown error';
      this.notifyActivity(task);

      // Graceful offline companion fallback when no provider is configured
      const fallback = companionPersonalityService.generateOfflineFallback(lastMsg);
      return {
        content: fallback,
        provider: 'mock',
        model: 'deterministic-girlfriend-fallback',
        latencyMs: 1,
        intent,
        assignedAgent: agent,
        taskSteps: [...taskSteps, `Model error handled gracefully: ${err.message || 'offline'}`]
      };
    }
  }

  private handleVoiceCommand(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('stop talking') || lower.includes('shut up') || lower.includes('quiet')) {
      speechService.cancelSpeech();
      return "Got it! Zipping my lips right now! 🤫";
    }
    if (lower.includes('preview voice') || lower.includes('test voice')) {
      speechService.previewVoice();
      return "Speaking the voice preview right now! How do I sound? 💕";
    }
    if (lower.includes('speak faster')) {
      const current = speechService.getSpeechRate();
      speechService.setSpeechRate(Math.min(2.0, current + 0.15));
      return `Speed boosted! I'll talk a little faster now (${speechService.getSpeechRate().toFixed(2)}x)!`;
    }
    if (lower.includes('speak slower')) {
      const current = speechService.getSpeechRate();
      speechService.setSpeechRate(Math.max(0.6, current - 0.15));
      return `Slowed down to ${speechService.getSpeechRate().toFixed(2)}x so every word is crystal clear! ✨`;
    }
    return "Voice controls updated! You can adjust my feminine pitch and speaking rate in the Companion & Voice tab anytime!";
  }

  private handleGamingInteraction(text: string): string | null {
    const lower = text.toLowerCase();
    const active = gameEngine.getActiveSession();

    if (active) {
      // User is answering an active game
      const res = gameEngine.submitTurn(text);
      let reply = res.feedback;
      if (res.session.isComplete) {
        reply += `\n\n🎉 Game complete! Final score: ${res.session.score} points. Type "play riddle" or "play trivia" whenever you want another round!`;
      }
      return reply;
    }

    if (lower.includes('riddle')) {
      const s = gameEngine.startGame('riddle');
      return `🧩 **Cyber-Riddle Time!**\n\n${s.currentPrompt}\n\nType your answer, or ask for a "hint" if your brain is smoking! 😜`;
    }
    if (lower.includes('trivia') || lower.includes('quiz')) {
      const s = gameEngine.startGame('trivia');
      return `🧠 **Cyber-Trivia Challenge!**\n\n${s.currentPrompt}\n\nWhat's your answer? Give it your best shot! 🚀`;
    }
    if (lower.includes('word game') || lower.includes('word guess')) {
      const s = gameEngine.startGame('word_guess');
      return `🔤 **Cipher Word Guess!**\n\n${s.currentPrompt}\n\nGuess a letter or the full word! You have 6 lives! 🕹️`;
    }
    if (lower.includes('number') || lower.includes('guess the number')) {
      const s = gameEngine.startGame('number_guess');
      return `🔢 **Guess My Number!**\n\n${s.currentPrompt}\n\nDrop your guess between 1 and 100! 🎯`;
    }
    if (lower.includes('would you rather')) {
      const s = gameEngine.startGame('would_you_rather');
      return `🤔 **Would You Rather?**\n\n${s.currentPrompt}\n\nWhich one are you picking? Defend your choice! 😂`;
    }

    return null;
  }

  private async handleSystemUtility(text: string): Promise<string | null> {
    const lower = text.toLowerCase();

    // System Time
    if (lower.includes('time') || lower.includes('date') || lower.includes('day is it')) {
      try {
        const res = await toolRegistry.executeTool('get_system_time', {});
        return `⏰ It's currently **${res.human}** (${res.timezone})! Need me to set a timer for you?`;
      } catch {}
    }

    // System Info / Battery
    if (lower.includes('battery') || lower.includes('system info') || lower.includes('specs')) {
      try {
        const res = await toolRegistry.executeTool('get_system_info', {});
        return `💻 **System Diagnostics**:\n- Platform: ${res.platform}\n- Battery: ${res.battery.levelPercent}% (${res.battery.charging ? 'Charging ⚡' : 'On battery 🔋'})\n- Cores: ${res.cores}\n- JS Heap: ${res.heapUsedMB} MB / ${res.heapTotalMB} MB\n- Status: All systems green!`;
      } catch {}
    }

    // Network / Speed check
    if (lower.includes('speed test') || lower.includes('network') || lower.includes('ping') || lower.includes('internet')) {
      try {
        const res = await toolRegistry.executeTool('check_network_speed', {});
        return `🌐 **Network Status**:\n- Connection: ${res.online ? 'Online' : 'Offline'}\n- Latency: ${res.latencyMs} ms\n- Status: ${res.statusMessage}\n*${res.disclosure}*`;
      } catch {}
    }

    // Reminders
    if (lower.includes('remind me') || lower.includes('set reminder')) {
      try {
        const res = await toolRegistry.executeTool('set_reminder', { title: text.replace(/remind me to/i, '').trim(), timeframe: 'in 15 minutes' });
        return `📝 ${res.message}`;
      } catch {}
    }

    return null;
  }

  private getPermittedToolsForAgent(agent: SpecializedAgentId): ToolDefinition[] {
    const all: ToolDefinition[] = toolRegistry.getToolDefinitions();
    switch (agent) {
      case 'diagnostics':
      case 'system_diagnostics_agent':
        return all.filter((t: ToolDefinition) => t.category === 'system' || t.name.includes('network') || t.name.includes('timer'));
      case 'research':
      case 'research_agent':
        return all.filter((t: ToolDefinition) => t.category === 'web' || t.name.includes('search'));
      case 'growth':
      case 'personal_growth_agent':
        return all.filter((t: ToolDefinition) => t.category === 'automation' || t.category === 'system');
      case 'companion':
      case 'companion_agent':
      default:
        // Companion has access to system and automation utilities
        return all.filter((t: ToolDefinition) => t.category === 'system' || t.category === 'automation');
    }
  }



  private notifyActivity(task: OrchestrationTask) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('breakpoint:orchestrator_activity', {
          detail: {
            task,
            activeCount: this.currentTasks.filter(t => t.status === 'running').length
          }
        })
      );
    }
  }

  getActiveTasks(): OrchestrationTask[] {
    return [...this.currentTasks];
  }
}

export const centralOrchestrator = CentralOrchestrator.getInstance();
