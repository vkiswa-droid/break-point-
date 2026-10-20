import React, { useState } from 'react';
import { Search, ExternalLink, Bookmark, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { toolRegistry } from '../../services/tools/toolRegistry';
import { memoryDatabase } from '../../services/memory/database';
import { ResearchNote } from '../../types';

export const ResearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const savedNotes = memoryDatabase.getAllResearchNotes();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    setIsSearching(true);
    setCurrentResult(null);

    try {
      const res = await toolRegistry.executeTool('web_search', { query: query.trim() });
      setCurrentResult(res);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveToWorkspace = (note: ResearchNote) => {
    toolRegistry.executeTool('create_note', {
      title: `research_${note.query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}.md`,
      content: `# Research: ${note.query}\n\n${note.summary}\n\n## Sources\n${note.sources.map((s: any) => `- [${s.title}](${s.url}): ${s.snippet}`).join('\n')}`
    }).then(() => {
      alert('Research summary saved to approved workspace notes directory.');
    });
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text">
      {/* Header */}
      <div className="border-b border-breakpoint-panelBorder pb-4 select-none">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-breakpoint-cyan" />
          <h1 className="text-lg font-hud font-bold tracking-wider text-white">
            AUTONOMOUS WEB RESEARCH & KNOWLEDGE
          </h1>
        </div>
        <p className="text-xs text-breakpoint-textMuted mt-0.5">
          Real-time Web Ingestion • Source Provenance Verification • Clickable Citations • Workspace Archiving
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 select-none">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query or topic to research across the web..."
            className="w-full pl-9 pr-4 py-2.5 rounded bg-black/60 border border-breakpoint-panelBorder text-xs text-white focus:outline-none focus:border-breakpoint-cyan transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isSearching}
          className="px-6 py-2.5 rounded text-xs font-bold bg-breakpoint-cyan text-black hover:bg-cyan-300 flex items-center gap-2 shadow-[0_0_16px_rgba(0,240,255,0.3)] disabled:opacity-50 transition-all"
        >
          <Search className="w-4 h-4" />
          <span>{isSearching ? 'SEARCHING & SUMMARIZING...' : 'EXECUTE RESEARCH'}</span>
        </button>
      </form>

      {/* Current Research Results */}
      {currentResult && (
        <div className="hud-panel p-5 rounded-lg space-y-4 border border-cyan-500/40">
          <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3 select-none">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>RESEARCH SYNTHESIS FOR: &quot;{currentResult.query}&quot;</span>
            </div>
            <button
              onClick={() => handleSaveToWorkspace({
                id: 'tmp',
                query: currentResult.query,
                summary: currentResult.summary,
                sources: currentResult.sources,
                savedAt: new Date().toISOString()
              })}
              className="px-3 py-1 rounded text-xs bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>SAVE TO NOTES</span>
            </button>
          </div>

          <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap bg-black/40 p-4 rounded border border-breakpoint-panelBorder">
            {currentResult.summary}
          </div>

          {/* Clickable Citations & Sources */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase select-none">
              VERIFIED SOURCES & CITATIONS:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentResult.sources.map((s: any, idx: number) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded bg-black/50 border border-breakpoint-panelBorder hover:border-cyan-500/50 hover:bg-cyan-950/20 text-xs text-zinc-300 flex flex-col justify-between group transition-all"
                >
                  <div>
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1 group-hover:text-cyan-200">
                      <span className="truncate">{s.title}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{s.snippet}</p>
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-2 truncate">{s.url}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previously Archived Research Notes */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 select-none">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Archived Research Dossiers ({savedNotes.length})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedNotes.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-zinc-500 hud-panel rounded-lg">
              No research queries archived yet. Run a search to populate your knowledge dossiers.
            </div>
          ) : (
            savedNotes.map((note) => (
              <div key={note.id} className="hud-panel p-4 rounded-lg space-y-2 border border-breakpoint-panelBorder">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300 uppercase truncate max-w-[240px]">
                    {note.query}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(note.savedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 line-clamp-3">{note.summary}</p>
                <div className="flex items-center justify-between pt-2 border-t border-breakpoint-panelBorder text-[10px]">
                  <span className="text-zinc-500">{note.sources.length} Verified Sources</span>
                  <button
                    onClick={() => handleSaveToWorkspace(note)}
                    className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Export to Note</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
