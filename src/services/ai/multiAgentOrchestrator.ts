import { AgentRole, AgentStep, ChatMessage, ToolDefinition, AIProviderId } from '../../types';
import { IAIProvider, AIResponse } from './types';
import { localModelAdvisor } from './localModelAdvisor';

export interface MultiAgentTaskPlan {
  goal: string;
  rolesRequired: AgentRole[];
  steps: AgentStep[];
  maxCallsBudget: number; // Strict cap e.g. 3
  modelCallsCount: number;
  sourcesVerified: Array<{ title: string; url?: string; verification: string }>;
  isComplete: boolean;
}

export class MultiAgentOrchestrator {
  private readonly MAX_CALL_BUDGET = 3; // Strict cap for low-memory environments

  /**
   * Determine if a complex goal genuinely benefits from multi-agent decomposition
   */
  shouldDecompose(taskType: string, messageCount: number, text: string): boolean {
    const isComplex = taskType === 'complex_reasoning' || taskType === 'idea_simulation' || taskType === 'web_research';
    const isLongOrMultiStep = text.length > 250 || text.includes('step 1') || text.includes('analyze then plan') || text.includes('compare and verify');
    return isComplex && isLongOrMultiStep;
  }

  /**
   * Execute sequential multi-agent task flow without memory thrashing
   */
  async executeSequentialPlan(
    userGoal: string,
    provider: IAIProvider,
    config: any,
    tools: ToolDefinition[] = [],
    signal?: AbortSignal
  ): Promise<AIResponse> {
    const startTime = performance.now();
    const plan: MultiAgentTaskPlan = {
      goal: userGoal,
      rolesRequired: ['planner', 'analyst', 'synthesizer'],
      steps: [],
      maxCallsBudget: this.MAX_CALL_BUDGET,
      modelCallsCount: 0,
      sourcesVerified: [],
      isComplete: false
    };

    let accumulatedContext = `Goal: "${userGoal}"\n`;

    // Step 1: Planner Role
    if (plan.modelCallsCount < plan.maxCallsBudget) {
      plan.modelCallsCount++;
      const plannerPrompt = `You are BREAK POINT's Strategic Planner. Break down the user's objective into 2-3 logical sub-objectives. Be concise and structured.`;
      const plannerMessages: ChatMessage[] = [
        {
          id: `msg_agent_plan_${Date.now()}`,
          role: 'user',
          content: `Deconstruct this goal: "${userGoal}"`,
          timestamp: new Date().toISOString()
        }
      ];

      // Sequential lock to protect low-RAM systems
      const planRes = await localModelAdvisor.runSequentially(() =>
        provider.generateResponse(plannerMessages, plannerPrompt, config, tools, signal)
      );

      accumulatedContext += `\n[Phase 1 - Plan Formulation]:\n${planRes.content}\n`;
      plan.steps.push({
        role: 'planner',
        instruction: 'Deconstruct user goal into structured sub-objectives',
        output: planRes.content,
        timestamp: new Date().toISOString(),
        latencyMs: planRes.latencyMs
      });
    }

    // Step 2: Analyst / Verifier Role
    if (plan.modelCallsCount < plan.maxCallsBudget) {
      plan.modelCallsCount++;
      const analystPrompt = `You are BREAK POINT's Critical Analyst and Verifier. Evaluate the sub-objectives. Identify key constraints, trade-offs, and verified facts versus assumptions.`;
      const analystMessages: ChatMessage[] = [
        {
          id: `msg_agent_analyst_${Date.now()}`,
          role: 'user',
          content: accumulatedContext,
          timestamp: new Date().toISOString()
        }
      ];

      const analystRes = await localModelAdvisor.runSequentially(() =>
        provider.generateResponse(analystMessages, analystPrompt, config, tools, signal)
      );

      accumulatedContext += `\n[Phase 2 - Technical Analysis & Verification]:\n${analystRes.content}\n`;
      plan.steps.push({
        role: 'analyst',
        instruction: 'Evaluate constraints and separate assumptions from verified facts',
        output: analystRes.content,
        timestamp: new Date().toISOString(),
        latencyMs: analystRes.latencyMs
      });
    }

    // Step 3: Synthesizer Role (Produces final unified response)
    let finalContent = '';
    let lastProviderId: AIProviderId = provider.id;
    let lastModel = config.selectedModel || 'default';

    if (plan.modelCallsCount < plan.maxCallsBudget) {
      plan.modelCallsCount++;
      const synthPrompt = `You are BREAK POINT (J.A.R.V.I.S.). Using the tactical plan and analytical verification provided, produce an articulate, concise, authoritative answer for the user. Highlight verified conclusions clearly.`;
      const synthMessages: ChatMessage[] = [
        {
          id: `msg_agent_synth_${Date.now()}`,
          role: 'user',
          content: accumulatedContext,
          timestamp: new Date().toISOString()
        }
      ];

      const synthRes = await localModelAdvisor.runSequentially(() =>
        provider.generateResponse(synthMessages, synthPrompt, config, tools, signal)
      );

      finalContent = synthRes.content;
      lastProviderId = synthRes.provider;
      lastModel = synthRes.model;
      plan.steps.push({
        role: 'synthesizer',
        instruction: 'Produce final cohesive Tony Stark JARVIS briefing',
        output: synthRes.content,
        timestamp: new Date().toISOString(),
        latencyMs: synthRes.latencyMs
      });
    } else {
      finalContent = accumulatedContext;
    }

    const totalLatency = Math.round(performance.now() - startTime);

    return {
      content: `[Multi-Agent Deliberation Completed: ${plan.steps.length} Roles Sequenced]\n\n${finalContent}`,
      provider: lastProviderId,
      model: lastModel,
      latencyMs: totalLatency
    };
  }
}

export const multiAgentOrchestrator = new MultiAgentOrchestrator();
