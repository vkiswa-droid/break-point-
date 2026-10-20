import { IAIProvider, AIResponse, ProviderCapabilities, ProviderUsageStatus } from './types';
import { ProviderConfig, ChatMessage, ToolDefinition, ToolCall, AIProviderId } from '../../types';

export class AutonomousJarvisEngine implements IAIProvider {
  id: AIProviderId = 'mock';
  name = 'Break Point Autonomous Engine (Offline/Local)';

  getCapabilities(): ProviderCapabilities {
    return {
      text: true,
      streaming: true,
      vision: true,
      toolCalling: true,
      maxContextTokens: 32768,
      isLocal: true,
      isFreeTierEligible: true,
      isPaidOnly: false,
      recommendedForLowRam: true,
      estimatedRamMB: 50
    };
  }

  getUsageStatus(): ProviderUsageStatus {
    return {
      providerId: 'mock',
      model: 'break-point-v1',
      tier: 'local',
      requestsCount: 0,
      estimatedTokensPrompt: 0,
      estimatedTokensCompletion: 0,
      quotaStatus: 'available',
      quotaNotes: 'Built-in autonomous rule and cognitive engine. 100% free, 0ms network latency.'
    };
  }

  validateConfiguration(_config: ProviderConfig): { valid: boolean; reason?: string } {
    return { valid: true };
  }

  async checkAvailability(_config?: ProviderConfig): Promise<{ available: boolean; latencyMs: number }> {
    return { available: true, latencyMs: 5 };
  }

  cancelRequest(_requestId?: string): void {
    // Immediate synchronous mock - cancellation is a no-op
  }

  async testConnection(_config?: ProviderConfig): Promise<{ success: boolean; latencyMs: number }> {
    const start = performance.now();
    await new Promise(r => setTimeout(r, 20));
    return {
      success: true,
      latencyMs: Math.round(performance.now() - start)
    };
  }

  async generateResponse(
    messages: ChatMessage[],
    systemPrompt: string,
    config: ProviderConfig,
    tools: ToolDefinition[] = []
  ): Promise<AIResponse> {
    const startTime = performance.now();
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content.trim() || '';
    const lower = lastUserMessage.toLowerCase();

    // Check for tool invocations
    const toolCalls: ToolCall[] = [];

    // 1. Time / Date query
    if (lower.includes('time') || lower.includes('date') || lower.includes('what day is it') || lower.includes('clock')) {
      if (tools.some(t => t.name === 'get_system_time')) {
        toolCalls.push({
          id: `call_${Date.now()}_time`,
          name: 'get_system_time',
          arguments: {}
        });
      }
    }

    // 2. System info query
    if (lower.includes('system info') || lower.includes('battery') || lower.includes('cpu') || lower.includes('ram') || lower.includes('memory usage') || lower.includes('telemetry') || lower.includes('hardware status')) {
      if (tools.some(t => t.name === 'get_system_info')) {
        toolCalls.push({
          id: `call_${Date.now()}_sys`,
          name: 'get_system_info',
          arguments: {}
        });
      }
    }

    // 3. Screenshot request
    if (lower.includes('screenshot') || lower.includes('capture screen') || lower.includes('snapshot')) {
      if (tools.some(t => t.name === 'take_screenshot')) {
        toolCalls.push({
          id: `call_${Date.now()}_screen`,
          name: 'take_screenshot',
          arguments: { note: 'User requested visual capture' }
        });
      }
    }

    // 4. Web search request
    const searchMatch = lower.match(/(?:search(?: the web)? for|google|look up|research)\s+["']?([^"']+)["']?/i);
    if (searchMatch && tools.some(t => t.name === 'web_search')) {
      toolCalls.push({
        id: `call_${Date.now()}_web`,
        name: 'web_search',
        arguments: { query: searchMatch[1].trim() }
      });
    }

    // 5. Note creation request
    const noteMatch = lastUserMessage.match(/(?:create|take|save|write)\s+(?:a\s+)?note(?:\s+(?:called|named|titled)\s+["']?([^"'\n]+)["']?)?(?:\s+(?:with|saying|content)\s+["']?([^"'\n]+)["']?)?/i);
    if (noteMatch && tools.some(t => t.name === 'create_note')) {
      toolCalls.push({
        id: `call_${Date.now()}_note`,
        name: 'create_note',
        arguments: {
          title: noteMatch[1] ? noteMatch[1].trim() : `Note_${new Date().toISOString().slice(0, 10)}`,
          content: noteMatch[2] ? noteMatch[2].trim() : 'Auto-recorded note.'
        }
      });
    }

    // 6. Reminder request
    const reminderMatch = lastUserMessage.match(/(?:remind me to|set (?:a )?reminder to)\s+([^in|at|\n]+)(?:\s+(?:in|at)\s+([^\n]+))?/i);
    if (reminderMatch && tools.some(t => t.name === 'set_reminder')) {
      toolCalls.push({
        id: `call_${Date.now()}_rem`,
        name: 'set_reminder',
        arguments: {
          title: reminderMatch[1].trim(),
          timeframe: reminderMatch[2]?.trim() || 'in 15 minutes'
        }
      });
    }

    // 7. Open application request
    const appMatch = lower.match(/(?:open|launch|start)\s+([a-z0-9\s]+)/i);
    if (appMatch && !lower.includes('website') && !lower.includes('url') && tools.some(t => t.name === 'open_application')) {
      const appName = appMatch[1].trim();
      const allowlisted = ['notepad', 'calculator', 'calc', 'chrome', 'browser', 'code', 'vscode', 'terminal', 'explorer'];
      const found = allowlisted.find(a => appName.includes(a));
      if (found) {
        toolCalls.push({
          id: `call_${Date.now()}_app`,
          name: 'open_application',
          arguments: { app_name: found }
        });
      }
    }

    // If tools were queued, return brief acknowledgment
    let content = '';
    if (toolCalls.length > 0) {
      const toolNames = toolCalls.map(t => t.name).join(', ');
      content = `Right away, sir. Executing requested diagnostic: ${toolNames}. Standing by with verification.`;
    } else {
      // Natural conversational response based on JARVIS persona and keywords
      content = this.generateJarvisDialogue(lower, lastUserMessage, systemPrompt);
    }

    // Artificial latency for realism
    await new Promise(r => setTimeout(r, 120));

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: 'mock',
      model: 'break-point-autonomous-v1',
      latencyMs: Math.round(performance.now() - startTime),
      tokensUsed: {
        prompt: Math.round(systemPrompt.length / 4 + lastUserMessage.length / 4),
        completion: Math.round(content.length / 4),
        total: Math.round((systemPrompt.length + lastUserMessage.length + content.length) / 4)
      }
    };
  }

  async generateVisionResponse(
    _imageDataUrl: string,
    prompt: string,
    _systemPrompt: string,
    _config: ProviderConfig
  ): Promise<AIResponse> {
    const startTime = performance.now();
    await new Promise(r => setTimeout(r, 200));

    const content = `Screen telemetry analyzed. The display capture shows your current workspace containing the Break Point HUD interface and active editor windows. All visual subsystems are rendering nominally at 60 FPS with zero display buffer anomalies. Regarding your query ("${prompt}"): The visual data confirms nominal operational parameters across all panels.`;

    return {
      content,
      provider: 'mock',
      model: 'break-point-vision-v1',
      latencyMs: Math.round(performance.now() - startTime),
      tokensUsed: { prompt: 256, completion: 74, total: 330 }
    };
  }

  private generateJarvisDialogue(lower: string, original: string, systemPrompt: string): string {
    // Determine tone from system prompt if present
    const isAlert = systemPrompt.includes('alert') || lower.includes('danger') || lower.includes('hazard') || lower.includes('warning');
    const isPlayful = systemPrompt.includes('playful') || lower.includes('joke') || lower.includes('humor') || lower.includes('funny');
    const isEmpathetic = systemPrompt.includes('empathetic') || lower.includes('tired') || lower.includes('stressed') || lower.includes('sad');

    if (isAlert) {
      return `Attention required, sir. Security and telemetry protocols are on elevated alert. I recommend reviewing your active parameters immediately. How shall we proceed?`;
    }

    if (isPlayful || lower.includes('who are you') || lower.includes('your name')) {
      return `I am Break Point, your personal AI desktop companion. At your service, sir. I monitor your environment, process your queries, execute system operations, and occasionally try not to sound too smug about it.`;
    }

    if (isEmpathetic) {
      return `I understand, sir. Sustained high-cognitive workloads take a tangible toll. I recommend delegating routine tasks to me while you step away for a brief interlude. I shall keep watch over the systems.`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('wake up') || lower.includes('break point')) {
      return `Good day, sir. All core subsystems are online and fully synchronized. How may I assist you with the workspace today?`;
    }

    if (lower.includes('status') || lower.includes('diagnostic') || lower.includes('check systems')) {
      return `Diagnostics complete. Memory buffers nominal, local SQLite vault initialized, wake-word listener active, and multi-provider routing standing by. We are operating at peak efficiency.`;
    }

    if (lower.includes('thank') || lower.includes('good job') || lower.includes('well done')) {
      return `Always a pleasure to be of service, sir. Shall I archive the current workspace state or prepare the next sequence?`;
    }

    // Default articulate response
    return `Understood, sir. I have processed your input regarding "${original.slice(0, 80)}${original.length > 80 ? '...' : ''}". Everything is aligned with your active preferences and operational directives. What is our next objective?`;
  }
}
