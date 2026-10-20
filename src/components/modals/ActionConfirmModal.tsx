import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface ActionConfirmModalProps {
  id: string;
  toolName: string;
  args: Record<string, any>;
  description?: string;
  onConfirm: (id: string) => void;
  onDeny: (id: string) => void;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  id,
  toolName,
  args,
  description,
  onConfirm,
  onDeny
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="hud-panel w-full max-w-lg rounded-lg border-2 border-amber-500/60 p-6 space-y-4 shadow-[0_0_32px_rgba(255,149,0,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm tracking-wide">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>SECURITY DIRECTIVE: CONFIRMATION REQUIRED</span>
          </div>
          <button onClick={() => onDeny(id)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs font-mono">
          <p className="text-zinc-300">
            Break Point is requesting authorization to execute a potentially consequential action:
          </p>

          <div className="p-3 rounded bg-black/50 border border-breakpoint-panelBorder space-y-2">
            <div className="text-cyan-400 font-bold">TOOL: {toolName}</div>
            {description && <div className="text-zinc-400 text-[11px]">{description}</div>}
            <div className="text-zinc-300">
              <span className="text-zinc-500">PARAMETERS:</span>
              <pre className="mt-1 p-2 rounded bg-black/60 text-[11px] text-amber-300 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 bg-amber-950/30 p-2.5 rounded border border-amber-600/30">
            Per the J.A.R.V.I.S. security architecture, destructive operations require explicit manual authorization.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => onDeny(id)}
            className="px-4 py-2 rounded text-xs font-mono text-zinc-300 hover:bg-white/10 transition-colors"
          >
            DENY OPERATION
          </button>
          <button
            onClick={() => onConfirm(id)}
            className="px-4 py-2 rounded text-xs font-mono font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-[0_0_12px_rgba(255,149,0,0.4)] flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>AUTHORIZE EXECUTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
