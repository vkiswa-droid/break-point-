import React, { useState, useEffect } from 'react';
import { GameType, GameSession } from '../../types';
import { gameEngine } from '../../services/games/gameEngine';
import {
  Gamepad2,
  HelpCircle,
  Brain,
  Hash,
  Shuffle,
  Lightbulb,
  RotateCcw,
  Trophy,
  Heart,
  ChevronRight,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowLeft
} from 'lucide-react';

export const GamesView: React.FC = () => {
  const [activeSession, setActiveSession] = useState<GameSession | null>(gameEngine.getActiveSession());
  const [userInput, setUserInput] = useState('');
  const [lastFeedback, setLastFeedback] = useState<string>('');
  const [highScores, setHighScores] = useState<Record<string, number>>(gameEngine.getHighScores());
  const [hintUsed, setHintUsed] = useState(false);

  useEffect(() => {
    setActiveSession(gameEngine.getActiveSession());
    setHighScores(gameEngine.getHighScores());
  }, []);

  const handleStartGame = (type: GameType) => {
    const session = gameEngine.startGame(type);
    setActiveSession(session);
    setUserInput('');
    setLastFeedback('');
    setHintUsed(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const res = gameEngine.submitTurn(userInput);
    setActiveSession({ ...res.session });
    setLastFeedback(res.feedback);
    setUserInput('');
    setHighScores(gameEngine.getHighScores());
  };

  const handleQuickOption = (optionText: string) => {
    const res = gameEngine.submitTurn(optionText);
    setActiveSession({ ...res.session });
    setLastFeedback(res.feedback);
    setHighScores(gameEngine.getHighScores());
  };

  const handleGetHint = () => {
    const hint = gameEngine.getHint();
    if (hint) {
      setLastFeedback(`💡 Hint: ${hint}`);
      setHintUsed(true);
    }
  };

  const handleExitGame = () => {
    gameEngine.exitGame();
    setActiveSession(null);
    setLastFeedback('');
  };

  const gamesCatalog: Array<{
    type: GameType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge: string;
  }> = [
    {
      type: 'riddle',
      title: 'Cyber-Riddles',
      description: 'Futuristic mind-benders and classic logic puzzles with progressive hints.',
      icon: HelpCircle,
      accentColor: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-400',
      badge: 'Puzzle'
    },
    {
      type: 'trivia',
      title: 'Cyber-Trivia',
      description: 'Science, computing, sci-fi and tech quizzes with multi-choice answers.',
      icon: Brain,
      accentColor: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-400',
      badge: 'Quiz'
    },
    {
      type: 'word_guess',
      title: 'Cipher Word Guess',
      description: 'Crack hidden tech keywords letter-by-letter before your 6 lives run out.',
      icon: Gamepad2,
      accentColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400',
      badge: 'Word'
    },
    {
      type: 'number_guess',
      title: 'Guess My Number',
      description: 'Binary search style guessing (1-100) with hot/cold companion telemetry.',
      icon: Hash,
      accentColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400',
      badge: 'Strategy'
    },
    {
      type: 'would_you_rather',
      title: 'Would You Rather',
      description: 'Chaotic dilemmas, absurd tech choices, and girlfriend banter.',
      icon: Shuffle,
      accentColor: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-400',
      badge: 'Casual'
    }
  ];

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-gradient-to-b from-[#02050f] to-[#040817] text-zinc-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-cyan-950/60 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <Gamepad2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-cyan-100 flex items-center gap-2">
                BREAK POINT PLAYGROUND
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  OFFLINE 100%
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Deterministic mini-games with chaotic girlfriend banter. Zero cloud calls. ₹0 spent.
              </p>
            </div>
          </div>
        </div>

        {activeSession && (
          <button
            onClick={handleExitGame}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit Game
          </button>
        )}
      </div>

      {/* Main Game Screen or Catalog */}
      {!activeSession ? (
        <div className="space-y-6">
          {/* Trophy & Stats banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {gamesCatalog.map((g) => (
              <div
                key={g.type}
                className="p-3 rounded-lg bg-[#070d1e]/80 border border-cyan-950/40 flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase text-zinc-400">{g.title}</div>
                  <div className="text-sm font-bold text-cyan-300">
                    {highScores[g.type] || 0} pts
                  </div>
                </div>
                <Trophy className="w-4 h-4 text-amber-400/80" />
              </div>
            ))}
          </div>

          {/* Catalog Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesCatalog.map((game) => {
              const Icon = game.icon;
              return (
                <div
                  key={game.type}
                  className={`group relative p-5 rounded-xl border bg-gradient-to-br ${game.accentColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(34,211,238,0.15)] flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-300">
                        {game.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide">
                        {game.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-[11px] font-mono text-zinc-400">
                      High: <strong className="text-amber-400">{highScores[game.type] || 0}</strong> pts
                    </span>
                    <button
                      onClick={() => handleStartGame(game.type)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                    >
                      Play Now
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active Game Arena */
        <div className="space-y-6 max-w-3xl mx-auto w-full">
          {/* Active Status Header */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#070e24]/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Gamepad2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-cyan-400 tracking-wider">
                  Active Mission: {activeSession.type.replace('_', ' ')}
                </div>
                <div className="text-sm font-bold text-white">
                  Turn {activeSession.turns} • Difficulty: {activeSession.difficulty}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-zinc-400">Score</div>
                <div className="text-lg font-bold text-amber-400">{activeSession.score} pts</div>
              </div>

              <button
                onClick={() => handleStartGame(activeSession.type)}
                title="Restart Round"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Question / Puzzle Card */}
          <div className="p-6 rounded-xl bg-[#050b1a]/90 border border-cyan-900/60 shadow-xl space-y-4">
            <div className="text-xs font-mono text-cyan-500 uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              PUZZLE TELEMETRY
            </div>

            <div className="text-base text-zinc-100 font-medium whitespace-pre-wrap leading-relaxed bg-[#02050e]/60 p-4 rounded-lg border border-cyan-950/60 font-mono">
              {activeSession.currentPrompt}
            </div>

            {/* Companion Feedback Callout */}
            {lastFeedback && (
              <div className="p-3.5 rounded-lg bg-pink-950/30 border border-pink-500/40 text-pink-200 text-xs flex items-start gap-3 animate-fadeIn">
                <Heart className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-pink-300">Break Point says:</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{lastFeedback}</div>
                </div>
              </div>
            )}

            {/* Input or Multiple Choice Actions */}
            {!activeSession.isComplete ? (
              <div className="space-y-3 pt-2">
                {activeSession.type === 'would_you_rather' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleQuickOption('Option A')}
                      className="p-3 text-left rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-mono transition-all hover:scale-[1.01]"
                    >
                      👉 Choose Option A
                    </button>
                    <button
                      onClick={() => handleQuickOption('Option B')}
                      className="p-3 text-left rounded-lg bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/40 text-pink-200 text-xs font-mono transition-all hover:scale-[1.01]"
                    >
                      👉 Choose Option B
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={
                        activeSession.type === 'word_guess'
                          ? 'Enter a letter or guess the word...'
                          : activeSession.type === 'number_guess'
                          ? 'Enter a number (1-100)...'
                          : 'Enter your answer...'
                      }
                      className="flex-1 bg-[#02050f] border border-cyan-900/60 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!userInput.trim()}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold text-xs transition-colors"
                    >
                      Submit
                    </button>

                    {activeSession.type === 'riddle' && (
                      <button
                        type="button"
                        onClick={handleGetHint}
                        disabled={hintUsed}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono transition-colors disabled:opacity-50"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        Hint
                      </button>
                    )}
                  </form>
                )}
              </div>
            ) : (
              <div className="pt-4 flex items-center justify-between border-t border-cyan-950/80">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Round Finished! Final Score: {activeSession.score} pts
                </div>
                <button
                  onClick={() => handleStartGame(activeSession.type)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  Play Another Round 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
