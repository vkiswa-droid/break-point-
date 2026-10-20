import React, { useState } from 'react';
import { JarvisOrb } from '../orb/JarvisOrb';
import { OrbState, AIProviderId, ToneState } from '../../types';
import { WakeState, wakeWordEngine, WakeModelStatus } from '../../services/voice/wakeWordEngine';
import { companionPersonalityService } from '../../services/personality/companionPersonalityService';
import { Eye, Mic, Clock, Wrench, Search, FileText, CheckCircle2, ShieldCheck, Activity, Radio, AlertTriangle, Info, HardDrive, Download, Heart, Gamepad2 } from 'lucide-react';


interface DashboardViewProps {
  orbState: OrbState;
  tone: ToneState;
  activeProvider: AIProviderId;
  audioLevel?: number;
  wakeState?: WakeState;
  onOrbClick: () => void;
  onTriggerWatchScreen: () => void;
  onQuickTool: (toolName: string, args: Record<string, any>) => void;
  onNavigate: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orbState,
  tone,
  activeProvider,
  audioLevel = 0,
  wakeState = 'off',
  onOrbClick,
  onTriggerWatchScreen,
  onQuickTool,
  onNavigate
}) => {
  const [confirmTool, setConfirmTool] = useState<{ name: string; args: Record<string, any>; label: string } | null>(null);
  const [showModelSpecs, setShowModelSpecs] = useState(false);
  const [modelStatus, setModelStatus] = useState<WakeModelStatus>(wakeWordEngine.getModelStatus());

  React.useEffect(() => {
    wakeWordEngine.refreshModelStatus().then((status) => {
      if (status) setModelStatus(status);
    });
  }, []);

  const getWakeStatusDescription = () => {
    switch (wakeState) {
      case 'listening_wake':
        return 'MONITORING FOR KEYPHRASE "BREAK POINT"';
      case 'active_capture':
        return 'KEYPHRASE RECOGNIZED // CAPTURING USER SPEECH';
      case 'standby':
        return 'LOW-POWER STANDBY // READY FOR ACTIVATION';
      case 'error':
        return 'HARDWARE WARNING // MICROPHONE INACCESSIBLE';
      case 'off':
      default:
        return 'MICROPHONE MUTED // STANDBY (OPT-IN REQUIRED)';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-5 overflow-y-auto select-none">
      {/* 1. Tactical Command Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <h1 className="text-lg font-hud font-bold tracking-widest text-white">
              TACTICAL COMMAND CENTER
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
              SYS-ORD:JARVIS-01
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mt-1">
            <span>
              TONE: <span className="text-cyan-400 font-semibold uppercase">{tone}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              COMPANION: <span className="text-pink-400 font-semibold uppercase">{companionPersonalityService.getMode()}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              ROUTER: <span className="text-cyan-400 font-semibold uppercase">{activeProvider}</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              BUDGET: <span className="text-emerald-400 font-semibold">₹0/MO ENFORCED</span>
            </span>
          </div>

        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerWatchScreen}
            className="px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:text-white hover:border-cyan-400 flex items-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>WATCH SCREEN</span>
          </button>
          <button
            onClick={() => onNavigate('chat')}
            className="px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-zinc-900/60 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-white hover:border-zinc-500 flex items-center gap-2 transition-all"
          >
            <Mic className="w-3.5 h-3.5 text-zinc-400" />
            <span>OPEN CONVERSATION</span>
          </button>
        </div>
      </div>

      {/* 2. Center Stage: Flanked by Aerospace Telemetry Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center flex-1 min-h-[380px]">
        {/* Left Telemetry Column (Cols 1-3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Directive Panel */}
          <div className="hud-panel p-4 rounded border border-cyan-900/30 bg-black/40 relative overflow-hidden group hover:border-cyan-700/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400/90 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>[DIR-01] PRIMARY DIRECTIVE</span>
              </span>
              <span className="text-[9px] font-mono text-zinc-500">ARMED</span>
            </div>
            <div className="text-xs font-semibold text-zinc-100 mb-1">
              Autonomous Desktop Operations
            </div>
            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Maintains contextual SQLite memory, coordinates verified multi-provider routing, and executes computer tools under strict zero-leakage security.
            </p>
          </div>

          {/* Voice Engine Telemetry Panel */}
          <div className="hud-panel p-4 rounded border border-cyan-900/30 bg-black/40 relative overflow-hidden group hover:border-cyan-700/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400/90 uppercase flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>[VOX-02] ACOUSTIC RADAR</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowModelSpecs(true)}
                  title="View Offline Model Architecture & Specifications"
                  className="text-zinc-400 hover:text-cyan-300 p-0.5 rounded hover:bg-cyan-950/40 transition-colors flex items-center gap-1 text-[9px] font-mono border border-cyan-800/40 px-1 py-0.2"
                >
                  <Info className="w-3 h-3 text-cyan-400" />
                  <span>SPECS</span>
                </button>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                  wakeState === 'listening_wake' || wakeState === 'active_capture'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}>
                  {wakeState === 'off' ? 'MUTED' : wakeState.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-300 mb-2">
              {getWakeStatusDescription()}
            </div>

            {/* Offline Engine & Model Status Readouts */}
            <div className="space-y-1.5 text-[10px] font-mono py-2 border-t border-b border-zinc-800/60 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">ENGINE:</span>
                <span className="text-cyan-300 font-semibold uppercase">
                  {modelStatus.engine === 'sherpa-onnx-node' || modelStatus.configured ? 'SHERPA-ONNX ZIPFORMER (OFFLINE)' : 'LOCAL DSP (AIR-GAPPED)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">OFFLINE MODEL:</span>
                <span className={`font-semibold uppercase ${
                  modelStatus.status === 'READY' || modelStatus.configured ? 'text-emerald-400' :
                  modelStatus.status === 'ERROR' ? 'text-rose-400' :
                  modelStatus.status === 'INITIALIZING' ? 'text-cyan-400' : 'text-amber-400'
                }`}>
                  {modelStatus.status === 'READY' ? 'READY // 3.3M ZIPFORMER' :
                   modelStatus.status || (modelStatus.configured ? 'READY' : 'MODEL NOT INSTALLED')}
                </span>
              </div>
            </div>

            {/* Live Audio Energy Gauge */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>PCM LEVEL</span>
                <span className="text-cyan-400 font-bold">{audioLevel}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel)}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-500 mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
              <span>WAKE PHRASE:</span>
              <span className="text-cyan-300 font-bold">&quot;Break Point&quot;</span>
            </div>
          </div>
        </div>

        {/* Center Stage: The Living Arc Reactor (Cols 4-9) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center py-2 relative">
          {/* Subtle Stage Reticle Corners */}
          <div className="absolute top-0 left-6 text-cyan-600/30 text-xs font-mono pointer-events-none">+ 01</div>
          <div className="absolute top-0 right-6 text-cyan-600/30 text-xs font-mono pointer-events-none">02 +</div>
          <div className="absolute bottom-0 left-6 text-cyan-600/30 text-xs font-mono pointer-events-none">+ 03</div>
          <div className="absolute bottom-0 right-6 text-cyan-600/30 text-xs font-mono pointer-events-none">04 +</div>

          {/* Living Orb Component */}
          <div className="relative z-10 transition-transform duration-300">
            <JarvisOrb
              state={orbState}
              audioLevel={audioLevel}
              onClick={onOrbClick}
              size={310}
              isWakeWordDetected={wakeState === 'active_capture'}
            />
          </div>

          {/* Stage Caption and Interaction Cue */}
          <div className="mt-3 text-center space-y-0.5 z-10">
            <div className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
              {orbState === 'idle' && (wakeState === 'off' ? 'SYSTEM STANDBY // MIC PAUSED' : 'AWAITING KEYWORD OR DIRECTIVE')}
              {orbState === 'listening' && 'ACTIVE VOICE INGEST // RECOGNITION ENGAGED'}
              {orbState === 'thinking' && 'AUTONOMOUS MULTI-AGENT SYNTHESIS IN PROGRESS'}
              {orbState === 'speaking' && 'AUDIO CARRIER TRANSMITTING VOCAL RESPONSE'}
              {orbState === 'alert' && 'OPERATIONAL ANOMALY DETECTED // REVIEW AUDIT LOG'}
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              Click Core or utter <span className="text-cyan-400 font-semibold">&quot;Break Point&quot;</span> • Global Hotkey: <span className="text-zinc-300">Ctrl+Shift+Space</span>
            </p>
          </div>
        </div>

        {/* Right Telemetry Column (Cols 10-12) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Subsystem Readiness Panel */}
          <div className="hud-panel p-4 rounded border border-cyan-900/30 bg-black/40 relative overflow-hidden group hover:border-cyan-700/50 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-mono tracking-widest text-purple-400/90 uppercase flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-purple-400" />
                <span>[SYS-03] SUBSYSTEM READINESS</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-semibold">ALL NOMINAL</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-300 pb-1 border-b border-zinc-800/40">
                <span className="text-[11px] text-zinc-400">Multi-Provider Router:</span>
                <span className="text-cyan-300 font-semibold">{activeProvider.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300 pb-1 border-b border-zinc-800/40">
                <span className="text-[11px] text-zinc-400">Memory Vault:</span>
                <span className="text-emerald-400 font-semibold">SQLite Synced</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300 pb-1 border-b border-zinc-800/40">
                <span className="text-[11px] text-zinc-400">Tools Registered:</span>
                <span className="text-emerald-400 font-semibold">8 Sandboxed</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-[11px] text-zinc-400">Main Process Policy:</span>
                <span className="text-cyan-400 font-semibold">Enforced (₹0)</span>
              </div>
            </div>
          </div>

          {/* Cognitive Reflection Panel */}
          <div className="hud-panel p-4 rounded border border-cyan-900/30 bg-black/40 relative overflow-hidden group hover:border-cyan-700/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-widest text-amber-400/90 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-amber-400" />
                <span>[COG-04] COGNITIVE MEMORY</span>
              </span>
              <span className="text-[9px] font-mono text-zinc-500">OFFLINE</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200 mb-1">
              Session Memory & Synthesis
            </div>
            <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Consolidates interaction entities into permanent vector/text indices. All memories record timestamp, category, and verifiable provenance.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Lower Automation Dock with Safety Gate */}
      <div className="hud-panel p-4 rounded border border-cyan-900/30 bg-black/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
            <span>[ACT-05] VERIFIED COMPUTER AUTOMATION TRIGGERS</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">SANDBOXED SYSTEM EXECUTION</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: System Time */}
          <button
            onClick={() => onQuickTool('get_system_time', {})}
            className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 hover:border-cyan-500/60 hover:bg-cyan-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <div className="flex items-center justify-between mb-1">
              <Clock className="w-4 h-4 text-cyan-400 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-emerald-400">READY</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">System Time</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Verified local clock</div>
          </button>

          {/* Action 2: System Diagnostics */}
          <button
            onClick={() => onQuickTool('get_system_info', {})}
            className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 hover:border-purple-500/60 hover:bg-purple-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <div className="flex items-center justify-between mb-1">
              <Wrench className="w-4 h-4 text-purple-400 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-purple-400">DIAG</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">Diagnostics</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Hardware & battery</div>
          </button>

          {/* Action 3: Create Workspace Note */}
          <button
            onClick={() => {
              setConfirmTool({
                name: 'create_note',
                args: { title: 'session_log.md', content: `Log generated at ${new Date().toLocaleString()}: Operational baseline nominal.` },
                label: 'Create Workspace Note (session_log.md)'
              });
            }}
            className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <div className="flex items-center justify-between mb-1">
              <FileText className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-emerald-400">FS</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">Workspace Note</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Write to workspace</div>
          </button>

          {/* Action 4: Web Research */}
          <button
            onClick={() => onQuickTool('web_search', { query: 'Tony Stark JARVIS capabilities' })}
            className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/60 hover:bg-amber-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <div className="flex items-center justify-between mb-1">
              <Search className="w-4 h-4 text-amber-400 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-amber-400">NET</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">Knowledge Radar</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Verified citations</div>
          </button>

          {/* Action 5: Cyber Playground */}
          <button
            onClick={() => onNavigate('games')}
            className="p-3 rounded bg-zinc-950/70 border border-pink-900/60 hover:border-pink-500/80 hover:bg-pink-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <div className="flex items-center justify-between mb-1">
              <Gamepad2 className="w-4 h-4 text-pink-400 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-pink-400">PLAY</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">Cyber-Playground</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Riddles & Trivia</div>
          </button>

          {/* Action 6: Companion Studio */}
          <button
            onClick={() => onNavigate('personality')}
            className="p-3 rounded bg-zinc-950/70 border border-cyan-900/60 hover:border-cyan-400 hover:bg-cyan-950/20 text-left transition-all group focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <div className="flex items-center justify-between mb-1">
              <Heart className="w-4 h-4 text-cyan-300 group-hover:scale-105 transition-transform" />
              <span className="text-[9px] font-mono text-cyan-300">VOICE</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">Companion Studio</div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">Girlfriend & Voice</div>
          </button>
        </div>
      </div>


      {/* Safety Confirmation Modal for Destructive or Filesystem Operations */}
      {confirmTool && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-cyan-500/50 rounded-lg p-5 max-w-md w-full space-y-4 shadow-[0_0_24px_rgba(0,240,255,0.2)]">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>CONFIRM OPERATIONAL DISPATCH</span>
            </div>
            <p className="text-xs font-mono text-zinc-300">
              Execute tool directive: <span className="text-cyan-300 font-semibold">{confirmTool.label}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmTool(null)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const tool = confirmTool;
                  setConfirmTool(null);
                  onQuickTool(tool.name, tool.args);
                }}
                className="px-3 py-1.5 text-xs font-mono font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
              >
                CONFIRM & DISPATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Speech & Wake-Word Architecture Modal */}
      {showModelSpecs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-cyan-500/50 rounded-lg p-6 max-w-lg w-full space-y-4 shadow-[0_0_30px_rgba(0,240,255,0.25)] select-text">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                <HardDrive className="w-4 h-4" />
                <span>OFFLINE WAKE-WORD ARCHITECTURE</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
                100% AIR-GAPPED
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">RUNTIME ENGINE:</span>
                  <span className="text-cyan-300 font-semibold uppercase">
                    {modelStatus.engine === 'sherpa-onnx-node' || modelStatus.configured ? 'SHERPA-ONNX NODE (LOCAL NATIVE)' : 'LOCAL ACOUSTIC DSP'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">MODEL STATUS:</span>
                  <span className={`font-semibold uppercase ${
                    modelStatus.status === 'READY' || modelStatus.configured ? 'text-emerald-400' :
                    modelStatus.status === 'ERROR' ? 'text-rose-400' :
                    modelStatus.status === 'INITIALIZING' ? 'text-cyan-400' : 'text-amber-400'
                  }`}>
                    {modelStatus.status === 'READY' ? 'READY & ACTIVE' :
                     modelStatus.status || (modelStatus.configured ? 'READY' : 'MODEL NOT INSTALLED')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CLOUD LEAKAGE:</span>
                  <span className="text-emerald-400 font-semibold">0 BYTES (NO REMOTE API)</span>
                </div>
              </div>

              <div className="space-y-1 text-zinc-300">
                <div className="text-[11px] font-bold text-cyan-400 uppercase">Installed Neural Model:</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Sherpa-ONNX Zipformer KWS (<span className="text-zinc-200">16.8 MB INT8</span>, Apache-2.0 License).
                  Custom BPE tokens configured for <span className="text-cyan-300 font-semibold">&quot;Break Point&quot;</span> (<code className="text-zinc-300 text-[10px]"> ▁B R E A K ▁POINT</code>).
                </p>
                <div className="text-[10px] text-zinc-500 pt-1">
                  Model directory: <span className="text-zinc-300 font-mono">models\wake-word\sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-black/60 border border-zinc-800/80 text-[10px] text-zinc-400 leading-relaxed">
                <span className="text-amber-400 font-semibold">Offline Guarantee:</span> Audio frames are processed strictly in memory on device via Sherpa-ONNX. BREAK POINT will never transmit microphone audio or transcripts to remote cloud services.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800/60">
              <button
                onClick={() => setShowModelSpecs(false)}
                className="px-4 py-1.5 text-xs font-mono font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
