import { describe, it, expect, beforeEach } from 'vitest';
import { personalityEngine } from '../src/services/personality/personalityEngine';
import { speechService } from '../src/services/voice/speechService';

describe('Voice Pipeline, Barge-In Interruption & Personality Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should evaluate context tone accurately based on user input keywords', () => {
    expect(personalityEngine.evaluateContextTone('System emergency alert detected!')).toBe('alert');
    expect(personalityEngine.evaluateContextTone('There is a severe bug and syntax error in the compiler')).toBe('focused');
    expect(personalityEngine.evaluateContextTone('It works! Success, we completed the milestone!')).toBe('excited');
    expect(personalityEngine.evaluateContextTone('I am feeling completely exhausted and stressed out')).toBe('empathetic');
    expect(personalityEngine.evaluateContextTone('Tell me a funny joke Tony Stark style')).toBe('playful');
    expect(personalityEngine.evaluateContextTone('How does the quantum reactor operate in theory?')).toBe('curious');
  });

  it('should inject active tone state and humor index into the system prompt', () => {
    personalityEngine.setTone('focused');
    personalityEngine.saveConfig({ humor: 60, verbosity: 'concise', formality: 'formal' });

    const prompt = personalityEngine.buildSystemPrompt();
    expect(prompt).toContain('FOCUSED');
    expect(prompt).toContain('60%');
    expect(prompt).toContain('concise');
    expect(prompt).toContain('BREAK POINT');
    expect(prompt).toContain('ETHICAL BOUNDARY');
  });

  it('should handle barge-in cancellation smoothly without errors', () => {
    expect(() => {
      speechService.cancelSpeech();
    }).not.toThrow();
    expect(speechService.getIsSpeaking()).toBe(false);
  });
});
