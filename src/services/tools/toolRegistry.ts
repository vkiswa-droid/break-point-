import { ToolDefinition, ToolExecutionAudit } from '../../types';
import { memoryDatabase } from '../memory/database';

export interface ToolExecutionContext {
  confirmedByUser?: boolean;
}

export type ToolHandler = (args: Record<string, any>, context: ToolExecutionContext) => Promise<any>;

export class ToolRegistry {
  private tools: Map<string, { definition: ToolDefinition; handler: ToolHandler }> = new Map();
  private pendingConfirmations: Map<string, {
    toolName: string;
    args: Record<string, any>;
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }> = new Map();

  registerTool(definition: ToolDefinition, handler: ToolHandler) {
    this.tools.set(definition.name, { definition, handler });
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  getPendingConfirmations() {
    return Array.from(this.pendingConfirmations.entries()).map(([id, item]) => ({
      id,
      toolName: item.toolName,
      args: item.args
    }));
  }

  resolveConfirmation(id: string, confirmed: boolean) {
    const item = this.pendingConfirmations.get(id);
    if (!item) return;
    this.pendingConfirmations.delete(id);
    if (confirmed) {
      this.executeTool(item.toolName, item.args, { confirmedByUser: true })
        .then(item.resolve)
        .catch(item.reject);
    } else {
      memoryDatabase.logToolExecution({
        toolName: item.toolName,
        parameters: item.args,
        result: { error: 'Operation denied by user.' },
        status: 'denied',
        executedAt: new Date().toISOString(),
        confirmedByUser: false,
        durationMs: 0
      });
      item.reject(new Error('User declined confirmation for tool execution.'));
    }
  }

  async executeTool(name: string, args: Record<string, any>, context: ToolExecutionContext = {}): Promise<any> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Tool "${name}" is not registered in Break Point registry.`);
    }

    const { definition, handler } = entry;

    // Validate required parameters
    for (const requiredParam of definition.parameters.required) {
      if (args[requiredParam] === undefined || args[requiredParam] === null) {
        throw new Error(`Missing required argument "${requiredParam}" for tool "${name}".`);
      }
    }

    // Require confirmation for destructive or security-sensitive actions
    if (definition.requiresConfirmation && !context.confirmedByUser) {
      return new Promise((resolve, reject) => {
        const confirmId = `conf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this.pendingConfirmations.set(confirmId, { toolName: name, args, resolve, reject });

        // Dispatch window event so HUD modal can present confirmation
        window.dispatchEvent(new CustomEvent('breakpoint:tool_confirmation_required', {
          detail: { id: confirmId, toolName: name, args, description: definition.description }
        }));
      });
    }

    const start = performance.now();
    try {
      const result = await handler(args, context);
      const durationMs = Math.round(performance.now() - start);

      memoryDatabase.logToolExecution({
        toolName: name,
        parameters: args,
        result,
        status: 'success',
        executedAt: new Date().toISOString(),
        confirmedByUser: !!context.confirmedByUser,
        durationMs
      });

      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      memoryDatabase.logToolExecution({
        toolName: name,
        parameters: args,
        result: { error: err.message },
        status: 'failed',
        executedAt: new Date().toISOString(),
        confirmedByUser: !!context.confirmedByUser,
        durationMs
      });
      throw err;
    }
  }
}

export const toolRegistry = new ToolRegistry();
