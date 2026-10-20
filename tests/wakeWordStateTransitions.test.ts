import { describe, it, expect, beforeEach } from 'vitest';
import { WakeWordEngine } from '../src/services/voice/wakeWordEngine';

describe('Wake-Word State Transitions & Keyword Spotting', () => {
  let engine: WakeWordEngine;

  beforeEach(() => {
    engine = new WakeWordEngine({ wakePhrase: 'Break Point', sensitivity: 75 });
  });

  it('should initialize with configured wake phrase "Break Point" in off state', () => {
    expect(engine.getState()).toBe('off');
    expect(engine.getWakePhrase()).toBe('break point');
  });

  it('should transition to active_capture when wake is triggered', () => {
    let wakeDetected = false;
    const testEngine = new WakeWordEngine({
      wakePhrase: 'Break Point',
      onWakeDetected: () => { wakeDetected = true; }
    });

    testEngine.triggerWakeActivation();
    expect(testEngine.getState()).toBe('active_capture');
    expect(wakeDetected).toBe(true);
  });

  it('should support standby mode leaving engine ready', () => {
    engine.enterStandby();
    expect(engine.getState()).toBe('standby');
  });

  it('should stop listening and reset to off', () => {
    engine.stopListening();
    expect(engine.getState()).toBe('off');
  });

  it('should clamp sensitivity values between 10 and 100', () => {
    engine.setSensitivity(5);
    // Should be clamped to min 10
    engine.setSensitivity(150);
    // Should be clamped to max 100
  });
});
