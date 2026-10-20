import React, { useState, useEffect } from 'react';
import {
  Heart,
  Sliders,
  Mic,
  Volume2,
  ShieldCheck,
  Sparkles,
  Zap,
  Moon,
  Clock,
  User,
  Check,
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { personalityEngine } from '../../services/personality/personalityEngine';
import { companionPersonalityService } from '../../services/personality/companionPersonalityService';
import { wakeWordEngine } from '../../services/voice/wakeWordEngine';
import { speechService } from '../../services/voice/speechService';
import { ToneState, PersonalityConfig, CompanionMode, PersonalityState, CompanionConfig } from '../../types';

export const PersonalityView: React.FC = () => {
  const [personality, setPersonality] = useState<PersonalityConfig>(personalityEngine.getConfig());
  const [companionConfig, setCompanionConfig] = useState<CompanionConfig>(companionPersonalityService.getConfig());
  const [overrideState, setOverrideState] = useState<PersonalityState | null>(
    companionPersonalityService.getManualOverrideState()
  );

  const [wakePhrase, setWakePhrase] = useState(wakeWordEngine.getWakePhrase());
  const [sensitivity, setSensitivity] = useState(75);
  const [speechRate, setSpeechRate] = useState(speechService.getSpeechRate());
  const [pitch, setPitch] = useState(speechService.getPitch());
  const [preferFeminine, setPreferFeminine] = useState(speechService.getPreferFeminine());

  const availableVoices = speechService.getAvailableVoices();
  const feminineVoices = speechService.getFeminineVoices();
  const selectedVoice = speechService.getSelectedVoice()?.name || availableVoices[0]?.name || '';

  const tones: ToneState[] = [
    'calm', 'friendly', 'focused', 'curious', 'playful', 'excited', 'empathetic', 'alert'
  ];

  const companionModes: Array<{ id: CompanionMode; label: string; desc: string; emoji: string }> = [
    { id: 'girlfriend', label: 'Girlfriend Mode', desc: 'Affectionate warmth, playful banter, cute nicknames, and daily companionship.', emoji: '💖' },
    { id: 'comfort', label: 'Comfort Mode', desc: 'Gentle listening, emotional validation, patient care, zero teasing.', emoji: '🧸' },
    { id: 'chaos', label: 'Chaos Mode', desc: 'Silly jokes, harmless teasing, absurd questions, cute dramatic reactions.', emoji: '⚡' },
    { id: 'growth', label: 'Growth Mode', desc: 'Habit tracking, confidence building, goal accountability, honest feedback.', emoji: '🌱' },
    { id: 'gaming', label: 'Gaming Mode', desc: 'Interactive riddles, cyber-trivia, word puzzles, and playful challenges.', emoji: '🎮' },
    { id: 'focus', label: 'Focus Mode', desc: 'Quiet encouragement, minimal interruption, productive flow.', emoji: '🎯' }
  ];

  const personalityStates: PersonalityState[] = [
    'CHAOTIC_PLAYFUL',
    'AFFECTIONATE',
    'ACTIVE_LISTENING',
    'COMFORTING',
    'MOTIVATING',
    'CURIOUS',
    'GAMING',
    'FOCUSED',
    'QUIET'
  ];

  const handleCompanionModeChange = (mode: CompanionMode) => {
    companionPersonalityService.setMode(mode);
    setCompanionConfig(companionPersonalityService.getConfig());
    setOverrideState(null);
  };

  const handleOverrideState = (state: PersonalityState | null) => {
    companionPersonalityService.setManualOverrideState(state);
    setOverrideState(state);
  };

  const handleToneChange = (tone: ToneState) => {
    personalityEngine.setTone(tone);
    setPersonality(personalityEngine.getConfig());
  };

  const handleSliderChange = (key: keyof PersonalityConfig, value: any) => {
    personalityEngine.saveConfig({ [key]: value });
    setPersonality(personalityEngine.getConfig());
  };

  const handleCompanionConfigUpdate = (key: keyof CompanionConfig, value: any) => {
    companionPersonalityService.saveConfig({ [key]: value });
    setCompanionConfig(companionPersonalityService.getConfig());
  };

  const handleVoicePreview = () => {
    speechService.previewVoice(
      companionConfig.mode === 'girlfriend'
        ? `Hey ${companionConfig.userNickname || 'babe'}! It's Break Point. I love hanging out with you, and my vocal synthesizers are sounding super cute!`
        : `Break Point online. Voice cadence calibrated at ${speechRate}x speed and ${pitch}x pitch.`
    );
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text bg-[#030612] text-zinc-200">
      {/* Top Banner Header */}
      <div className="border-b border-cyan-950/60 pb-4 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400">
              <Heart className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-white flex items-center gap-2">
                COMPANION PERSONALITY & VOICE STUDIO
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-500/30">
                  CHAOTIC GIRLFRIEND
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Six Companion Modes • Feminine SAPI Voice Tuning • Emotional Intelligence Framework • ₹0 Budget Policy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Local Voice & Privacy
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Companion Modes & Personality State Engine */}
        <div className="space-y-6">
          {/* Companion Mode Selector */}
          <div className="p-5 rounded-xl bg-[#060c20]/90 border border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between select-none">
              <h2 className="text-xs font-bold text-pink-300 uppercase flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span>Select Companion Mode</span>
              </h2>
              <span className="text-[10px] text-zinc-500">Active: {companionConfig.mode.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {companionModes.map((m) => {
                const isActive = companionConfig.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleCompanionModeChange(m.id)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      isActive
                        ? 'bg-gradient-to-br from-pink-950/60 to-purple-950/40 border-pink-500/60 text-white shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                        : 'bg-black/40 border-cyan-950/50 text-zinc-400 hover:text-white hover:border-cyan-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-snug line-clamp-2">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Personality Intensity Slider */}
            <div className="pt-2 border-t border-cyan-950/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs select-none">
                <span className="text-zinc-300">Playful / Chaotic Intensity:</span>
                <span className="text-pink-400 font-bold">{companionConfig.intensity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={companionConfig.intensity}
                onChange={(e) => handleCompanionConfigUpdate('intensity', parseInt(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 select-none">
                <span>Gentle & Subtle</span>
                <span>Balanced Playful</span>
                <span>Full Chaotic Girlfriend</span>
              </div>
            </div>

            {/* User & Companion Nicknames */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cyan-950/60">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Your Nickname:</label>
                <input
                  type="text"
                  value={companionConfig.userNickname || ''}
                  onChange={(e) => handleCompanionConfigUpdate('userNickname', e.target.value)}
                  placeholder="babe, handsome, etc."
                  className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-cyan-950 text-xs text-pink-300 focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Her Name:</label>
                <input
                  type="text"
                  value={companionConfig.companionNickname || ''}
                  onChange={(e) => handleCompanionConfigUpdate('companionNickname', e.target.value)}
                  placeholder="Break Point"
                  className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-cyan-950 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Personality State Engine & Manual Override */}
          <div className="p-5 rounded-xl bg-[#060c20]/90 border border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between select-none">
              <h2 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>State Engine & Manual Override</span>
              </h2>
              {overrideState && (
                <button
                  onClick={() => handleOverrideState(null)}
                  className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Override
                </button>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Break Point automatically adapts its state based on emotional context (e.g. switching to{' '}
              <code className="text-purple-300">COMFORTING</code> when distressed). You can also lock a state manually:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {personalityStates.map((st) => {
                const isSelected = overrideState === st || (!overrideState && companionConfig.state === st);
                return (
                  <button
                    key={st}
                    onClick={() => handleOverrideState(st)}
                    className={`py-1.5 px-2 rounded text-[10px] font-bold tracking-tight uppercase transition-all border ${
                      isSelected
                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'bg-black/30 border-cyan-950/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proactive Companion Initiative & Quiet Hours */}
          <div className="p-5 rounded-xl bg-[#060c20]/90 border border-cyan-900/40 space-y-4">
            <h2 className="text-xs font-bold text-purple-300 uppercase flex items-center gap-2">
              <Moon className="w-4 h-4 text-purple-400" />
              <span>Proactive Companion (Opt-in Only)</span>
            </h2>

            <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-cyan-950/60">
              <div>
                <div className="text-xs font-bold text-zinc-200">Companion Initiative</div>
                <div className="text-[10px] text-zinc-400">
                  Allow occasional friendly greetings or game invitations when app opens.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={companionConfig.initiativeEnabled}
                  onChange={(e) => handleCompanionConfigUpdate('initiativeEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Quiet Hours (Start):</label>
                <input
                  type="time"
                  value={companionConfig.quietHoursStart}
                  onChange={(e) => handleCompanionConfigUpdate('quietHoursStart', e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-black/60 border border-cyan-950 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Quiet Hours (End):</label>
                <input
                  type="time"
                  value={companionConfig.quietHoursEnd}
                  onChange={(e) => handleCompanionConfigUpdate('quietHoursEnd', e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-black/60 border border-cyan-950 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Voice Synthesizer, Feminine Voice, Wake Word */}
        <div className="space-y-6">
          {/* Cute Feminine Vocal Engine Controls */}
          <div className="p-5 rounded-xl bg-[#060c20]/90 border border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between select-none">
              <h2 className="text-xs font-bold text-pink-300 uppercase flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-pink-400" />
                <span>Cute Expressive Voice Engine</span>
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-500/30">
                LOCAL TTS
              </span>
            </div>

            {/* Prefer Feminine Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-pink-950/20 border border-pink-500/30">
              <div>
                <div className="text-xs font-bold text-pink-200">Expressive Feminine Voice</div>
                <div className="text-[10px] text-zinc-400">
                  Prioritize Microsoft Zira / Jenny / Aria or system female voice.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferFeminine}
                  onChange={(e) => {
                    setPreferFeminine(e.target.checked);
                    speechService.setPreferFeminine(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            {/* Voice Dropdown */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Detected Installed Voices:</label>
              <select
                value={selectedVoice}
                onChange={(e) => {
                  speechService.setSelectedVoice(e.target.value);
                }}
                className="w-full px-3 py-2 rounded bg-black/60 border border-cyan-950 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Pitch Slider (elevated for cute girlfriend persona) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs select-none">
                <span className="text-zinc-300">Vocal Pitch:</span>
                <span className="text-pink-400 font-bold">{pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={pitch}
                onChange={(e) => {
                  const p = parseFloat(e.target.value);
                  setPitch(p);
                  speechService.setPitch(p);
                }}
                className="w-full accent-pink-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 select-none">
                <span>Deeper</span>
                <span>Default</span>
                <span>Cute Elevated</span>
              </div>
            </div>

            {/* Speech Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs select-none">
                <span className="text-zinc-300">Speech Cadence Rate:</span>
                <span className="text-cyan-400 font-bold">{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={speechRate}
                onChange={(e) => {
                  const r = parseFloat(e.target.value);
                  setSpeechRate(r);
                  speechService.setSpeechRate(r);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Voice Preview Button */}
            <button
              type="button"
              onClick={handleVoicePreview}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-200 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            >
              <Play className="w-4 h-4 text-pink-400 fill-pink-400" />
              <span>PREVIEW COMPANION VOICE OUTPUT</span>
            </button>
          </div>

          {/* Wake Word Activation */}
          <div className="p-5 rounded-xl bg-[#060c20]/90 border border-cyan-900/40 space-y-4">
            <h2 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Offline Wake-Word Pipeline</span>
            </h2>

            <div>
              <label className="text-xs text-zinc-300 block mb-1">Wake Word Activation Phrase:</label>
              <input
                type="text"
                value={wakePhrase}
                onChange={(e) => {
                  setWakePhrase(e.target.value);
                  wakeWordEngine.setWakePhrase(e.target.value);
                }}
                className="w-full px-3 py-2 rounded bg-black/60 border border-cyan-950 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Offline Zipformer keyword spotting runs locally. Zero audio stream to cloud.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs select-none">
                <span className="text-zinc-300">Acoustic Sensitivity:</span>
                <span className="text-cyan-400 font-bold">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={sensitivity}
                onChange={(e) => {
                  setSensitivity(parseInt(e.target.value));
                  wakeWordEngine.setSensitivity(parseInt(e.target.value));
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Ethical AI Girlfriend Boundary Notice */}
          <div className="p-4 rounded-xl bg-black/40 border border-cyan-950 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Truthful AI Companion Boundary</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Break Point participates in affectionate, playful companionship while remaining completely honest
              that she is an AI with no human biology, consciousness, or emotional vulnerability. She will never use guilt,
              jealousy, or manipulation, and actively supports your real-world relationships, goals, and growth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
