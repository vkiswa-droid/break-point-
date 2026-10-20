import React, { useState } from 'react';
import { Wrench, Play, ShieldAlert, CheckCircle2, XCircle, Clock, Database } from 'lucide-react';
import { toolRegistry } from '../../services/tools/toolRegistry';
import { memoryDatabase } from '../../services/memory/database';
import { ToolDefinition, ToolExecutionAudit } from '../../types';

export const ToolsView: React.FC = () => {
  const tools = toolRegistry.getToolDefinitions();
  const [selectedTool, setSelectedTool] = useState<ToolDefinition>(tools[0]);
  const [paramsInput, setParamsInput] = useState('{}');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'registry' | 'audit'>('registry');
  const audits = memoryDatabase.getToolAudits();

  const handleSelectTool = (t: ToolDefinition) => {
    setSelectedTool(t);
    // Build sample JSON template for parameters
    const sample: Record<string, any> = {};
    Object.entries(t.parameters.properties).forEach(([k, prop]: [string, any]) => {
      sample[k] = prop.enum ? prop.enum[0] : prop.type === 'string' ? '' : null;
    });
    setParamsInput(JSON.stringify(sample, null, 2));
    setExecutionResult(null);
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setExecutionResult(null);
    try {
      const parsed = JSON.parse(paramsInput);
      const res = await toolRegistry.executeTool(selectedTool.name, parsed);
      setExecutionResult({ success: true, data: res });
    } catch (err: any) {
      setExecutionResult({ success: false, error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-4 select-none">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-breakpoint-cyan" />
            <h1 className="text-lg font-hud font-bold tracking-wider text-white">
              TYPED COMPUTER TOOL REGISTRY
            </h1>
          </div>
          <p className="text-xs text-breakpoint-textMuted mt-0.5">
            JSON Schema Validation • Least-Privilege Execution • Confirmation Gate • Comprehensive Audit Log
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'registry'
                ? 'bg-cyan-950/70 border border-cyan-500/50 text-cyan-300'
                : 'bg-black/30 text-zinc-400 hover:text-white'
            }`}
          >
            ACTIVE TOOLS ({tools.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'audit'
                ? 'bg-cyan-950/70 border border-cyan-500/50 text-cyan-300'
                : 'bg-black/30 text-zinc-400 hover:text-white'
            }`}
          >
            AUDIT TRAIL ({audits.length})
          </button>
        </div>
      </div>

      {activeTab === 'registry' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tool List Column */}
          <div className="space-y-2">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2 font-bold select-none">
              Registered Tools
            </div>
            {tools.map((t) => (
              <button
                key={t.name}
                onClick={() => handleSelectTool(t)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedTool.name === t.name
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                    : 'bg-black/30 border-breakpoint-panelBorder text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{t.name}</span>
                  {t.requiresConfirmation && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-600/50 text-amber-400">
                      CONFIRM GATE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Tool Inspector and Runner */}
          <div className="col-span-2 space-y-4">
            <div className="hud-panel p-5 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">{selectedTool.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedTool.description}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-black/50 border border-zinc-700 text-cyan-400 uppercase">
                  CATEGORY: {selectedTool.category}
                </span>
              </div>

              {/* JSON Schema Definition */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Input Parameters (JSON):</label>
                <textarea
                  rows={4}
                  value={paramsInput}
                  onChange={(e) => setParamsInput(e.target.value)}
                  className="w-full p-3 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-zinc-400">
                  {selectedTool.requiresConfirmation ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Requires interactive authorization dialog
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Direct verified execution
                    </span>
                  )}
                </div>

                <button
                  onClick={handleExecute}
                  disabled={isRunning}
                  className="px-5 py-2 rounded text-xs font-bold bg-breakpoint-cyan text-black hover:bg-cyan-300 flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)] disabled:opacity-50 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRunning ? 'EXECUTING...' : 'RUN VERIFIED ACTION'}</span>
                </button>
              </div>

              {/* Execution Result Box */}
              {executionResult && (
                <div className="mt-4 p-4 rounded bg-black/70 border border-breakpoint-panelBorder space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">EXECUTION STATUS:</span>
                    <span className={executionResult.success ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {executionResult.success ? 'VERIFIED SUCCESS' : 'FAILED / REJECTED'}
                    </span>
                  </div>
                  <pre className="p-2 rounded bg-black/80 text-[11px] text-zinc-300 overflow-x-auto max-h-48">
                    {JSON.stringify(executionResult.data || executionResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="hud-panel p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3 select-none">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Immutable Execution Ledger</span>
            </span>
            <button
              onClick={() => {
                memoryDatabase.clearToolAudits();
                window.location.reload();
              }}
              className="text-[10px] text-zinc-500 hover:text-red-400"
            >
              CLEAR AUDIT LOGS
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {audits.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No tool executions recorded in this session.
              </div>
            ) : (
              audits.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded bg-black/40 border border-breakpoint-panelBorder text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{a.toolName}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {a.durationMs}ms
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          a.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          a.status === 'denied' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400">
                    Args: {JSON.stringify(a.parameters)}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Timestamp: {new Date(a.executedAt).toLocaleString()} • User Confirmed: {a.confirmedByUser ? 'Yes' : 'No'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
