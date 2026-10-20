import React, { useState } from 'react';
import { Eye, X, Send, StopCircle, RefreshCw } from 'lucide-react';
import { ScreenCaptureResult } from '../../services/screen/screenService';

interface ScreenPreviewModalProps {
  capture: ScreenCaptureResult;
  onAnalyze: (prompt: string) => Promise<void>;
  onRecapture: () => Promise<void>;
  onClose: () => void;
  isAnalyzing: boolean;
}

export const ScreenPreviewModal: React.FC<ScreenPreviewModalProps> = ({
  capture,
  onAnalyze,
  onRecapture,
  onClose,
  isAnalyzing
}) => {
  const [prompt, setPrompt] = useState('Analyze the visible desktop windows, code, or application state and summarize any potential issues.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isAnalyzing) return;
    onAnalyze(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
      <div className="hud-panel w-full max-w-4xl rounded-lg border border-breakpoint-cyan/40 p-6 space-y-4 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3">
          <div className="flex items-center gap-2 text-breakpoint-cyan font-mono font-bold text-sm tracking-wide">
            <Eye className="w-5 h-5 text-breakpoint-cyan animate-pulse" />
            <span>WATCH SCREEN — PRIVACY PREVIEW</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              {capture.width}x{capture.height}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Preview */}
        <div className="relative rounded overflow-hidden border border-breakpoint-panelBorder bg-black/80 max-h-[420px] flex items-center justify-center">
          <img
            src={capture.imageDataUrl}
            alt="Desktop Screen Capture"
            className="w-full h-auto max-h-[400px] object-contain"
          />
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-[10px] font-mono text-cyan-300 px-2 py-1 rounded border border-cyan-500/30">
            Captured: {new Date(capture.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Form and Controls */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono">
          <div>
            <label className="text-xs text-zinc-300 block mb-1">
              Instructions for Vision AI Model:
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-white focus:outline-none focus:border-breakpoint-cyan transition-colors"
              placeholder="What should Break Point analyze in this screen capture?"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRecapture}
                className="px-3 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 border border-zinc-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RE-CAPTURE</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-950/40 flex items-center gap-1.5 border border-red-800/40 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>STOP SHARING</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-5 py-2 rounded text-xs font-bold bg-breakpoint-cyan text-black hover:bg-cyan-300 flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.4)] disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isAnalyzing ? 'TRANSMITTING & ANALYZING...' : 'TRANSMIT TO VISION MODEL'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
