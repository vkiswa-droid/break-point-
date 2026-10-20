import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, Square, Sparkles, Clock, Cpu } from 'lucide-react';
import { ChatMessage, AIProviderId, ToneState } from '../../types';
import { AudioWaveform } from '../hud/AudioWaveform';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  isListening: boolean;
  onToggleListening: () => void;
  audioLevel?: number;
  activeProvider: AIProviderId;
  currentTone: ToneState;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  isSpeaking,
  onStopSpeaking,
  isListening,
  onToggleListening,
  audioLevel = 0,
  activeProvider,
  currentTone
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const suggestedPrompts = [
    'What is the current system time and hardware status?',
    'Search the web for Tony Stark J.A.R.V.I.S. architecture',
    'Set a reminder to review code in 15 minutes',
    'Launch Calculator from approved applications',
    'Save a note called daily_standup.md with project progress'
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-4 select-text">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
          <h2 className="text-sm font-hud font-bold tracking-wider text-white">
            COMMUNICATION INTERFACE
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-breakpoint-panelBorder text-cyan-300">
            TONE: {currentTone.toUpperCase()}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 border border-breakpoint-panelBorder text-purple-300">
            ROUTER: {activeProvider.toUpperCase()}
          </span>
        </div>

        {/* Voice Interruption / Barge-in Control */}
        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="px-3 py-1 rounded text-xs font-mono font-bold bg-amber-500 text-black hover:bg-amber-400 flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,149,0,0.4)] animate-bounce"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>INTERRUPT / BARGE-IN</span>
          </button>
        )}
      </div>

      {/* Live Conversation Transcript */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-breakpoint-cyan shadow-[0_0_24px_rgba(0,240,255,0.15)]">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-base font-hud font-bold text-white">Break Point Standing By</h3>
              <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                Speak <span className="text-cyan-300 font-bold">&quot;Break Point&quot;</span> to begin voice capture, or type instructions below.
              </p>
            </div>

            {/* Suggested Chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-4">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(p)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono bg-white/5 border border-white/10 text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-950/30 transition-all text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-zinc-400 select-none">
                <span className="font-semibold text-zinc-300">
                  {msg.role === 'user' ? 'USER / COMMANDER' : 'BREAK POINT'}
                </span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                {msg.providerUsed && (
                  <span className="px-1.5 py-0.2 rounded bg-black/40 border border-zinc-700 text-[10px] text-cyan-400">
                    {msg.providerUsed}
                  </span>
                )}
                {msg.latencyMs && (
                  <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                    <Clock className="w-2.5 h-2.5" />
                    {msg.latencyMs}ms
                  </span>
                )}
              </div>

              <div
                className={`max-w-2xl p-4 rounded-lg font-mono text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-950/50 border border-blue-500/40 text-blue-100 shadow-[0_0_12px_rgba(10,132,255,0.1)]'
                    : 'hud-panel text-zinc-100 border border-cyan-500/30'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* If tool calls occurred */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2">
                    <div className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Cpu className="w-3 h-3" />
                      <span>EXECUTED TOOLS ({msg.toolCalls.length}):</span>
                    </div>
                    {msg.toolCalls.map((t: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-black/50 border border-breakpoint-panelBorder text-[11px]">
                        <span className="text-cyan-300 font-semibold">{t.name}</span>
                        {t.arguments && (
                          <span className="text-zinc-400 ml-2">
                            {JSON.stringify(t.arguments)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 p-3 rounded hud-panel border-cyan-500/40 text-xs font-mono text-cyan-300 max-w-sm animate-pulse">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span>Break Point is synthesizing neural response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Audio Waveform Live Feedback */}
      {(isSpeaking || isListening) && (
        <div className="flex items-center justify-between px-4 py-2 rounded bg-black/40 border border-breakpoint-panelBorder">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
            {isSpeaking ? <Volume2 className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4 animate-pulse" />}
            <span>{isSpeaking ? 'VOCAL SYNTHESIS TRANSMITTING' : 'LISTENING TO MICROPHONE'}</span>
          </div>
          <AudioWaveform isActive={true} amplitude={audioLevel} />
        </div>
      )}

      {/* Input Console */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 select-none">
        <button
          type="button"
          onClick={onToggleListening}
          title={isListening ? 'Stop Listening' : 'Push to Talk'}
          className={`p-3 rounded-lg border transition-all ${
            isListening
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_16px_rgba(48,209,88,0.5)]'
              : 'bg-black/40 border-breakpoint-panelBorder text-zinc-400 hover:text-white hover:border-cyan-500/40'
          }`}
        >
          {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak 'Break Point' or type instructions for J.A.R.V.I.S..."
          className="flex-1 px-4 py-3 rounded-lg bg-black/60 border border-breakpoint-panelBorder text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-breakpoint-cyan transition-colors font-mono"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="px-5 py-3 rounded-lg font-mono font-bold text-xs bg-breakpoint-cyan text-black hover:bg-cyan-300 flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)] disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
          <span>SEND</span>
        </button>
      </form>
    </div>
  );
};
