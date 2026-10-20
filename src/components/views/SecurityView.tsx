import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, Trash2, Power, CheckCircle2, AlertTriangle, EyeOff } from 'lucide-react';
import { memoryDatabase } from '../../services/memory/database';
import { APPROVED_APPLICATIONS } from '../../services/tools/appLauncherTools';

export const SecurityView: React.FC = () => {
  const [memorySaving, setMemorySaving] = useState(memoryDatabase.isMemorySavingEnabled());
  const [requireConfirm, setRequireConfirm] = useState(true);

  const handleToggleMemorySaving = () => {
    const next = !memorySaving;
    memoryDatabase.setMemorySavingEnabled(next);
    setMemorySaving(next);
  };

  const handleWipeConversations = () => {
    if (confirm('Are you sure you want to permanently clear all conversation history?')) {
      memoryDatabase.clearAllConversations();
      alert('Conversation history wiped clean.');
    }
  };

  const handleWipeMemories = () => {
    if (confirm('WARNING: This will permanently delete all entries in the long-term SQLite memory vault. Proceed?')) {
      memoryDatabase.clearAllMemories();
      alert('Memory vault completely wiped.');
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text">
      {/* Header */}
      <div className="border-b border-breakpoint-panelBorder pb-4 select-none">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-breakpoint-cyan" />
          <h1 className="text-lg font-hud font-bold tracking-wider text-white">
            PRIVACY, PERMISSIONS & SECURITY CENTER
          </h1>
        </div>
        <p className="text-xs text-breakpoint-textMuted mt-0.5">
          Least-Privilege System Integration • Air-Gap Readiness • Prompt Injection Shield • Data Wipe Controls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Privacy & Data Protection */}
        <div className="space-y-4">
          <div className="hud-panel p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2 select-none">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Data Retention & Secret Masking</span>
            </h2>

            {/* Toggle Memory Saving */}
            <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-breakpoint-panelBorder">
              <div>
                <div className="text-xs font-bold text-white">Persistent Memory Saving</div>
                <div className="text-[11px] text-zinc-400">
                  Allow Break Point to store facts & preferences in local SQLite vault.
                </div>
              </div>
              <button
                onClick={handleToggleMemorySaving}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  memorySaving
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(48,209,88,0.3)]'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {memorySaving ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Prompt Injection Shield Policy */}
            <div className="p-3 rounded bg-black/40 border border-breakpoint-panelBorder space-y-1.5 text-xs text-zinc-300">
              <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Prompt Injection Defense Active</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Untrusted external web pages and user-provided documents are treated strictly as isolated data payloads, preventing unverified system instructions from hijacking execution.
              </p>
            </div>

            {/* Credential Shield */}
            <div className="p-3 rounded bg-black/40 border border-breakpoint-panelBorder space-y-1.5 text-xs text-zinc-300">
              <div className="text-purple-400 font-bold flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-purple-400" />
                <span>API Secret Shielding</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Credentials are encrypted in local storage, masked in DOM elements, and automatically purged from audit logs and conversational memories.
              </p>
            </div>
          </div>

          {/* Hard Wipe / Factory Reset Controls */}
          <div className="hud-panel p-5 rounded-lg space-y-3 border border-red-900/40">
            <h2 className="text-xs font-bold text-red-400 uppercase flex items-center gap-2 select-none">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Permanent Data Erasure Controls</span>
            </h2>

            <div className="space-y-2">
              <button
                onClick={handleWipeConversations}
                className="w-full py-2 px-3 rounded text-xs font-bold bg-black/40 border border-zinc-700 hover:border-red-600 hover:text-red-300 text-zinc-300 flex items-center justify-between transition-all"
              >
                <span>Wipe All Conversation Transcripts</span>
                <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              <button
                onClick={handleWipeMemories}
                className="w-full py-2 px-3 rounded text-xs font-bold bg-red-950/40 border border-red-700/60 hover:bg-red-900/60 text-red-300 flex items-center justify-between transition-all"
              >
                <span>Purge Entire SQLite Memory Vault</span>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Computer Execution Security & Allowlists */}
        <div className="space-y-4">
          <div className="hud-panel p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2 select-none">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Execution Boundaries & Allowlists</span>
            </h2>

            {/* Confirmation Gate Toggle */}
            <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-breakpoint-panelBorder">
              <div>
                <div className="text-xs font-bold text-white">Interactive Confirmation Gate</div>
                <div className="text-[11px] text-zinc-400">
                  Block file deletions and sensitive operations until manually approved.
                </div>
              </div>
              <button
                onClick={() => setRequireConfirm(!requireConfirm)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  requireConfirm
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(255,149,0,0.3)]'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {requireConfirm ? 'STRICT' : 'PERMISSIVE'}
              </button>
            </div>

            {/* Approved Application Allowlist */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 block select-none">
                Approved Application Allowlist:
              </label>
              <div className="p-3 rounded bg-black/60 border border-breakpoint-panelBorder space-y-1.5 text-[11px]">
                {Object.entries(APPROVED_APPLICATIONS).map(([key, app]) => (
                  <div key={key} className="flex justify-between items-center text-zinc-300">
                    <span className="font-bold text-cyan-300">{app.name}</span>
                    <span className="text-zinc-500">{app.command} ({app.description})</span>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 block">
                Any application not on this allowlist is strictly rejected by the execution registry.
              </span>
            </div>

            {/* Approved Directory Allowlist */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 block select-none">
                Permitted Filesystem Paths:
              </label>
              <div className="p-3 rounded bg-black/60 border border-breakpoint-panelBorder space-y-1 text-[11px] text-zinc-400">
                <div>• Approved Project Workspace (<code className="text-cyan-300">f:\break point</code>)</div>
                <div>• Virtual Notes Sandbox (In-Memory Encrypted)</div>
                <div>• Explicitly user-selected files via OS Dialog</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
