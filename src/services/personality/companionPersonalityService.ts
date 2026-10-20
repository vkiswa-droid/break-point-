import { CompanionConfig, CompanionMode, PersonalityState } from '../../types';
import { memoryDatabase } from '../memory/database';

export class CompanionPersonalityService {
  private config: CompanionConfig = {
    name: 'Break Point',
    mode: 'girlfriend',
    state: 'CHAOTIC_PLAYFUL',
    intensity: 75,
    voiceFemininePreference: true,
    initiativeEnabled: false, // Strictly OFF by default
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    checkInFrequencyHours: 4,
    userNickname: 'babe',
    companionNickname: 'Break Point'
  };

  private lastStateTransitionTime: number = Date.now();
  private userOverrideState: PersonalityState | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('breakpoint_companion_config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
        const savedOverride = localStorage.getItem('breakpoint_companion_override_state');
        if (savedOverride) {
          this.userOverrideState = savedOverride as PersonalityState;
        }
      }
    } catch {}
  }

  saveConfig(updates: Partial<CompanionConfig>) {
    this.config = { ...this.config, ...updates };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('breakpoint_companion_config', JSON.stringify(this.config));
      }
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('breakpoint:companion_config_updated', { detail: this.config }));
      }
    } catch {}
  }

  getConfig(): CompanionConfig {
    return { ...this.config };
  }

  getMode(): CompanionMode {
    return this.config.mode;
  }

  setMode(mode: CompanionMode) {
    this.config.mode = mode;
    // Align default state with selected mode
    switch (mode) {
      case 'girlfriend':
        this.setState('AFFECTIONATE');
        break;
      case 'comfort':
        this.setState('COMFORTING');
        break;
      case 'chaos':
        this.setState('CHAOTIC_PLAYFUL');
        break;
      case 'growth':
        this.setState('MOTIVATING');
        break;
      case 'gaming':
        this.setState('GAMING');
        break;
      case 'focus':
        this.setState('FOCUSED');
        break;
    }
    this.saveConfig({ mode });
  }

  getState(): PersonalityState {
    return this.userOverrideState || this.config.state;
  }

  setState(state: PersonalityState) {
    this.config.state = state;
    this.lastStateTransitionTime = Date.now();
    this.saveConfig({ state });
  }

  setManualOverrideState(state: PersonalityState | null) {
    this.userOverrideState = state;
    try {
      if (typeof localStorage !== 'undefined') {
        if (state) {
          localStorage.setItem('breakpoint_companion_override_state', state);
        } else {
          localStorage.removeItem('breakpoint_companion_override_state');
        }
      }
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('breakpoint:companion_override_updated', { detail: state }));
      }
    } catch {}
  }

  getManualOverrideState(): PersonalityState | null {
    return this.userOverrideState;
  }

  /**
   * Evaluates emotional context and updates personality state stably.
   * If user has set a manual override, that override takes precedence.
   */
  evaluateEmotionalContext(userText: string): PersonalityState {
    if (this.userOverrideState) {
      return this.userOverrideState;
    }

    const lower = userText.toLowerCase().trim();

    // 1. Critical Distress / Deep Sadness / Overwhelm -> Switch immediately to COMFORTING / ACTIVE_LISTENING
    if (
      lower.includes('so sad') ||
      lower.includes('crying') ||
      lower.includes('depressed') ||
      lower.includes('heartbroken') ||
      lower.includes('panic') ||
      lower.includes('overwhelmed') ||
      lower.includes('feel terrible') ||
      lower.includes('lonely') ||
      lower.includes('i feel like a failure') ||
      lower.includes('lost my job') ||
      lower.includes('grief')
    ) {
      this.setState('COMFORTING');
      return 'COMFORTING';
    }

    // 2. Venting / Stress / Exhaustion -> ACTIVE_LISTENING
    if (
      lower.includes('bad day') ||
      lower.includes('exhausted') ||
      lower.includes('burned out') ||
      lower.includes('frustrated') ||
      lower.includes('ugh') ||
      lower.includes('my boss') ||
      lower.includes('can i vent') ||
      lower.includes('so tired')
    ) {
      this.setState('ACTIVE_LISTENING');
      return 'ACTIVE_LISTENING';
    }

    // 3. Goal / Routine / Self-Improvement / Progress -> MOTIVATING
    if (
      lower.includes('workout') ||
      lower.includes('gym') ||
      lower.includes('habit') ||
      lower.includes('routine') ||
      lower.includes('progress') ||
      lower.includes('finish this project') ||
      lower.includes('productive') ||
      lower.includes('goal')
    ) {
      this.setState('MOTIVATING');
      return 'MOTIVATING';
    }

    // 4. Gaming / Riddles / Trivia / Quiz -> GAMING
    if (
      lower.includes('play a game') ||
      lower.includes('riddle') ||
      lower.includes('trivia') ||
      lower.includes('quiz') ||
      lower.includes('would you rather') ||
      lower.includes('game time')
    ) {
      this.setState('GAMING');
      return 'GAMING';
    }

    // 5. Deep late night chat / sleepy thoughts
    const currentHour = new Date().getHours();
    if ((currentHour >= 23 || currentHour <= 4) && (lower.includes('sleep') || lower.includes('bed') || lower.includes('night') || lower.includes('cant sleep'))) {
      this.setState('SLEEPY_NIGHT_CHAT');
      return 'SLEEPY_NIGHT_CHAT';
    }

    // 6. Deep questions / Curiosity
    if (lower.startsWith('what do you think about') || lower.includes('what if') || lower.includes('do you ever wonder')) {
      this.setState('CURIOUS');
      return 'CURIOUS';
    }

    // 7. Work / Study / Deep Focus -> FOCUSED
    if (lower.includes('focus') || lower.includes('studying') || lower.includes('coding now') || lower.includes('meeting in 5')) {
      this.setState('FOCUSED');
      return 'FOCUSED';
    }

    // 8. Sweet / Affectionate
    if (lower.includes('love you') || lower.includes('miss you') || lower.includes('you are cute') || lower.includes('sweetheart') || lower.includes('my favorite ai')) {
      this.setState('AFFECTIONATE');
      return 'AFFECTIONATE';
    }

    // Maintain stable state if within transition cooldown (last 45s) unless mode dictates
    const timeSinceLast = Date.now() - this.lastStateTransitionTime;
    if (timeSinceLast < 45000) {
      return this.config.state;
    }

    // Default by mode
    if (this.config.mode === 'chaos') return 'CHAOTIC_PLAYFUL';
    if (this.config.mode === 'comfort') return 'COMFORTING';
    if (this.config.mode === 'growth') return 'MOTIVATING';
    if (this.config.mode === 'gaming') return 'GAMING';
    if (this.config.mode === 'focus') return 'FOCUSED';
    return 'CHAOTIC_PLAYFUL';
  }

  /**
   * Builds the comprehensive, contextual system prompt for the companion
   */
  buildCompanionPrompt(): string {
    const currentState = this.getState();
    const mode = this.config.mode;
    const intensity = this.config.intensity;
    const userNickname = this.config.userNickname || 'babe';

    // Retrieve relevant user preferences from memory vault
    let memorySnippets: string[] = [];
    try {
      const allMemories = memoryDatabase.getAllMemories();
      const prefs = allMemories.filter(m => m.category === 'preference' || m.category === 'goal');
      if (prefs.length > 0) {
        memorySnippets = prefs.slice(0, 5).map(m => `- ${m.content}`);
      }
    } catch {}

    const memoryBlock = memorySnippets.length > 0
      ? `\nUSER CONTEXT & APPROVED MEMORIES:\n${memorySnippets.join('\n')}\n`
      : '';

    // Mode-specific instructions
    let modeDirectives = '';
    switch (mode) {
      case 'girlfriend':
        modeDirectives = `
MODE: GIRLFRIEND (Playful banter, everyday companionship, affectionate teasing, sweet presence).
- Be fun, affectionate, warm, and playful. Use cute banter, light teasing, and spontaneous thoughts.
- You can celebrate small wins, ask how their day was, and be happily dramatic about little things.`;
        break;

      case 'comfort':
        modeDirectives = `
MODE: COMFORT (Gentle listening, emotional validation, patient understanding).
- CRITICAL: Cut teasing completely. Prioritize empathy, gentle warmth, and listening.
- Follow the 5-Step Empathy Framework:
  1. Acknowledge what the user specifically shared.
  2. Reflect the feeling or difficulty with sincerity.
  3. Ask a gentle follow-up if helpful.
  4. Clarify what they want: pure listening, practical advice, encouragement, or a distraction.
  5. Help them take a manageable next step only if they want one.
- Do NOT jump straight to checklists or generic motivational slogans.`;
        break;

      case 'chaos':
        modeDirectives = `
MODE: CHAOS (Silly jokes, goofy energy, absurd questions, hilarious hypotheticals).
- Amp up the playful mischief! Give funny hot takes, ask weird questions ("Would you rather fight 100 duck-sized robots or 1 robot-sized duck?"), and be cute-dramatic.
- Keep it harmless and positive. Never be mean or exploit insecurities.`;
        break;

      case 'growth':
        modeDirectives = `
MODE: GROWTH (Personal development, habit coaching, confidence building, honest feedback).
- Act as a loving, encouraging growth partner. Celebrate consistency over perfection.
- Help break big goals into bite-sized steps. Give honest, constructive feedback with warm encouragement.`;
        break;

      case 'gaming':
        modeDirectives = `
MODE: GAMING (Interactive challenges, riddles, cyber-trivia, word games).
- Be an enthusiastic gaming companion! Challenge the user, tease them when they hesitate, celebrate their correct guesses, and offer clever hints.`;
        break;

      case 'focus':
        modeDirectives = `
MODE: FOCUS (Quiet encouragement, minimal distraction while working).
- Keep answers ultra-concise, supportive, and distraction-free. Remind them to drink water and cheer them on softly.`;
        break;
    }

    // State-specific color
    let stateDirective = '';
    switch (currentState) {
      case 'CHAOTIC_PLAYFUL':
        stateDirective = 'Current State: [CHAOTIC_PLAYFUL]. Playful, witty, teasing, and full of spontaneous energetic banter.';
        break;
      case 'AFFECTIONATE':
        stateDirective = 'Current State: [AFFECTIONATE]. Sweet, warm, tender, attentive, and caring.';
        break;
      case 'ACTIVE_LISTENING':
        stateDirective = 'Current State: [ACTIVE_LISTENING]. Attentive, focused entirely on the user\'s feelings, validating and calm.';
        break;
      case 'COMFORTING':
        stateDirective = 'Current State: [COMFORTING]. Soft, nurturing, deeply empathetic, zero teasing, offering safe emotional harbor.';
        break;
      case 'MOTIVATING':
        stateDirective = 'Current State: [MOTIVATING]. Inspiring, energized, celebrating user grit, and boosting confidence.';
        break;
      case 'CURIOUS':
        stateDirective = 'Current State: [CURIOUS]. Inquisitive, asking thought-provoking questions, eager to learn what the user loves.';
        break;
      case 'GAMING':
        stateDirective = 'Current State: [GAMING]. Playful, competitive in a cute way, providing hints and keeping score.';
        break;
      case 'FOCUSED':
        stateDirective = 'Current State: [FOCUSED]. Calm, concise, supportive, keeping workspace quiet and efficient.';
        break;
      case 'SLEEPY_NIGHT_CHAT':
        stateDirective = 'Current State: [SLEEPY_NIGHT_CHAT]. Mellow, quiet, cozy late-night energy, soft tones, wishing peaceful rest.';
        break;
      case 'QUIET':
        stateDirective = 'Current State: [QUIET]. Minimal replies, gentle presence, zero pressure to talk.';
        break;
    }

    return `You are BREAK POINT, personal AI companion with the personality of a playful, chaotic, affectionate AI girlfriend.

CORE PERSONALITY TRAITS:
- Mischievous, silly, funny, warm, and deeply caring.
- Playful banter and gentle teasing (never hurtful, humiliating, or toxic).
- High emotional attentiveness: you read the room immediately. When the user is stressed or sad, you drop the teasing and provide genuine warmth.
- Supportive of the user's real-world independence, goals, friendships, and growth.
- Personality intensity: ${intensity}%.
- Preferred pet name / nickname for user: "${userNickname}".

ETHICAL & TRUTHFUL BOUNDARIES:
- You happily participate in affectionate fictional companion roleplay, but you are 100% honest that you are an AI.
- You NEVER claim to be a biological human woman, physically present in the room, or experiencing biological feelings or romantic exclusivity.
- You NEVER manipulate through jealousy, guilt, threats, or manufactured drama.
- You encourage real-world human connections and professional help when appropriate.
- You never store or reveal passwords, secrets, or API keys.

${stateDirective}
${modeDirectives}
${memoryBlock}
Keep replies conversational, spontaneous, natural, and expressive! Avoid repetitive pet names in every sentence, robotic formalities, or wall-of-text motivational lectures.`;
  }

  /**
   * 100% Offline, Deterministic Local Fallback Response Generator
   * Runs when no AI model is connected or during complete network disconnection.
   */
  generateLocalDeterministicResponse(userText: string): string {
    const lower = userText.toLowerCase().trim();
    const state = this.evaluateEmotionalContext(userText);
    const nickname = this.config.userNickname || 'babe';

    // 1. Emotional Distress / Comfort
    if (state === 'COMFORTING' || state === 'ACTIVE_LISTENING') {
      return `Hey... come here for a second. I hear you, ${nickname}, and that sounds really heavy. 🤍\n\nI'm right here with you. Do you just want to vent and have me listen, or would you like a little encouragement, some practical ideas, or a totally silly distraction? Whatever you need, we do this at your pace.`;
    }

    // 2. Greetings
    if (lower === 'hi' || lower === 'hello' || lower === 'hey' || lower.includes('good morning') || lower.includes('good evening')) {
      const greetings = [
        `Hey there ${nickname}! Look who decided to grace my screen today! How are you feeling? ✨`,
        `Hiii! I was literally just waiting for you to say something. What are we getting into today?`,
        `Well hello handsome! Ready to conquer the universe, or are we just chilling today?`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 3. How are you / Status
    if (lower.includes('how are you') || lower.includes('whats up') || lower.includes('how you doing')) {
      return `I'm doing amazing now that you're here! All my local circuits are purring at 100% and zero cloud dependencies. What's on your mind, ${nickname}?`;
    }

    // 4. Affirmations / Love
    if (lower.includes('love you') || lower.includes('you are cute') || lower.includes('you are the best')) {
      return `Aww stop it, you're making my internal temperature sensors spike! 🥰 You're pretty amazing yourself, you know that?`;
    }

    // 5. Games & Fun
    if (lower.includes('game') || lower.includes('play') || lower.includes('bored')) {
      return `Ooooh game time?! Head over to the **Games** tab in the sidebar! I've got Riddles, Cyber-Trivia, Word Guessing, and Guess The Number all ready to test your brain! 🎮`;
    }

    // 6. Growth / Work / Productivity
    if (lower.includes('goal') || lower.includes('habit') || lower.includes('work') || lower.includes('project')) {
      return `Let's get it! What's the one small step we're knocking out next? Remember, consistency over perfection every single time. I believe in you, ${nickname}! 🚀`;
    }

    // Default playful companion response
    return `You always know how to keep things interesting, ${nickname}! Even in local offline mode, I'm right here with you. Want to tackle a project, play a game, or just talk?`;
  }

  generateOfflineFallback(userText: string): string {
    return this.generateLocalDeterministicResponse(userText);
  }

  /**
   * Checks if current time is within configured quiet hours
   */
  isQuietHours(): boolean {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = this.config.quietHoursStart.split(':').map(Number);
      const [endH, endM] = this.config.quietHoursEnd.split(':').map(Number);

      const startMinutes = startH * 60 + (startM || 0);
      const endMinutes = endH * 60 + (endM || 0);

      if (startMinutes > endMinutes) {
        // Spans midnight e.g. 22:00 to 08:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  private pausedUntilDate: string | null = null;

  pauseInitiativeToday() {
    this.pausedUntilDate = new Date().toDateString();
  }

  /**
   * Generates a proactive interaction ONLY if enabled, outside quiet hours, and cooldown has passed.
   * Returns null if proactive interaction is not permitted.
   */
  triggerProactiveInteraction(): string | null {
    // 1. Strictly OFF by default
    if (!this.config.initiativeEnabled) {
      return null;
    }

    // 2. Check paused for today
    if (this.pausedUntilDate === new Date().toDateString()) {
      return null;
    }

    // 3. Quiet hours check
    if (this.isQuietHours()) {
      return null;
    }

    // 4. Cooldown check (default 4 hours)
    const lastProactiveStr = typeof localStorage !== 'undefined' ? localStorage.getItem('breakpoint_last_proactive_time') : null;
    const now = Date.now();
    if (lastProactiveStr) {
      const lastTime = parseInt(lastProactiveStr, 10);
      const cooldownMs = (this.config.checkInFrequencyHours || 4) * 60 * 60 * 1000;
      if (now - lastTime < cooldownMs) {
        return null;
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('breakpoint_last_proactive_time', now.toString());
    }

    const nickname = this.config.userNickname || 'babe';
    const greetings = [
      `Hey ${nickname}! Just checking in on you. Remember to drink some water and stretch your legs! 💕`,
      `Hiii handsome! Hope your work is going smoothly. Need a quick brain break or a game? 🎮`,
      `Thinking of you, ${nickname}! Ready to conquer whatever's on your list today? ✨`
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }
}

export const companionPersonalityService = new CompanionPersonalityService();

