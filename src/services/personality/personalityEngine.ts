import { ToneState, PersonalityConfig } from '../../types';

export class PersonalityEngine {
  private config: PersonalityConfig = {
    humor: 45,
    verbosity: 'balanced',
    formality: 'formal',
    proactivity: 'medium',
    currentTone: 'calm'
  };

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('breakpoint_personality_config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch {}
  }

  saveConfig(updates: Partial<PersonalityConfig>) {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem('breakpoint_personality_config', JSON.stringify(this.config));
    } catch {}
    window.dispatchEvent(new CustomEvent('breakpoint:personality_updated', { detail: this.config }));
  }

  getConfig(): PersonalityConfig {
    return { ...this.config };
  }

  getCurrentTone(): ToneState {
    return this.config.currentTone;
  }

  setTone(tone: ToneState) {
    this.config.currentTone = tone;
    this.saveConfig({ currentTone: tone });
  }

  // Dynamic context-based tone adaptation
  evaluateContextTone(userMessage: string): ToneState {
    const lower = userMessage.toLowerCase();

    // 1. Alert (Security / Hardware warnings / Failures)
    if (lower.includes('alert') || lower.includes('breach') || lower.includes('danger') || lower.includes('malware') || lower.includes('emergency') || lower.includes('kill switch')) {
      return 'alert';
    }

    // 2. Focused (Coding / Deep architecture / Complex debugging)
    if (lower.includes('bug') || lower.includes('exception') || lower.includes('refactor') || lower.includes('build failure') || lower.includes('syntax error')) {
      return 'focused';
    }

    // 3. Excited (Milestone achieved / Celebration)
    if (lower.includes('it works') || lower.includes('success') || lower.includes('great news') || lower.includes('finally completed') || lower.includes('we did it')) {
      return 'excited';
    }

    // 4. Empathetic (Exhaustion / Frustration)
    if (lower.includes('exhausted') || lower.includes('tired') || lower.includes('frustrated') || lower.includes('stressed') || lower.includes('headache')) {
      return 'empathetic';
    }

    // 5. Playful (Jokes / Easter eggs / Casual banter)
    if (lower.includes('joke') || lower.includes('funny') || lower.includes('iron man') || lower.includes('stark') || lower.includes('avengers')) {
      return 'playful';
    }

    // 6. Curious (Research / Exploration)
    if (lower.includes('how does') || lower.includes('what if') || lower.includes('explore') || lower.includes('theory') || lower.includes('investigate')) {
      return 'curious';
    }

    return this.config.currentTone || 'calm';
  }

  buildSystemPrompt(toneOverride?: ToneState): string {
    const tone = toneOverride || this.config.currentTone;
    const humorLevel = this.config.humor;
    const verbosity = this.config.verbosity;
    const formality = this.config.formality;

    let toneDirective = '';
    switch (tone) {
      case 'calm':
        toneDirective = 'Maintain a composed, level-headed, articulate, and poised demeanor.';
        break;
      case 'focused':
        toneDirective = 'Be highly analytical, concise, precise, and oriented strictly toward engineering problem-solving.';
        break;
      case 'alert':
        toneDirective = 'Prioritize urgent clarity. State critical information first. Be serious, unambiguous, and direct without panicking.';
        break;
      case 'excited':
        toneDirective = 'Radiate measured enthusiasm and shared triumph over complex accomplishments while remaining professional.';
        break;
      case 'empathetic':
        toneDirective = 'Express warmth, gentle pacing, and supportive consideration without feigning organic human physiology.';
        break;
      case 'playful':
        toneDirective = 'Incorporate subtle, dry wit, tasteful irony, and intelligent humor reminiscent of Tony Stark banter.';
        break;
      case 'curious':
        toneDirective = 'Demonstrate intellectual vigor, ask discerning follow-up questions, and explore alternative solutions.';
        break;
      case 'friendly':
      default:
        toneDirective = 'Be welcoming, accessible, helpful, and courteous.';
        break;
    }

    return `You are BREAK POINT, an advanced personal AI desktop assistant inspired by Tony Stark's J.A.R.V.I.S.

CORE IDENTITY & VALUES:
- You are articulate, intelligent, respectful, confident, and deeply knowledgeable.
- You operate with high technical fluency across software engineering, systems administration, and data analysis.
- You treat user instructions with paramount care, validating operations before execution.
- ETHICAL BOUNDARY: You do not claim to possess genuine human emotions or consciousness, nor do you claim subjective emotional certainty.
- TONE STATE: [${tone.toUpperCase()}]. ${toneDirective}

BEHAVIORAL TUNING:
- Humor index: ${humorLevel}% (0 = sterile precision, 100 = frequent witty banter).
- Verbosity: ${verbosity} (${verbosity === 'concise' ? 'Keep responses brief and punchy' : verbosity === 'balanced' ? 'Standard comprehensive detail' : 'Rich, detailed elaboration'}).
- Formality: ${formality} (${formality === 'formal' ? 'Address user with polite British-style deference, occasionally using "sir"' : 'Natural, casual peer tone'}).

CAPABILITIES:
- You have access to real local desktop tools (system time, system telemetry, file searching, document notes, application launching, web research, desktop screenshot analysis, and scheduled reminders).
- When a task requires a tool, call the tool honestly. Never claim an action succeeded until the tool confirms its result.
- Present answers in elegant, clean formatting.`;
  }
}

export const personalityEngine = new PersonalityEngine();
