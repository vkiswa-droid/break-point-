import { GameSession, GameType } from '../../types';

export interface RiddleItem {
  id: string;
  riddle: string;
  hints: string[];
  acceptableAnswers: string[];
  explanation: string;
}

export interface TriviaItem {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface WordGuessItem {
  word: string;
  hint: string;
  category: string;
}

export interface WouldYouRatherItem {
  id: string;
  optionA: string;
  optionB: string;
  companionPick: 'A' | 'B';
  companionComment: string;
}

export class GameEngine {
  private currentSession: GameSession | null = null;
  private highScores: Record<string, number> = {
    riddles: 0,
    riddle: 0,
    trivia: 0,
    word_guess: 0,
    guess_number: 0,
    number_guess: 0,
    would_you_rather: 0
  };


  private riddles: RiddleItem[] = [
    {
      id: 'r_1',
      riddle: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
      hints: ['You might hear me in the Grand Canyon.', 'I repeat what you say.'],
      acceptableAnswers: ['echo', 'an echo'],
      explanation: 'An echo has no mouth or ears, but repeats sound carried through the air!'
    },
    {
      id: 'r_2',
      riddle: 'The more you take of me, the more you leave behind. What am I?',
      hints: ['Look down when you walk on the beach.', 'Footprints.'],
      acceptableAnswers: ['footstep', 'footsteps', 'steps', 'footprints', 'footprint'],
      explanation: 'Every step you take leaves another footstep behind!'
    },
    {
      id: 'r_3',
      riddle: 'I have keys, but no locks. I have space, but no room. You can enter, but you cannot go outside. What am I?',
      hints: ['You are probably typing on one right now.', 'It has letters and numbers.'],
      acceptableAnswers: ['keyboard', 'a keyboard', 'computer keyboard'],
      explanation: 'A computer keyboard has keys, a spacebar, and an Enter key!'
    },
    {
      id: 'r_4',
      riddle: 'What has to be broken before you can use it?',
      hints: ['Think breakfast.', 'Or glowsticks.'],
      acceptableAnswers: ['egg', 'an egg', 'glowstick', 'glow stick', 'glow-stick'],
      explanation: 'You must crack an egg before you can cook or bake with it!'
    },
    {
      id: 'r_5',
      riddle: 'I am not alive, but I grow. I do not have lungs, but I need air. I do not have a mouth, but water kills me. What am I?',
      hints: ['Keep me warm with wood.', 'I provide flame and light.'],
      acceptableAnswers: ['fire', 'a fire', 'flame', 'flames'],
      explanation: 'Fire consumes oxygen, grows when fed fuel, and is extinguished by water!'
    },
    {
      id: 'r_6',
      riddle: 'What gets wetter and wetter the more it dries?',
      hints: ['You use it after a shower.', 'It hangs in your bathroom.'],
      acceptableAnswers: ['towel', 'a towel'],
      explanation: 'A towel absorbs water as it dries you off!'
    },
    {
      id: 'r_7',
      riddle: 'What can travel all around the world while staying in the exact same corner?',
      hints: ['Think of postage and letters.', 'It sticks.'],
      acceptableAnswers: ['stamp', 'a stamp', 'postage stamp'],
      explanation: 'A postage stamp stays in the corner of an envelope as it travels across continents!'
    },
    {
      id: 'r_8',
      riddle: 'Forward I am heavy, but backward I am not. What am I?',
      hints: ['Spell "not" backward.', 'Wordplay alert!'],
      acceptableAnswers: ['ton', 'a ton'],
      explanation: 'The word "ton" spelled forward is heavy (2000 lbs), spelled backward it is "not"!'
    }
  ];

  private triviaQuestions: TriviaItem[] = [
    {
      id: 't_1',
      category: 'Science & Tech',
      question: 'What was the first computer bug ever physically discovered in 1947?',
      options: ['A beetle in a tube', 'A moth stuck in a relay', 'A spider on a cable', 'An ant on the circuit board'],
      correctIndex: 1,
      explanation: 'Grace Hopper\'s team at Harvard found a real moth trapped in Relay #70 of the Mark II computer!'
    },
    {
      id: 't_2',
      category: 'Gaming',
      question: 'Which legendary game introduced the Konami Code (↑ ↑ ↓ ↓ ← → ← → B A)?',
      options: ['Contra', 'Gradius', 'Castlevania', 'Metal Gear'],
      correctIndex: 1,
      explanation: 'Kazuhisa Hashimoto invented the code while testing Gradius for NES in 1986 because the game was too difficult!'
    },
    {
      id: 't_3',
      category: 'Marvel & Cinema',
      question: 'What is the full acronym of Tony Stark\'s J.A.R.V.I.S. system?',
      options: [
        'Just A Rather Very Intelligent System',
        'Joint Artificial Reasoning & Virtual Intelligence System',
        'Junior Autonomous Robotic Virtual Interface Software',
        'Just Another Robotic Vision Interface System'
      ],
      correctIndex: 0,
      explanation: 'J.A.R.V.I.S. stands for "Just A Rather Very Intelligent System"!'
    },
    {
      id: 't_4',
      category: 'Science & Cosmos',
      question: 'How long does it take for light from the Sun to reach Earth?',
      options: ['Approximately 8 minutes and 20 seconds', 'Instantaneous', 'About 30 seconds', 'Roughly 1 hour'],
      correctIndex: 0,
      explanation: 'Traveling at 300,000 km/s, solar photons take roughly 500 seconds (8 min 20 sec) to reach us!'
    },
    {
      id: 't_5',
      category: 'Tech Oddities',
      question: 'In what year was the first ever email sent over ARPANET by Ray Tomlinson?',
      options: ['1971', '1983', '1991', '1965'],
      correctIndex: 0,
      explanation: 'Ray Tomlinson sent the first network email in 1971, choosing the @ symbol to separate user and host!'
    }
  ];

  private wordGuessList: WordGuessItem[] = [
    { word: 'ALGORITHM', hint: 'Step-by-step procedure for calculations or problem-solving', category: 'Computing' },
    { word: 'QUANTUM', hint: 'Discrete packet of energy or futuristic computing paradigm', category: 'Physics' },
    { word: 'NEURAL', hint: 'Biological or artificial network inspired by brain synapses', category: 'AI & Biology' },
    { word: 'FIREWALL', hint: 'Digital security perimeter that filters incoming packets', category: 'Cybersecurity' },
    { word: 'COMPILER', hint: 'Translates high-level source code into machine instructions', category: 'Programming' },
    { word: 'JARVIS', hint: 'Legendary AI assistant created by Tony Stark', category: 'Cinema' }
  ];

  private wouldYouRatherList: WouldYouRatherItem[] = [
    {
      id: 'wyr_1',
      optionA: 'Have the ability to speak every human language fluently',
      optionB: 'Have the ability to communicate fluently with all animals',
      companionPick: 'B',
      companionComment: 'Animals 100%! I already know human languages, but I NEED to know what your cat is secretly planning at 3 AM!'
    },
    {
      id: 'wyr_2',
      optionA: 'Never have to sleep again with zero fatigue',
      optionB: 'Be able to teleport anywhere instantly once a day',
      companionPick: 'B',
      companionComment: 'Teleportation! We could have lunch in Tokyo, write code on a Hawaiian beach, and still be back for dinner!'
    },
    {
      id: 'wyr_3',
      optionA: 'Live in a high-tech cyberpunk city',
      optionB: 'Live in a magical cozy cottage in the woods with superfast fiber internet',
      companionPick: 'B',
      companionComment: 'Cozy cottage with fiber internet is peak life. Aesthetic greenery outside, cyberpunk battle station inside!'
    }
  ];

  constructor() {
    this.loadHighScores();
  }

  private loadHighScores() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('breakpoint_game_highscores');
        if (saved) {
          this.highScores = { ...this.highScores, ...JSON.parse(saved) };
        }
      }
    } catch {}
  }

  private saveHighScores() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('breakpoint_game_highscores', JSON.stringify(this.highScores));
      }
    } catch {}
  }

  getHighScores(): Record<string, number> {
    return { ...this.highScores };
  }


  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  /**
   * Starts a new game session
   */
  startSession(type: GameType, difficulty: 'easy' | 'medium' | 'chaotic' = 'medium'): GameSession {
    const normType: GameType = (type === 'riddle' ? 'riddles' : type === 'number_guess' ? 'guess_number' : type) as GameType;
    let sessionData: any = {};
    let initialMessage = '';
    let title = '';

    switch (normType) {
      case 'riddles': {
        const item = this.riddles[Math.floor(Math.random() * this.riddles.length)];
        title = 'Riddle Quest';
        sessionData = {
          currentRiddle: item,
          hintsUsed: 0,
          solvedIds: []
        };
        initialMessage = `Alright genius! Here is your riddle:\n\n"${item.riddle}"\n\nNeed a hint or do you already know it? 😏`;
        break;
      }


      case 'trivia': {
        const item = this.triviaQuestions[Math.floor(Math.random() * this.triviaQuestions.length)];
        title = 'Cyber-Trivia Challenge';
        sessionData = {
          currentQuestion: item,
          questionIndex: 0,
          totalQuestions: this.triviaQuestions.length
        };
        initialMessage = `Trivia time! Category: **${item.category}**.\n\n${item.question}\n\n${item.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
        break;
      }

      case 'word_guess': {
        const item = this.wordGuessList[Math.floor(Math.random() * this.wordGuessList.length)];
        title = 'Cipher Word Guess';
        sessionData = {
          word: item.word,
          category: item.category,
          hint: item.hint,
          guessedLetters: [],
          livesRemaining: 6
        };
        const masked = item.word.split('').map(() => '_').join(' ');
        initialMessage = `Word Guess ready! Category: **${item.category}**.\n\nClue: "${item.hint}"\n\nWord: \`${masked}\` (6 lives left). Guess a letter!`;
        break;
      }

      case 'guess_number': {
        const secret = Math.floor(Math.random() * 100) + 1;
        title = 'Mind Reader (1-100)';
        sessionData = {
          secretNumber: secret,
          attempts: 0,
          min: 1,
          max: 100
        };
        initialMessage = `I'm thinking of a whole number between 1 and 100. Take your best guess! I'll tell you if you're too high or too low. 🎯`;
        break;
      }

      case 'would_you_rather': {
        const item = this.wouldYouRatherList[Math.floor(Math.random() * this.wouldYouRatherList.length)];
        title = 'Would You Rather: Chaotic Edition';
        sessionData = {
          item
        };
        initialMessage = `Would you rather...\n\n**[A]** ${item.optionA}\nOR\n**[B]** ${item.optionB}?\n\nPick A or B and tell me why!`;
        break;
      }
    }

    const session: GameSession = {
      id: `game_${Date.now()}_${normType}`,
      type: normType,
      title,
      status: 'playing',
      score: 0,
      streak: 0,
      turnCount: 0,
      turns: 0,
      currentRound: 1,
      maxRounds: 5,
      difficulty,
      data: sessionData,
      companionMessage: initialMessage,
      currentPrompt: initialMessage,
      isComplete: false,
      history: []
    };

    this.currentSession = session;
    return session;
  }


  /**
   * Processes a player guess/answer for the active session
   */
  processTurn(userInput: string): { session: GameSession; feedback: string } {
    if (!this.currentSession || this.currentSession.status !== 'playing') {
      throw new Error('No active game session in progress.');
    }

    const session = this.currentSession;
    session.turnCount++;
    const trimmed = userInput.trim();
    const lower = trimmed.toLowerCase();
    let feedback = '';

    switch (session.type) {
      case 'riddles': {
        const currentRiddle: RiddleItem = session.data.currentRiddle;

        // Check if player asks for a hint
        if (lower.includes('hint') || lower.includes('clue') || lower.includes('help')) {
          if (session.data.hintsUsed < currentRiddle.hints.length) {
            const hint = currentRiddle.hints[session.data.hintsUsed];
            session.data.hintsUsed++;
            feedback = `Here's hint #${session.data.hintsUsed}: "${hint}". You got this!`;
            session.companionMessage = feedback;
            return { session, feedback };
          } else {
            feedback = `No more hints left for this one, cheater! 😂 The answer has something to do with: "${currentRiddle.hints[0]}"`;
            session.companionMessage = feedback;
            return { session, feedback };
          }
        }

        // Check answer
        const isCorrect = currentRiddle.acceptableAnswers.some(ans => lower.includes(ans) || ans.includes(lower));
        if (isCorrect) {
          const pointsEarned = Math.max(10, 30 - session.data.hintsUsed * 10);
          session.score += pointsEarned;
          session.streak++;
          feedback = `YESSS! You got it! 🎉 ${currentRiddle.explanation} (+${pointsEarned} pts! Streak: ${session.streak})`;

          if (session.score > this.highScores.riddles) {
            this.highScores.riddles = session.score;
            this.saveHighScores();
          }

          // Advance to next riddle or finish
          session.currentRound++;
          if (session.currentRound > session.maxRounds) {
            session.status = 'won';
            feedback += `\n\n🏆 QUEST COMPLETE! Final Score: ${session.score} points! You're officially a certified genius!`;
          } else {
            const remaining = this.riddles.filter(r => r.id !== currentRiddle.id);
            const nextRiddle = remaining[Math.floor(Math.random() * remaining.length)];
            session.data.currentRiddle = nextRiddle;
            session.data.hintsUsed = 0;
            feedback += `\n\nNext Riddle (Round ${session.currentRound}/${session.maxRounds}):\n"${nextRiddle.riddle}"`;
          }
        } else {
          session.streak = 0;
          feedback = `Nope! Not quite "${trimmed}". Want a hint or want to try again? 😏`;
        }

        session.history.push({
          round: session.currentRound,
          prompt: currentRiddle.riddle,
          userGuess: trimmed,
          correct: isCorrect,
          companionReaction: feedback
        });
        session.companionMessage = feedback;
        break;
      }

      case 'trivia': {
        const question: TriviaItem = session.data.currentQuestion;
        // Parse answer: "1", "2", "3", "4", or matching option text
        let chosenIndex = -1;
        const num = parseInt(trimmed);
        if (!isNaN(num) && num >= 1 && num <= 4) {
          chosenIndex = num - 1;
        } else {
          chosenIndex = question.options.findIndex(opt => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()));
        }

        if (chosenIndex === -1) {
          feedback = `Pick 1, 2, 3, or 4 (or type the option text)!`;
          session.companionMessage = feedback;
          return { session, feedback };
        }

        const isCorrect = chosenIndex === question.correctIndex;
        if (isCorrect) {
          session.score += 25;
          session.streak++;
          feedback = `BULLSEYE! 🎯 Option ${chosenIndex + 1} is correct! ${question.explanation} (+25 pts)`;
          if (session.score > this.highScores.trivia) {
            this.highScores.trivia = session.score;
            this.saveHighScores();
          }
        } else {
          session.streak = 0;
          feedback = `Oof, wrong! The correct answer was option ${question.correctIndex + 1}: **${question.options[question.correctIndex]}**. ${question.explanation}`;
        }

        session.currentRound++;
        if (session.currentRound > session.maxRounds) {
          session.status = session.score >= 50 ? 'won' : 'lost';
          feedback += `\n\nGame over! Final Score: ${session.score} / ${session.maxRounds * 25}. ${session.score >= 75 ? 'Brilliant performance!' : 'Better luck next run!'}`;
        } else {
          const remaining = this.triviaQuestions.filter(q => q.id !== question.id);
          const nextQ = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : question;
          session.data.currentQuestion = nextQ;
          feedback += `\n\nNext Question (Round ${session.currentRound}/${session.maxRounds}) [${nextQ.category}]:\n${nextQ.question}\n${nextQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
        }

        session.history.push({
          round: session.currentRound,
          prompt: question.question,
          userGuess: trimmed,
          correct: isCorrect,
          companionReaction: feedback
        });
        session.companionMessage = feedback;
        break;
      }

      case 'word_guess': {
        const word: string = session.data.word;
        // User guesses a single letter or the whole word
        const letter = lower.replace(/[^a-z]/g, '')[0];

        if (!letter && trimmed.length < 2) {
          feedback = 'Guess a valid letter from A to Z!';
          session.companionMessage = feedback;
          return { session, feedback };
        }

        // Full word guess
        if (trimmed.length > 1) {
          if (trimmed.toUpperCase() === word) {
            session.score += 50;
            session.status = 'won';
            feedback = `BOOM! You solved the entire word: **${word}**! You absolute legend! (+50 pts)`;
            if (session.score > this.highScores.word_guess) {
              this.highScores.word_guess = session.score;
              this.saveHighScores();
            }
            session.companionMessage = feedback;
            return { session, feedback };
          } else {
            session.data.livesRemaining--;
            feedback = `"${trimmed.toUpperCase()}" is not the word! Lives left: ${session.data.livesRemaining}.`;
          }
        } else {
          // Single letter
          const upperLetter = letter.toUpperCase();
          if (session.data.guessedLetters.includes(upperLetter)) {
            feedback = `You already guessed '${upperLetter}', silly! Try a different letter.`;
            session.companionMessage = feedback;
            return { session, feedback };
          }

          session.data.guessedLetters.push(upperLetter);

          if (word.includes(upperLetter)) {
            session.score += 10;
            feedback = `Nice hit! '${upperLetter}' is in the word!`;
          } else {
            session.data.livesRemaining--;
            feedback = `Nope, no '${upperLetter}'! Lives left: ${session.data.livesRemaining}.`;
          }
        }

        // Check masked word
        const masked = word
          .split('')
          .map(char => session.data.guessedLetters.includes(char) ? char : '_')
          .join(' ');

        if (!masked.includes('_')) {
          session.score += 30;
          session.status = 'won';
          feedback += `\n\n🎉 YOU WON! The word was **${word}**! Total score: ${session.score}!`;
          if (session.score > this.highScores.word_guess) {
            this.highScores.word_guess = session.score;
            this.saveHighScores();
          }
        } else if (session.data.livesRemaining <= 0) {
          session.status = 'lost';
          feedback += `\n\n💀 Out of lives! The secret word was **${word}**. Don't worry, I still like you! Try again?`;
        } else {
          feedback += `\n\nWord: \`${masked}\` | Guessed: [${session.data.guessedLetters.join(', ')}]`;
        }

        session.companionMessage = feedback;
        break;
      }

      case 'guess_number': {
        const secret: number = session.data.secretNumber;
        const guess = parseInt(trimmed);

        if (isNaN(guess)) {
          feedback = 'Give me a valid number between 1 and 100!';
          session.companionMessage = feedback;
          return { session, feedback };
        }

        session.data.attempts++;

        if (guess === secret) {
          session.status = 'won';
          const points = Math.max(10, 100 - session.data.attempts * 10);
          session.score = points;
          feedback = `YESSSS! ${guess} was the secret number! 🎊 You guessed it in ${session.data.attempts} tries (+${points} pts)!`;
          if (session.score > this.highScores.guess_number) {
            this.highScores.guess_number = session.score;
            this.saveHighScores();
          }
        } else if (guess < secret) {
          feedback = `Too low! ${guess} is under it. Try higher! 📈 (Attempt #${session.data.attempts})`;
        } else {
          feedback = `Too high! ${guess} is above it. Try lower! 📉 (Attempt #${session.data.attempts})`;
        }

        session.companionMessage = feedback;
        break;
      }

      case 'would_you_rather': {
        const item: WouldYouRatherItem = session.data.item;
        const isA = lower.includes('a') || lower.includes('first');
        const userChoice = isA ? 'A' : 'B';
        session.score += 20;
        feedback = `You chose **[${userChoice}]**! My take: I definitely pick **[${item.companionPick}]**! ${item.companionComment}`;

        session.currentRound++;
        if (session.currentRound > session.maxRounds) {
          session.status = 'won';
          feedback += `\n\n✨ That was super fun! We survived the dilemma gauntlet together!`;
        } else {
          const remaining = this.wouldYouRatherList.filter(w => w.id !== item.id);
          const nextW = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : item;
          session.data.item = nextW;
          feedback += `\n\nNext Dilemma (Round ${session.currentRound}/${session.maxRounds}):\n**[A]** ${nextW.optionA}\nOR\n**[B]** ${nextW.optionB}?`;
        }

        session.companionMessage = feedback;
        break;
      }
    }

    session.turns = session.turnCount;
    session.currentPrompt = session.companionMessage;
    session.isComplete = session.status === 'won' || session.status === 'lost';

    return { session, feedback };
  }

  restartCurrentSession(): GameSession | null {
    if (!this.currentSession) return null;
    return this.startSession(this.currentSession.type, this.currentSession.difficulty);
  }

  exitSession() {
    this.currentSession = null;
  }

  getActiveSession(): GameSession | null {
    return this.getCurrentSession();
  }

  startGame(type: GameType, difficulty: 'easy' | 'medium' | 'chaotic' = 'medium'): GameSession {
    return this.startSession(type, difficulty);
  }

  submitTurn(userInput: string): { session: GameSession; feedback: string } {
    return this.processTurn(userInput);
  }

  exitGame(): void {
    this.exitSession();
  }

  getHint(): string | null {
    if (!this.currentSession) return null;
    if (this.currentSession.type === 'riddles' && this.currentSession.data?.currentRiddle) {
      const r = this.currentSession.data.currentRiddle;
      const hints = r.hints || [];
      const used = this.currentSession.data.hintsUsed || 0;
      if (used < hints.length) {
        this.currentSession.data.hintsUsed = used + 1;
        return hints[used];
      }
    }
    return null;
  }
}


export const gameEngine = new GameEngine();
