import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  PauseCircle,
  PlayCircle,
  Server,
  HardDrive,
  Activity,
  Terminal,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { providerManager } from '../../services/ai/providerManager';
import { quotaManager } from '../../services/ai/quotaManager';
import { credentialService } from '../../services/ai/credentialService';
import { localModelAdvisor, LocalHardwareTelemetry, RecommendedLocalModel } from '../../services/ai/localModelAdvisor';
import { AIProviderId, ProviderConfig, RoutingMode, RoutingDecision, ProviderUsageRecord } from '../../types';

export const ProvidersView: React.FC = () => {
  const [configs, setConfigs] = useState<ProviderConfig[]>(providerManager.getAllConfigs());
  const [activeProviderId, setActiveProviderId] = useState<AIProviderId>(providerManager.getActiveProviderId());
  const [routingMode, setRoutingModeState] = useState<RoutingMode>(providerManager.getRoutingMode());
  const [testingId, setTestingId] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState<Record<string, string>>({});
  const [revealKey, setRevealKey] = useState<Record<string, boolean>>({});

  // Safety & Quota State
  const [cloudPaused, setCloudPaused] = useState<boolean>(quotaManager.isCloudAIPaused());
  const [paidAllowed, setPaidAllowed] = useState<boolean>(quotaManager.isPaidCloudAllowed());
  const [usageRecords, setUsageRecords] = useState<ProviderUsageRecord[]>(quotaManager.getAllRecords());
  const [lastDecision, setLastDecision] = useState<RoutingDecision | null>(providerManager.getLastRoutingDecision());

  // Hardware & Local Advisor State
  const [telemetry, setTelemetry] = useState<LocalHardwareTelemetry | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedLocalModel[]>([]);
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);

  useEffect(() => {
    // Refresh telemetry and records on mount
    loadTelemetry();

    // Sync with authoritative main security policy if running in Electron
    credentialService.getSecurityPolicy().then(policy => {
      if (policy) {
        setPaidAllowed(policy.paidCloudAllowed);
        setCloudPaused(policy.cloudPaused);
        if (policy.localOnlyMode) {
          setRoutingModeState('local_only');
        }
      }
    }).catch(() => {});

    const interval = setInterval(() => {
      setUsageRecords(quotaManager.getAllRecords());
      setLastDecision(providerManager.getLastRoutingDecision());
    }, 2000);

    const handleRoutingEvent = (e: any) => {
      setLastDecision(e.detail);
      setUsageRecords(quotaManager.getAllRecords());
    };
    window.addEventListener('breakpoint:routing_event', handleRoutingEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('breakpoint:routing_event', handleRoutingEvent);
    };
  }, []);

  const loadTelemetry = async () => {
    const hw = await localModelAdvisor.getHardwareTelemetry();
    setTelemetry(hw);
    setRecommendations(localModelAdvisor.getRecommendations(hw));
  };

  const handleModeChange = async (mode: RoutingMode) => {
    providerManager.setRoutingMode(mode);
    setRoutingModeState(mode);
    const isLocalOnly = mode === 'local_only';
    quotaManager.setLocalOnlyMode(isLocalOnly);
    await credentialService.setLocalOnly(isLocalOnly);
  };

  const handleToggleCloudPause = async () => {
    const next = !cloudPaused;
    quotaManager.setCloudAIPaused(next);
    setCloudPaused(next);
    await credentialService.setCloudPaused(next);
  };

  const handleTogglePaidAllowed = async () => {
    if (!paidAllowed) {
      const confirmPaid = window.confirm(
        'SECURITY CONFIRMATION:\n\n' +
        'By default, BREAK POINT enforces an authoritative ₹0/month budget policy to block billable cloud API calls.\n\n' +
        'Are you sure you want to enable potentially billable endpoints (OpenAI / Claude)?'
      );
      if (confirmPaid) {
        quotaManager.setPaidCloudAllowed(true);
        setPaidAllowed(true);
        await credentialService.setPaidPermission(true, 'AUTHORIZE_PAID_CLOUD_APIS_CONFIRMED');
      }
    } else {
      quotaManager.setPaidCloudAllowed(false);
      setPaidAllowed(false);
      await credentialService.setPaidPermission(false);
    }
  };

  const handleSetActive = (id: AIProviderId) => {
    providerManager.setActiveProviderId(id);
    setActiveProviderId(id);
    setConfigs(providerManager.getAllConfigs());
  };

  const handleSaveKey = async (id: AIProviderId) => {
    const key = inputKey[id];
    if (!key || !key.trim()) return;

    try {
      await providerManager.storeProviderKey(id, key.trim());
      setInputKey(prev => ({ ...prev, [id]: '' }));
      setConfigs(providerManager.getAllConfigs());
      alert(`API key for ${id.toUpperCase()} safely stored in Windows DPAPI vault.`);
    } catch (err: any) {
      alert(`Failed to save credential: ${err.message}`);
    }
  };

  const handleDeleteKey = async (id: AIProviderId) => {
    if (confirm(`Remove credential for ${id.toUpperCase()}?`)) {
      await providerManager.deleteProviderKey(id);
      setConfigs(providerManager.getAllConfigs());
    }
  };

  const handleTestConnection = async (id: AIProviderId) => {
    setTestingId(id);
    try {
      const res = await providerManager.testProvider(id);
      if (res.success) {
        alert(`Connection verified for ${id.toUpperCase()}!\nLatency: ${res.latencyMs}ms`);
      } else {
        alert(`Connection test failed for ${id.toUpperCase()}:\n${res.error || 'Unknown error'}`);
      }
    } finally {
      setTestingId(null);
      setConfigs(providerManager.getAllConfigs());
      setUsageRecords(quotaManager.getAllRecords());
    }
  };

  const totalRequests = usageRecords.reduce((acc, r) => acc + r.requestsCount, 0);
  const totalTokens = usageRecords.reduce((acc, r) => acc + r.estimatedTokensPrompt + r.estimatedTokensCompletion, 0);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text">
      {/* Header & Mission Policy */}
      <div className="border-b border-breakpoint-panelBorder pb-4 select-none">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-breakpoint-cyan" />
              <h1 className="text-lg font-hud font-bold tracking-wider text-white">
                ADAPTIVE INTELLIGENCE ROUTER &amp; AI CONTROL CENTER
              </h1>
            </div>
            <p className="text-xs text-breakpoint-textMuted mt-0.5">
              Production Multi-Provider Fabric • ₹0/mo Zero-Cost Budget • Windows DPAPI Vault • Resilient Fallback
            </p>
          </div>

          {/* Global Safety Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleCloudPause}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border transition-all ${
                cloudPaused
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                  : 'bg-black/40 border-breakpoint-panelBorder text-zinc-400 hover:text-white'
              }`}
            >
              {cloudPaused ? <PlayCircle className="w-4 h-4 text-amber-400" /> : <PauseCircle className="w-4 h-4 text-zinc-400" />}
              <span>{cloudPaused ? 'RESUME CLOUD AI' : 'PAUSE CLOUD AI'}</span>
            </button>

            <button
              onClick={handleTogglePaidAllowed}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border transition-all ${
                paidAllowed
                  ? 'bg-red-950/60 border-red-500 text-red-300'
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{paidAllowed ? 'PAID ENDPOINTS: PERMITTED' : 'PAID ENDPOINTS: BLOCKED (₹0 BUDGET)'}</span>
            </button>
          </div>
        </div>

        {/* Routing Mode Selector Pills */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 mr-2">Routing Policy:</span>
          {(['auto', 'local_only', 'free_cloud_preferred', 'offline_autonomous'] as RoutingMode[]).map((mode) => {
            const isSelected = routingMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-3 py-1 rounded text-xs transition-all border ${
                  isSelected
                    ? 'bg-breakpoint-cyan/20 border-breakpoint-cyan text-breakpoint-cyan font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'bg-black/40 border-breakpoint-panelBorder text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                {mode === 'auto' && 'AUTOMATIC (ADAPTIVE)'}
                {mode === 'local_only' && 'LOCAL ONLY (OLLAMA / ON-DEVICE)'}
                {mode === 'free_cloud_preferred' && 'FREE CLOUD PREFERRED (GEMINI / GROQ)'}
                {mode === 'offline_autonomous' && 'AUTONOMOUS JARVIS (100% OFFLINE)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hardware Telemetry & 8GB RAM Safety Advisor */}
      {telemetry && (
        <div className="hud-panel p-4 rounded border border-breakpoint-panelBorder bg-black/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-breakpoint-cyan" />
              <span className="text-xs font-bold text-white tracking-wider">
                HARDWARE RESOURCE SAFETY MONITOR (&le;8GB RAM TARGET)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-zinc-400">Total RAM: <strong className="text-white">{Math.round(telemetry.totalMemMB / 1024)} GB</strong></span>
              <span className="text-zinc-400">Available: <strong className="text-emerald-400">{Math.round(telemetry.freeMemMB / 1024)} GB</strong></span>
              <span className="text-zinc-400">CPU Cores: <strong className="text-white">{telemetry.cpuCores}</strong></span>
              {telemetry.isLowRam && (
                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-600 text-amber-300 font-bold text-[10px]">
                  LOW-RAM GUARD ACTIVE (SEQUENTIAL LOCKED)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-breakpoint-panelBorder/50 text-xs">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>Ollama Daemon (127.0.0.1:11434):</span>
              {telemetry.hasOllamaDaemon ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> REACHABLE ({telemetry.installedModels.length} models installed)
                </span>
              ) : (
                <span className="text-zinc-500 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-zinc-600" /> NOT DETECTED
                </span>
              )}
            </div>

            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showSetupGuide ? 'Hide Ollama Windows Guide' : 'Ollama Windows Setup Guide (<=8GB RAM)'}</span>
            </button>
          </div>

          {/* Setup Guide Drawer */}
          {showSetupGuide && (
            <div className="p-4 rounded bg-black/80 border border-cyan-800/50 text-xs text-zinc-300 whitespace-pre-wrap select-text leading-relaxed">
              {localModelAdvisor.getOllamaWindowsSetupGuide()}
            </div>
          )}

          {/* Recommended Low-RAM Models List */}
          <div className="pt-2">
            <span className="text-[11px] text-zinc-400 block mb-2">Recommended Quantized Models for Your System:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              {recommendations.slice(0, 4).map((m) => (
                <div key={m.tag} className="p-2.5 rounded bg-black/60 border border-breakpoint-panelBorder flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">{m.name}</span>
                      {m.isInstalled ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300">
                          INSTALLED
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                          {m.parameterSize}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-[10px] line-clamp-2">{m.bestFor}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
                    <span>RAM: ~{m.minRamMB}MB</span>
                    <span className="text-cyan-400">{m.speedRating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quota & Usage Status Summary Table */}
      <div className="hud-panel p-4 rounded border border-breakpoint-panelBorder space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white tracking-wider">HONEST QUOTA &amp; USAGE METRICS</h2>
          </div>
          <div className="text-xs text-zinc-400">
            Total Requests: <strong className="text-white">{totalRequests}</strong> | Est. Tokens: <strong className="text-cyan-400">{totalTokens.toLocaleString()}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-breakpoint-panelBorder text-zinc-400 text-[11px]">
                <th className="py-2">PROVIDER</th>
                <th className="py-2">MODEL</th>
                <th className="py-2">TIER</th>
                <th className="py-2">REQUESTS</th>
                <th className="py-2">EST. TOKENS</th>
                <th className="py-2">QUOTA STATUS</th>
                <th className="py-2">ALLOWANCE NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-breakpoint-panelBorder/40">
              {usageRecords.map((r) => (
                <tr key={`${r.providerId}_${r.model}`} className="hover:bg-cyan-950/20">
                  <td className="py-2.5 font-bold text-white uppercase">{r.providerId}</td>
                  <td className="py-2.5 text-cyan-300">{r.model}</td>
                  <td className="py-2.5">
                    {r.costTier === 'local' && <span className="text-emerald-400 font-bold">100% LOCAL</span>}
                    {r.costTier === 'free_tier' && <span className="text-cyan-400 font-bold">FREE TIER</span>}
                    {r.costTier === 'potentially_billable' && <span className="text-amber-400 font-bold">BILLABLE (BLOCKED)</span>}
                  </td>
                  <td className="py-2.5 text-white">{r.requestsCount}</td>
                  <td className="py-2.5 text-zinc-300">{(r.estimatedTokensPrompt + r.estimatedTokensCompletion).toLocaleString()}</td>
                  <td className="py-2.5">
                    {r.quotaStatus === 'available' && <span className="text-emerald-400">Available</span>}
                    {r.quotaStatus === 'cooling_down' && (
                      <span className="text-amber-400 font-bold">
                        Cooling Down ({r.cooldownUntil ? new Date(r.cooldownUntil).toLocaleTimeString() : 'Active'})
                      </span>
                    )}
                    {r.quotaStatus === 'unknown' && <span className="text-zinc-500">Unknown (Unmeasured)</span>}
                    {r.quotaStatus === 'unavailable' && <span className="text-red-400">Unavailable</span>}
                  </td>
                  <td className="py-2.5 text-[11px] text-zinc-400">{r.quotaNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Neural Routing Decision Feed */}
      {lastDecision && (
        <div className="p-3 rounded bg-cyan-950/20 border border-cyan-800/40 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-400">Recent Neural Route:</span>
            <span className="px-2 py-0.5 rounded bg-black/60 border border-cyan-700 text-cyan-300 font-bold">
              {lastDecision.taskType.toUpperCase()}
            </span>
            <span className="text-zinc-400">&rarr;</span>
            <span className="text-white font-bold">{lastDecision.selectedProvider.toUpperCase()}</span>
            <span className="text-zinc-500 text-[11px]">({lastDecision.selectedModel})</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            {lastDecision.reason}
          </div>
        </div>
      )}

      {/* Grid of Configured Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((conf) => {
          const isActive = activeProviderId === conf.id;
          const isTesting = testingId === conf.id;
          const isPotentiallyBillable = conf.id === 'openai' || conf.id === 'anthropic';

          return (
            <div
              key={conf.id}
              className={`hud-panel p-5 rounded-lg flex flex-col justify-between space-y-4 border transition-all ${
                isActive
                  ? 'border-cyan-500/60 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                  : 'border-breakpoint-panelBorder'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-white">{conf.name}</span>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold">
                        ACTIVE ROUTE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {conf.status === 'connected' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>CONNECTED</span>
                      </span>
                    )}
                    {conf.status === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>ERROR</span>
                      </span>
                    )}
                    {conf.status === 'disconnected' && (
                      <span className="text-[10px] text-zinc-500">STANDBY</span>
                    )}
                  </div>
                </div>

                {/* Capability Badges */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] select-none">
                  <span className={`px-2 py-0.5 rounded border ${conf.capabilities.text ? 'bg-black/40 border-cyan-800 text-cyan-300' : 'bg-black/20 border-zinc-800 text-zinc-600'}`}>
                    TEXT GENERATION
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${conf.capabilities.vision ? 'bg-black/40 border-purple-800 text-purple-300' : 'bg-black/20 border-zinc-800 text-zinc-600'}`}>
                    VISION ANALYSIS
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${conf.capabilities.toolCalling ? 'bg-black/40 border-emerald-800 text-emerald-300' : 'bg-black/20 border-zinc-800 text-zinc-600'}`}>
                    TOOL CALLING
                  </span>
                  {isPotentiallyBillable && (
                    <span className="px-2 py-0.5 rounded border bg-amber-950/40 border-amber-800 text-amber-300">
                      BILLABLE (LOCKED)
                    </span>
                  )}
                </div>

                {/* Model Selector */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Target Model:</label>
                  <select
                    value={conf.selectedModel}
                    onChange={(e) => {
                      providerManager.updateConfig(conf.id, { selectedModel: e.target.value });
                      setConfigs(providerManager.getAllConfigs());
                    }}
                    className="w-full px-3 py-1.5 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {conf.availableModels.map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Secure Credential Input with Windows DPAPI Shield */}
                {conf.id !== 'mock' && conf.id !== 'ollama' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Windows DPAPI Credential Vault:</span>
                      </span>
                      {conf.apiKey && (
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(conf.id)}
                          className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </label>

                    {conf.apiKey ? (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded bg-black/80 border border-emerald-800/60 text-xs">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Protected in Secure Storage: {conf.apiKey.slice(-8)}</span>
                        </span>
                        <span className="text-[10px] text-zinc-500">DPAPI Encrypted</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type={revealKey[conf.id] ? 'text' : 'password'}
                          value={inputKey[conf.id] || ''}
                          onChange={(e) => setInputKey(prev => ({ ...prev, [conf.id]: e.target.value }))}
                          placeholder={`Enter ${conf.name} API key...`}
                          className="flex-1 px-3 py-1.5 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setRevealKey(prev => ({ ...prev, [conf.id]: !prev[conf.id] }))}
                          className="px-2 rounded bg-black/40 border border-breakpoint-panelBorder text-zinc-400 hover:text-white"
                        >
                          {revealKey[conf.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveKey(conf.id)}
                          disabled={!inputKey[conf.id]}
                          className="px-3 py-1 rounded text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-black disabled:opacity-40"
                        >
                          STORE
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Ollama Base URL */}
                {conf.id === 'ollama' && (
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Local Daemon Endpoint:</label>
                    <input
                      type="text"
                      value={conf.baseUrl || 'http://127.0.0.1:11434'}
                      onChange={(e) => {
                        providerManager.updateConfig(conf.id, { baseUrl: e.target.value, enabled: true });
                        setConfigs(providerManager.getAllConfigs());
                      }}
                      className="w-full px-3 py-1.5 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {/* Error Banner */}
                {conf.errorMessage && (
                  <div className="p-2 rounded bg-red-950/40 border border-red-800 text-[10px] text-red-300">
                    {conf.errorMessage}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-breakpoint-panelBorder flex items-center justify-between select-none">
                <div className="text-[10px] text-zinc-500">
                  {conf.latencyMs ? `Latency: ${conf.latencyMs}ms` : 'Not tested'}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(conf.id)}
                    disabled={isTesting}
                    className="px-3 py-1 rounded text-xs bg-black/40 border border-breakpoint-panelBorder text-zinc-300 hover:text-white hover:border-cyan-400 flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>TEST</span>
                  </button>

                  <button
                    onClick={() => handleSetActive(conf.id)}
                    disabled={isActive}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-500 cursor-default'
                        : 'bg-breakpoint-cyan text-black hover:bg-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    }`}
                  >
                    {isActive ? 'ACTIVE' : 'SELECT'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
