import {
  Conversation,
  ChatMessage,
  MemoryItem,
  MemoryCategory,
  ToolExecutionAudit,
  Reminder,
  ResearchNote
} from '../../types';

export class MemoryDatabase {
  private conversations: Map<string, Conversation> = new Map();
  private memories: Map<string, MemoryItem> = new Map();
  private toolAudits: ToolExecutionAudit[] = [];
  private reminders: Map<string, Reminder> = new Map();
  private researchNotes: Map<string, ResearchNote> = new Map();
  private isSavingEnabled: boolean = true;

  constructor() {
    this.loadFromStorage();
    this.seedDefaultMemoriesIfEmpty();
  }

  private loadFromStorage() {
    try {
      const convos = localStorage.getItem('breakpoint_db_conversations');
      if (convos) {
        const parsed: Conversation[] = JSON.parse(convos);
        parsed.forEach(c => this.conversations.set(c.id, c));
      }

      const mems = localStorage.getItem('breakpoint_db_memories');
      if (mems) {
        const parsed: MemoryItem[] = JSON.parse(mems);
        parsed.forEach(m => this.memories.set(m.id, m));
      }

      const audits = localStorage.getItem('breakpoint_db_tool_audits');
      if (audits) {
        this.toolAudits = JSON.parse(audits);
      }

      const rems = localStorage.getItem('breakpoint_db_reminders');
      if (rems) {
        const parsed: Reminder[] = JSON.parse(rems);
        parsed.forEach(r => this.reminders.set(r.id, r));
      }

      const notes = localStorage.getItem('breakpoint_db_research_notes');
      if (notes) {
        const parsed: ResearchNote[] = JSON.parse(notes);
        parsed.forEach(n => this.researchNotes.set(n.id, n));
      }

      const savingPref = localStorage.getItem('breakpoint_memory_saving_enabled');
      if (savingPref !== null) {
        this.isSavingEnabled = savingPref === 'true';
      }
    } catch (e) {
      console.warn('Failed to load local database storage:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem('breakpoint_db_conversations', JSON.stringify(Array.from(this.conversations.values())));
      localStorage.setItem('breakpoint_db_memories', JSON.stringify(Array.from(this.memories.values())));
      localStorage.setItem('breakpoint_db_tool_audits', JSON.stringify(this.toolAudits.slice(-200)));
      localStorage.setItem('breakpoint_db_reminders', JSON.stringify(Array.from(this.reminders.values())));
      localStorage.setItem('breakpoint_db_research_notes', JSON.stringify(Array.from(this.researchNotes.values())));
      localStorage.setItem('breakpoint_memory_saving_enabled', String(this.isSavingEnabled));
    } catch (e) {
      console.error('Failed to persist database:', e);
    }
  }

  private seedDefaultMemoriesIfEmpty() {
    if (this.memories.size === 0) {
      const initial: MemoryItem[] = [
        {
          id: 'mem_init_1',
          category: 'preference',
          content: 'User prefers concise, articulate responses with JARVIS technical cadence.',
          provenance: 'System Initialization',
          confidence: 1.0,
          tags: ['communication', 'persona'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          verifiedByUser: true
        },
        {
          id: 'mem_init_2',
          category: 'goal',
          content: 'Project Break Point: Personal AI Desktop Assistant with Tony Stark JARVIS capabilities.',
          provenance: 'System Directive',
          confidence: 1.0,
          tags: ['project', 'break-point'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          verifiedByUser: true
        },
        {
          id: 'mem_init_3',
          category: 'fact',
          content: 'Operating System: Windows x64. Local Wake Phrase: "Break Point".',
          provenance: 'Environment Discovery',
          confidence: 1.0,
          tags: ['system', 'environment'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          verifiedByUser: true
        }
      ];
      initial.forEach(m => this.memories.set(m.id, m));
      this.persist();
    }
  }

  // === Privacy & Controls ===
  isMemorySavingEnabled(): boolean {
    return this.isSavingEnabled;
  }

  setMemorySavingEnabled(enabled: boolean) {
    this.isSavingEnabled = enabled;
    this.persist();
  }

  private filterSecrets(content: string): string {
    // Strip API keys, Bearer tokens, or passwords from memories
    return content
      .replace(/AIza[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
      .replace(/sk-[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
      .replace(/gsk_[0-9A-Za-z-_]{20,50}/gi, '[REDACTED_API_KEY]')
      .replace(/(password\s*[:=]\s*)[^\s]+/gi, '$1[REDACTED]');
  }

  // === Conversation Management ===
  saveConversation(convo: Conversation) {
    if (!this.isSavingEnabled) return;
    this.conversations.set(convo.id, convo);
    this.persist();
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  deleteConversation(id: string) {
    this.conversations.delete(id);
    this.persist();
  }

  clearAllConversations() {
    this.conversations.clear();
    this.persist();
  }

  // === Memory Management ===
  saveMemory(item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>): MemoryItem {
    if (!this.isSavingEnabled) {
      throw new Error('Memory saving is currently disabled in Privacy Settings.');
    }

    const cleanContent = this.filterSecrets(item.content);

    // Duplicate detection
    const existing = Array.from(this.memories.values()).find(
      m => m.content.toLowerCase() === cleanContent.toLowerCase()
    );

    if (existing) {
      existing.updatedAt = new Date().toISOString();
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.provenance = `${existing.provenance} | Re-observed: ${new Date().toISOString().slice(0, 10)}`;
      this.persist();
      return existing;
    }

    const newMemory: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      content: cleanContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.memories.set(newMemory.id, newMemory);
    this.persist();
    return newMemory;
  }

  updateMemory(id: string, updates: Partial<MemoryItem>): MemoryItem | undefined {
    const mem = this.memories.get(id);
    if (!mem) return undefined;
    const updated = {
      ...mem,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.memories.set(id, updated);
    this.persist();
    return updated;
  }

  deleteMemory(id: string) {
    this.memories.delete(id);
    this.persist();
  }

  clearAllMemories() {
    this.memories.clear();
    this.persist();
  }

  getAllMemories(): MemoryItem[] {
    return Array.from(this.memories.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  searchMemories(query: string, category?: MemoryCategory): MemoryItem[] {
    const lower = query.toLowerCase();
    return Array.from(this.memories.values()).filter(m => {
      const matchCat = category ? m.category === category : true;
      const matchText = m.content.toLowerCase().includes(lower) || 
        m.tags.some((t: string) => t.toLowerCase().includes(lower)) ||
        m.provenance.toLowerCase().includes(lower);
      return matchCat && matchText;
    });
  }

  exportMemoriesMarkdown(): string {
    const mems = this.getAllMemories();
    let md = `# BREAK POINT — Long-Term Memory Vault Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
    const categories: MemoryCategory[] = ['preference', 'goal', 'decision', 'fact', 'context'];

    categories.forEach(cat => {
      const group = mems.filter(m => m.category === cat);
      if (group.length > 0) {
        md += `## ${cat.toUpperCase()}S (${group.length})\n`;
        group.forEach(m => {
          md += `- **${m.content}**\n  *Provenance: ${m.provenance} | Confidence: ${Math.round(m.confidence * 100)}% | Tags: ${m.tags.join(', ')}*\n\n`;
        });
      }
    });
    return md;
  }

  // === Tool Auditing ===
  logToolExecution(audit: Omit<ToolExecutionAudit, 'id'>) {
    const entry: ToolExecutionAudit = {
      ...audit,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    };
    this.toolAudits.unshift(entry);
    if (this.toolAudits.length > 500) this.toolAudits.pop();
    this.persist();
  }

  getToolAudits(): ToolExecutionAudit[] {
    return [...this.toolAudits];
  }

  clearToolAudits() {
    this.toolAudits = [];
    this.persist();
  }

  // === Reminders / Tasks ===
  saveReminder(r: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
    const newRem: Reminder = {
      ...r,
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.reminders.set(newRem.id, newRem);
    this.persist();
    return newRem;
  }

  getAllReminders(): Reminder[] {
    return Array.from(this.reminders.values()).sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    );
  }

  updateReminderStatus(id: string, status: Reminder['status']) {
    const rem = this.reminders.get(id);
    if (rem) {
      rem.status = status;
      this.persist();
    }
  }

  deleteReminder(id: string) {
    this.reminders.delete(id);
    this.persist();
  }

  // === Research Notes ===
  saveResearchNote(query: string, summary: string, sources: ResearchNote['sources']): ResearchNote {
    const note: ResearchNote = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      query,
      summary,
      sources,
      savedAt: new Date().toISOString()
    };
    this.researchNotes.set(note.id, note);
    this.persist();
    return note;
  }

  getAllResearchNotes(): ResearchNote[] {
    return Array.from(this.researchNotes.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  }

  deleteResearchNote(id: string) {
    this.researchNotes.delete(id);
    this.persist();
  }
}

export const memoryDatabase = new MemoryDatabase();
