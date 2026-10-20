import { memoryDatabase } from './database';
import { Conversation, MemoryItem, MemoryCategory } from '../../types';

export interface ProposedMemory {
  category: MemoryCategory;
  content: string;
  confidence: number;
  provenance: string;
  tags: string[];
  reasoning: string;
}

export class ReflectionEngine {
  private isDreaming: boolean = false;
  private lastDreamTime?: string;

  getLastDreamTime(): string | undefined {
    return this.lastDreamTime;
  }

  isReflecting(): boolean {
    return this.isDreaming;
  }

  async runReflectionJob(): Promise<{ proposed: ProposedMemory[]; added: number }> {
    this.isDreaming = true;
    try {
      // Simulate cognitive synthesis delay
      await new Promise(r => setTimeout(r, 600));

      const conversations = memoryDatabase.getAllConversations();
      const existingMemories = memoryDatabase.getAllMemories();
      const proposed: ProposedMemory[] = [];

      // Scan conversations for preferences, goals, and recurring patterns
      for (const convo of conversations) {
        for (const msg of convo.messages) {
          if (msg.role !== 'user') continue;
          const text = msg.content;
          const lower = text.toLowerCase();

          // 1. Detect Preference
          if (lower.includes('i prefer') || lower.includes('i like') || lower.includes('i always want') || lower.includes("don't like")) {
            const prefContent = text.trim();
            if (!this.isDuplicate(prefContent, existingMemories)) {
              proposed.push({
                category: 'preference',
                content: `User stated preference: "${prefContent.slice(0, 120)}"`,
                confidence: 0.85,
                provenance: `Extracted from conversation "${convo.title}" at ${msg.timestamp}`,
                tags: ['preference', 'user-pattern'],
                reasoning: 'User explicitly stated a recurring preference or operational constraint.'
              });
            }
          }

          // 2. Detect Ongoing Goal / Project
          if (lower.includes('my goal') || lower.includes('working on') || lower.includes('building a') || lower.includes('developing')) {
            const goalContent = text.trim();
            if (!this.isDuplicate(goalContent, existingMemories)) {
              proposed.push({
                category: 'goal',
                content: `Active project/goal: "${goalContent.slice(0, 120)}"`,
                confidence: 0.8,
                provenance: `Observed during session "${convo.title}"`,
                tags: ['goal', 'workstream'],
                reasoning: 'Identified long-term target or developmental objective.'
              });
            }
          }

          // 3. Detect Key Decision
          if (lower.includes('decided to') || lower.includes("we'll go with") || lower.includes('let us choose') || lower.includes('commit to')) {
            const decisionContent = text.trim();
            if (!this.isDuplicate(decisionContent, existingMemories)) {
              proposed.push({
                category: 'decision',
                content: `Architecture/Strategy Decision: "${decisionContent.slice(0, 120)}"`,
                confidence: 0.9,
                provenance: `Recorded from decision thread in "${convo.title}"`,
                tags: ['decision', 'architecture'],
                reasoning: 'User finalized an engineering or workflow decision.'
              });
            }
          }
        }
      }

      // Add high-confidence memories automatically, keep lower confidence for user review
      let added = 0;
      if (memoryDatabase.isMemorySavingEnabled()) {
        for (const prop of proposed) {
          if (prop.confidence >= 0.8) {
            memoryDatabase.saveMemory({
              category: prop.category,
              content: prop.content,
              provenance: prop.provenance,
              confidence: prop.confidence,
              tags: prop.tags,
              verifiedByUser: false
            });
            added++;
          }
        }
      }

      this.lastDreamTime = new Date().toISOString();
      return { proposed, added };
    } finally {
      this.isDreaming = false;
    }
  }

  private isDuplicate(text: string, existing: MemoryItem[]): boolean {
    const clean = text.toLowerCase();
    return existing.some(m => m.content.toLowerCase().includes(clean) || clean.includes(m.content.toLowerCase()));
  }
}

export const reflectionEngine = new ReflectionEngine();
