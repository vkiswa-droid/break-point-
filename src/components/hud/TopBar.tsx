import React, { useEffect, useState } from 'react';
import { Shield, Mic, MicOff, Power, Activity, Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { WakeState } from '../../services/voice/wakeWordEngine';
import { AIProviderId } from '../../types';

interface TopBarProps {
  wakeState: WakeState;
  activeProvider: AIProviderId;
  isOnline: boolean;
  onToggleMic: () => void;
  onKillSwitch: () => void;
}

interface HardwareInfo {
  totalMemMB: number;
  freeMemMB: number;
  cpuCores: number;
  isLowRam: boolean;
  platform?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  wakeState,
  activeProvider,
  isOnline,
  onToggleMic,
  onKillSwitch
}) => {
  const [hwInfo, setHwInfo] = useState<HardwareInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).breakPointDesktopAPI?.getHardwareInfo) {
      (window as any).breakPointDesktopAPI.getHardwareInfo()
        .then((info: HardwareInfo) => setHwInfo(info))
        .catch(() => {});
    }
  }, []);

  const getWakeBadge = () => {
    switch (wakeState) {
      case 'listening_wake':
        return {
          text: 'LISTENING',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
          borderClass: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
        };
      case 'active_capture':
        return {
          text: 'CAPTURING',
          dotClass: 'bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-ping',
          borderClass: 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200'
        };
      case 'standby':
        return {
          text: 'STANDBY',
          dotClass: 'bg-teal-400',
          borderClass: 'border-teal-800/40 bg-teal-950/30 text-teal-300'
        };
      case 'error':
        return {
          text: 'MIC ERROR',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
          borderClass: 'border-amber-600/40 bg-amber-950/40 text-amber-300'
        };
      case 'off':
      default:
        return {
          text: 'MIC MUTED',
          dotClass: 'bg-zinc-600',
          borderClass: 'border-zinc-800 bg-zinc-900/60 text-zinc-400'
        };
    }
  };

  const wakeBadge = getWakeBadge();

  return (
    <header className="h-14 border-b border-cyan-900/30 bg-[#060b18]/90 backdrop-blur-md px-5 flex items-center justify-between select-none relative z-30">
      {/* 1. Identity & Wake Keyword Telemetry */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse" />
          <span className="font-hud font-bold tracking-widest text-base text-white">
            BREAK <span className="text-cyan-400">POINT</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300">
            v1.0-JARVIS
          </span>
        </div>

        <div className="h-4 w-[1px] bg-cyan-900/40" />

        {/* Wake-Word Badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500 text-[11px]">WAKE:</span>
          <span className="px-2 py-0.5 rounded bg-black/50 border border-cyan-900/40 text-cyan-300 font-semibold text-[11px]">
            &quot;Break Point&quot;
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1.5 ${wakeBadge.borderClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wakeBadge.dotClass}`} />
            <span>{wakeBadge.text}</span>
          </span>
        </div>
      </div>

      {/* 2. Honest Live Telemetry Metrics */}
      <div className="hidden lg:flex items-center gap-5 text-xs font-mono text-zinc-400">
        {/* CPU Telemetry */}
        <div className="flex items-center gap-1.5" title="Physical CPU Cores">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>CPU: {hwInfo ? `${hwInfo.cpuCores}-CORE` : 'LOCAL CORES'} NOMINAL</span>
        </div>

        {/* RAM Telemetry */}
        <div className="flex items-center gap-1.5" title="Real Windows System Memory">
          <HardDrive className="w-3.5 h-3.5 text-teal-400" />
          <span>
            RAM: {hwInfo ? `${Math.round(hwInfo.freeMemMB / 1024 * 10) / 10}G FREE / ${Math.round(hwInfo.totalMemMB / 1024 * 10) / 10}G` : '7.3G PROFILE'}
          </span>
        </div>

        {/* Active AI Router Provider */}
        <div className="flex items-center gap-1.5" title="Active AI Routing Provider">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="uppercase text-zinc-300">
            ROUTER: <span className="text-cyan-400 font-semibold">{activeProvider}</span>
          </span>
        </div>
      </div>

      {/* 3. Controls, Audio Opt-In & Emergency Kill Switch */}
      <div className="flex items-center gap-3">
        {/* Microphone Toggle (Opt-In / Immediate Stop) */}
        <button
          onClick={onToggleMic}
          title={wakeState === 'off' ? 'Enable Microphone & Wake-Word Listening (Opt-in)' : 'Stop Microphone Capture Immediately'}
          className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-mono border transition-all ${
            wakeState === 'off' || wakeState === 'error'
              ? 'bg-zinc-900/70 border-zinc-700/80 text-zinc-400 hover:text-white hover:border-zinc-500'
              : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)] hover:bg-emerald-900/50'
          }`}
        >
          {wakeState === 'off' || wakeState === 'error' ? (
            <MicOff className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          )}
          <span>{wakeState === 'off' || wakeState === 'error' ? 'MIC OFF' : 'MIC ACTIVE'}</span>
        </button>

        {/* Real Network Telemetry */}
        <div
          className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded bg-black/40 border border-cyan-900/30"
          title={isOnline ? 'Network Connection Available' : 'No Internet - Operating Locally (₹0 Policy)'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-zinc-300">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] text-amber-300">LOCAL ONLY</span>
            </>
          )}
        </div>

        {/* Emergency Kill Switch */}
        <button
          onClick={onKillSwitch}
          title="Emergency Kill Switch: Aborts active voice synthesis, AI reasoning, and tool execution immediately"
          className="px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-mono bg-red-950/50 border border-red-600/50 text-red-400 hover:bg-red-900/60 hover:text-white transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <Power className="w-3.5 h-3.5" />
          <span className="font-bold">KILL SWITCH</span>
        </button>
      </div>
    </header>
  );
};
