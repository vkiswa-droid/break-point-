import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryDatabase } from '../src/services/memory/database';

describe('SQLite Memory Vault Persistence, Provenance & Privacy', () => {
  let db: MemoryDatabase;

  beforeEach(() => {
    localStorage.clear();
    db = new MemoryDatabase();
  });

  it('should save a memory with category, confidence, and provenance', () => {
    const mem = db.saveMemory({
      category: 'preference',
      content: 'User prefers dark mode and high cybernetic contrast.',
      provenance: 'Settings configuration on 2026-10-19',
      confidence: 0.95,
      tags: ['ui', 'display']
    });

    expect(mem.id).toBeDefined();
    expect(mem.content).toContain('dark mode');
    expect(mem.category).toBe('preference');
    expect(mem.confidence).toBe(0.95);
  });

  it('should detect duplicate memories and update confidence instead of duplicating', () => {
    const countBefore = db.getAllMemories().length;
    db.saveMemory({
      category: 'goal',
      content: 'Complete Break Point desktop assistant milestone.',
      provenance: 'Initial sprint',
      confidence: 0.8,
      tags: ['project']
    });

    db.saveMemory({
      category: 'goal',
      content: 'Complete Break Point desktop assistant milestone.',
      provenance: 'Sprint review',
      confidence: 0.8,
      tags: ['project']
    });

    const memories = db.getAllMemories();
    const matches = memories.filter(m => m.content.includes('Complete Break Point desktop assistant milestone'));
    expect(matches.length).toBe(1);
    expect(matches[0].confidence).toBeGreaterThan(0.8);
  });

  it('should sanitize credentials and secrets before storing in memory', () => {
    const mem = db.saveMemory({
      category: 'fact',
      content: 'Test key AIzaSyD-123456789012345678901234567890 and password: secretpassword123',
      provenance: 'Audit scan',
      confidence: 1.0,
      tags: ['security']
    });

    expect(mem.content).not.toContain('AIzaSyD-123456789012345678901234567890');
    expect(mem.content).not.toContain('secretpassword123');
    expect(mem.content).toContain('[REDACTED');
  });

  it('should respect memory saving disabled preference', () => {
    db.setMemorySavingEnabled(false);
    expect(db.isMemorySavingEnabled()).toBe(false);

    expect(() => {
      db.saveMemory({
        category: 'fact',
        content: 'Should not be saved',
        provenance: 'Test',
        confidence: 0.5,
        tags: []
      });
    }).toThrow(/disabled/i);
  });

  it('should search memories by query and category filter', () => {
    db.saveMemory({
      category: 'decision',
      content: 'Selected Electron + React architecture for native OS tray integration.',
      provenance: 'Architecture Meeting',
      confidence: 1.0,
      tags: ['architecture', 'desktop']
    });

    const searchResults = db.searchMemories('Electron');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].content).toContain('Electron');

    const catResults = db.searchMemories('Electron', 'decision');
    expect(catResults.length).toBe(1);

    const emptyResults = db.searchMemories('Electron', 'preference');
    expect(emptyResults.length).toBe(0);
  });
});
