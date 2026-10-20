import React, { useState } from 'react';
import { Brain, Search, Plus, Trash2, Download, Moon, Shield, Tag } from 'lucide-react';
import { MemoryItem, MemoryCategory } from '../../types';
import { memoryDatabase } from '../../services/memory/database';
import { reflectionEngine } from '../../services/memory/reflectionEngine';

interface MemoryViewProps {
  memories: MemoryItem[];
  onRefreshMemories: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  memories,
  onRefreshMemories
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDreaming, setIsDreaming] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('fact');
  const [newProvenance, setNewProvenance] = useState('User Direct Input');
  const [showAddModal, setShowAddModal] = useState(false);

  const categories: Array<{ id: string; label: string; color: string }> = [
    { id: 'all', label: 'ALL MEMORIES', color: 'text-white' },
    { id: 'preference', label: 'PREFERENCES', color: 'text-cyan-400' },
    { id: 'goal', label: 'GOALS & PROJECTS', color: 'text-purple-400' },
    { id: 'decision', label: 'DECISIONS', color: 'text-amber-400' },
    { id: 'fact', label: 'FACTS', color: 'text-emerald-400' },
    { id: 'context', label: 'CONTEXT', color: 'text-blue-400' }
  ];

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery = !searchQuery || 
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.provenance.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    memoryDatabase.saveMemory({
      category: newCategory,
      content: newContent.trim(),
      provenance: newProvenance.trim() || 'Manual user registration',
      confidence: 1.0,
      tags: ['manual', newCategory],
      verifiedByUser: true
    });

    setNewContent('');
    setShowAddModal(false);
    onRefreshMemories();
  };

  const handleDelete = (id: string) => {
    memoryDatabase.deleteMemory(id);
    onRefreshMemories();
  };

  const handleTriggerDreaming = async () => {
    setIsDreaming(true);
    try {
      const res = await reflectionEngine.runReflectionJob();
      alert(`Cognitive Reflection Complete: Synthesized ${res.proposed.length} proposed memories (${res.added} auto-archived with confidence >= 80%).`);
      onRefreshMemories();
    } finally {
      setIsDreaming(false);
    }
  };

  const handleExportMarkdown = () => {
    const md = memoryDatabase.exportMemoriesMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakpoint_memory_vault_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-breakpoint-panelBorder pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-breakpoint-cyan" />
            <h1 className="text-lg font-hud font-bold tracking-wider text-white">
              LONG-TERM MEMORY VAULT (SQLITE)
            </h1>
          </div>
          <p className="text-xs font-mono text-breakpoint-textMuted mt-0.5">
            Indexed SQLite persistence • Full-Text Search • Strict Provenance • Anti-Secret Sanitization
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleTriggerDreaming}
            disabled={isDreaming}
            className="px-3 py-1.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 hover:text-white flex items-center gap-1.5 shadow-[0_0_12px_rgba(191,90,242,0.2)] disabled:opacity-50 transition-all"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{isDreaming ? 'DREAMING...' : 'TRIGGER COGNITIVE REFLECTION'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.15)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD MEMORY</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT (.MD)</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 font-mono">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by keyword, tag, or provenance..."
            className="w-full pl-9 pr-4 py-2 rounded bg-black/50 border border-breakpoint-panelBorder text-xs text-white focus:outline-none focus:border-breakpoint-cyan transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-cyan-950/70 border border-cyan-500/50 text-cyan-300'
                  : 'bg-black/30 border border-breakpoint-panelBorder text-zinc-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs font-mono text-zinc-500 hud-panel rounded-lg">
            No memories match the current filter parameters.
          </div>
        ) : (
          filteredMemories.map((m) => (
            <div
              key={m.id}
              className="hud-panel p-4 rounded-lg flex flex-col justify-between space-y-3 border border-breakpoint-panelBorder hover:border-cyan-500/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      m.category === 'preference' ? 'bg-cyan-950/60 border border-cyan-700/60 text-cyan-300' :
                      m.category === 'goal' ? 'bg-purple-950/60 border border-purple-700/60 text-purple-300' :
                      m.category === 'decision' ? 'bg-amber-950/60 border border-amber-700/60 text-amber-300' :
                      'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300'
                    }`}
                  >
                    {m.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500">
                      CONFIDENCE: {Math.round(m.confidence * 100)}%
                    </span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-zinc-200 leading-relaxed font-mono font-medium">
                  {m.content}
                </div>
              </div>

              {/* Provenance & Tags */}
              <div className="pt-2 border-t border-breakpoint-panelBorder text-[10px] font-mono text-zinc-400 space-y-1">
                <div className="flex items-center gap-1 truncate text-zinc-500">
                  <Shield className="w-3 h-3 text-cyan-500/70" />
                  <span>PROVENANCE: {m.provenance}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3 h-3 text-purple-400" />
                  {m.tags.map((t: string, idx: number) => (
                    <span key={idx} className="px-1.5 py-0.2 rounded bg-black/40 border border-zinc-700 text-zinc-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMemory}
            className="hud-panel w-full max-w-md p-6 rounded-lg space-y-4 border border-cyan-500/50"
          >
            <h3 className="text-sm font-hud font-bold text-white tracking-wider">
              SAVE NEW MEMORY ENTRY
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Category:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                >
                  <option value="fact">Fact</option>
                  <option value="preference">Preference</option>
                  <option value="goal">Goal / Project</option>
                  <option value="decision">Decision</option>
                  <option value="context">Context</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Memory Content:</label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter durable fact, preference, or goal..."
                  className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Provenance Source:</label>
                <input
                  type="text"
                  value={newProvenance}
                  onChange={(e) => setNewProvenance(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-zinc-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-breakpoint-cyan text-black hover:bg-cyan-300"
              >
                COMMIT TO VAULT
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
