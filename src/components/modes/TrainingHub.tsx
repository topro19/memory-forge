"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CardSRSData,
  PAOCard,
  PAOComponent,
  PAOStoreData,
  Suit,
  SRSRating,
} from '@/types/pao';
import { PlayingCard, suitStyles } from '../pao/PlayingCard';
import { checkAnswer, checkCardReverseMatch } from '@/lib/matcher';
import {
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Clock,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  Filter,
  BarChart2,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type TrainingModeKey =
  | 'person' // Mode A
  | 'action' // Mode B
  | 'object' // Mode C
  | 'full_pao' // Mode D
  | 'reverse' // Mode E
  | 'deck_test' // Mode F
  | 'speed' // Mode G
  | 'suit_practice'; // Mode H

interface TrainingHubProps {
  store: PAOStoreData;
  initialMode?: TrainingModeKey;
  initialCard?: PAOCard | null;
  onRecordReview: (
    cardId: string,
    component: PAOComponent,
    rating: SRSRating,
    responseTimeMs: number,
    userAnswer?: string,
    isCorrect?: boolean
  ) => void;
  onLogMistake: (
    cardId: string,
    component: PAOComponent,
    userAnswer: string,
    correctAnswer: string,
    responseTimeMs: number,
    mode: string
  ) => void;
  onLogSpeedScore: (
    durationSeconds: number,
    correct: number,
    incorrect: number,
    skipped: number,
    avgResponseTimeMs: number
  ) => void;
  onBackToDashboard: () => void;
}

export function TrainingHub({
  store,
  initialMode = 'person',
  initialCard = null,
  onRecordReview,
  onLogMistake,
  onLogSpeedScore,
  onBackToDashboard,
}: TrainingHubProps) {
  const { cards, srsData, settings } = store;

  const [activeMode, setActiveMode] = useState<TrainingModeKey>(initialMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Deck Test Config
  const [deckTestSize, setDeckTestSize] = useState<number>(10);
  // Speed Challenge Config (30s, 60s, 120s, 300s)
  const [speedDuration, setSpeedDuration] = useState<number>(60);
  // Suit Practice Config
  const [selectedSuit, setSelectedSuit] = useState<Suit>('hearts');
  const [suitPracticeType, setSuitPracticeType] = useState<PAOComponent | 'full'>('full');
  // Reverse Recall Config (Person, Action, Object, or Mixed)
  const [reversePromptType, setReversePromptType] = useState<PAOComponent | 'random'>('random');

  // Active Session State
  const [testCards, setTestCards] = useState<PAOCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Input states
  const [inputVal, setInputVal] = useState<string>('');
  const [personInput, setPersonInput] = useState<string>('');
  const [actionInput, setActionInput] = useState<string>('');
  const [objectInput, setObjectInput] = useState<string>('');

  // Reverse Prompt Item
  const [currentReversePrompt, setCurrentReversePrompt] = useState<{
    component: PAOComponent;
    text: string;
  }>({ component: 'person', text: '' });

  // Evaluation & Feedback
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    userAnswer: string;
    expectedAnswer: string;
    personCorrect?: boolean;
    actionCorrect?: boolean;
    objectCorrect?: boolean;
  }>({ show: false, isCorrect: false, userAnswer: '', expectedAnswer: '' });

  // Hints
  const [hintShown, setHintShown] = useState<boolean>(false);

  // Session Results Tally
  const [sessionResults, setSessionResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    totalTimeMs: number;
    completed: boolean;
    mistakesList: {
      card: PAOCard;
      component: string;
      userAnswer: string;
      expected: string;
    }[];
  }>({
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    totalTimeMs: 0,
    completed: false,
    mistakesList: [],
  });

  // Speed Challenge Countdown
  const [speedRemainingSeconds, setSpeedRemainingSeconds] = useState<number>(60);

  // Active Card
  const currentCard: PAOCard | undefined = testCards[currentIndex];

  // Prepare card pool based on active mode
  const buildCardPool = useCallback(
    (mode: TrainingModeKey): PAOCard[] => {
      let pool = [...cards];

      if (!settings.includeJokers && mode !== 'suit_practice') {
        pool = pool.filter((c) => c.suit !== 'jokers');
      }

      if (mode === 'suit_practice') {
        pool = pool.filter((c) => c.suit === selectedSuit);
      }

      // Shuffle randomly
      pool.sort(() => Math.random() - 0.5);

      if (mode === 'deck_test') {
        const size = Math.min(pool.length, deckTestSize);
        return pool.slice(0, size);
      }

      return pool;
    },
    [cards, settings.includeJokers, selectedSuit, deckTestSize]
  );

  // Start a new training session
  const startSession = useCallback(
    (mode: TrainingModeKey) => {
      let pool = buildCardPool(mode);

      // If initialCard is passed, put it first
      if (initialCard) {
        pool = [initialCard, ...pool.filter((c) => c.id !== initialCard.id)];
      }

      setTestCards(pool);
      setCurrentIndex(0);
      setInputVal('');
      setPersonInput('');
      setActionInput('');
      setObjectInput('');
      setFeedback({ show: false, isCorrect: false, userAnswer: '', expectedAnswer: '' });
      setHintShown(false);
      setSessionResults({
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        totalTimeMs: 0,
        completed: false,
        mistakesList: [],
      });

      const now = Date.now();
      setStartTime(now);
      setCardStartTime(now);
      setIsPlaying(true);

      // Initialize reverse prompt if reverse mode
      if (mode === 'reverse' && pool[0]) {
        const comp =
          reversePromptType === 'random'
            ? (['person', 'action', 'object'][Math.floor(Math.random() * 3)] as PAOComponent)
            : reversePromptType;
        setCurrentReversePrompt({ component: comp, text: pool[0][comp] });
      }

      if (mode === 'speed') {
        setSpeedRemainingSeconds(speedDuration);
      }
    },
    [buildCardPool, initialCard, reversePromptType, speedDuration]
  );

  // Countdown timer for Speed Challenge Mode
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && activeMode === 'speed' && !sessionResults.completed) {
      timer = setInterval(() => {
        setSpeedRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            // Finish speed challenge
            endSpeedSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, activeMode, sessionResults.completed]);

  const endSpeedSession = useCallback(() => {
    setSessionResults((prev) => {
      const avgTime =
        prev.correctCount + prev.incorrectCount > 0
          ? Math.round(
              (speedDuration * 1000) / (prev.correctCount + prev.incorrectCount + prev.skippedCount)
            )
          : 0;

      onLogSpeedScore(
        speedDuration,
        prev.correctCount,
        prev.incorrectCount,
        prev.skippedCount,
        avgTime
      );

      return {
        ...prev,
        completed: true,
      };
    });
  }, [speedDuration, onLogSpeedScore]);

  // Set up reverse prompt when moving to next card in reverse mode
  const setupReversePrompt = useCallback(
    (card: PAOCard) => {
      const comp =
        reversePromptType === 'random'
          ? (['person', 'action', 'object'][Math.floor(Math.random() * 3)] as PAOComponent)
          : reversePromptType;
      setCurrentReversePrompt({ component: comp, text: card[comp] });
    },
    [reversePromptType]
  );

  // Advance to next card
  const handleNextCard = useCallback(() => {
    setInputVal('');
    setPersonInput('');
    setActionInput('');
    setObjectInput('');
    setFeedback({ show: false, isCorrect: false, userAnswer: '', expectedAnswer: '' });
    setHintShown(false);
    setCardStartTime(Date.now());

    if (currentIndex + 1 < testCards.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (activeMode === 'reverse') {
        setupReversePrompt(testCards[nextIdx]);
      }
    } else {
      // Completed all cards in pool
      setSessionResults((prev) => ({
        ...prev,
        completed: true,
        totalTimeMs: Date.now() - startTime,
      }));
    }
  }, [currentIndex, testCards, activeMode, setupReversePrompt, startTime]);

  // Submit Answer
  const handleSubmitAnswer = useCallback(() => {
    if (!currentCard || feedback.show) return;

    const responseTimeMs = Date.now() - cardStartTime;
    const strict = settings.strictSpelling;

    if (activeMode === 'person') {
      const match = checkAnswer(inputVal, currentCard.person, strict);
      onRecordReview(
        currentCard.id,
        'person',
        match.isCorrect ? 'good' : 'again',
        responseTimeMs,
        inputVal,
        match.isCorrect
      );

      if (!match.isCorrect) {
        onLogMistake(
          currentCard.id,
          'person',
          inputVal || '[Blank]',
          currentCard.person,
          responseTimeMs,
          'mode_a_person'
        );
        setSessionResults((prev) => ({
          ...prev,
          incorrectCount: prev.incorrectCount + 1,
          mistakesList: [
            ...prev.mistakesList,
            {
              card: currentCard,
              component: 'Person',
              userAnswer: inputVal,
              expected: currentCard.person,
            },
          ],
        }));
      } else {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      }

      setFeedback({
        show: true,
        isCorrect: match.isCorrect,
        userAnswer: inputVal,
        expectedAnswer: currentCard.person,
      });
    } else if (activeMode === 'action') {
      const match = checkAnswer(inputVal, currentCard.action, strict);
      onRecordReview(
        currentCard.id,
        'action',
        match.isCorrect ? 'good' : 'again',
        responseTimeMs,
        inputVal,
        match.isCorrect
      );

      if (!match.isCorrect) {
        onLogMistake(
          currentCard.id,
          'action',
          inputVal || '[Blank]',
          currentCard.action,
          responseTimeMs,
          'mode_b_action'
        );
        setSessionResults((prev) => ({
          ...prev,
          incorrectCount: prev.incorrectCount + 1,
          mistakesList: [
            ...prev.mistakesList,
            {
              card: currentCard,
              component: 'Action',
              userAnswer: inputVal,
              expected: currentCard.action,
            },
          ],
        }));
      } else {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      }

      setFeedback({
        show: true,
        isCorrect: match.isCorrect,
        userAnswer: inputVal,
        expectedAnswer: currentCard.action,
      });
    } else if (activeMode === 'object') {
      const match = checkAnswer(inputVal, currentCard.object, strict);
      onRecordReview(
        currentCard.id,
        'object',
        match.isCorrect ? 'good' : 'again',
        responseTimeMs,
        inputVal,
        match.isCorrect
      );

      if (!match.isCorrect) {
        onLogMistake(
          currentCard.id,
          'object',
          inputVal || '[Blank]',
          currentCard.object,
          responseTimeMs,
          'mode_c_object'
        );
        setSessionResults((prev) => ({
          ...prev,
          incorrectCount: prev.incorrectCount + 1,
          mistakesList: [
            ...prev.mistakesList,
            {
              card: currentCard,
              component: 'Object',
              userAnswer: inputVal,
              expected: currentCard.object,
            },
          ],
        }));
      } else {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      }

      setFeedback({
        show: true,
        isCorrect: match.isCorrect,
        userAnswer: inputVal,
        expectedAnswer: currentCard.object,
      });
    } else if (activeMode === 'full_pao' || activeMode === 'deck_test') {
      const pMatch = checkAnswer(personInput, currentCard.person, strict);
      const aMatch = checkAnswer(actionInput, currentCard.action, strict);
      const oMatch = checkAnswer(objectInput, currentCard.object, strict);

      const allCorrect = pMatch.isCorrect && aMatch.isCorrect && oMatch.isCorrect;

      onRecordReview(
        currentCard.id,
        'person',
        pMatch.isCorrect ? 'good' : 'again',
        responseTimeMs,
        personInput,
        pMatch.isCorrect
      );
      onRecordReview(
        currentCard.id,
        'action',
        aMatch.isCorrect ? 'good' : 'again',
        responseTimeMs,
        actionInput,
        aMatch.isCorrect
      );
      onRecordReview(
        currentCard.id,
        'object',
        oMatch.isCorrect ? 'good' : 'again',
        responseTimeMs,
        objectInput,
        oMatch.isCorrect
      );

      if (!allCorrect) {
        const errorDetails = [
          !pMatch.isCorrect ? `P: ${personInput} (Exp: ${currentCard.person})` : null,
          !aMatch.isCorrect ? `A: ${actionInput} (Exp: ${currentCard.action})` : null,
          !oMatch.isCorrect ? `O: ${objectInput} (Exp: ${currentCard.object})` : null,
        ]
          .filter(Boolean)
          .join(', ');

        onLogMistake(
          currentCard.id,
          'person',
          errorDetails,
          `${currentCard.person} + ${currentCard.action} + ${currentCard.object}`,
          responseTimeMs,
          activeMode
        );

        setSessionResults((prev) => ({
          ...prev,
          incorrectCount: prev.incorrectCount + 1,
          mistakesList: [
            ...prev.mistakesList,
            {
              card: currentCard,
              component: 'Full PAO',
              userAnswer: `${personInput} | ${actionInput} | ${objectInput}`,
              expected: `${currentCard.person} | ${currentCard.action} | ${currentCard.object}`,
            },
          ],
        }));
      } else {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      }

      setFeedback({
        show: true,
        isCorrect: allCorrect,
        userAnswer: `${personInput} | ${actionInput} | ${objectInput}`,
        expectedAnswer: `${currentCard.person} | ${currentCard.action} | ${currentCard.object}`,
        personCorrect: pMatch.isCorrect,
        actionCorrect: aMatch.isCorrect,
        objectCorrect: oMatch.isCorrect,
      });
    } else if (activeMode === 'reverse') {
      const isCardMatch = checkCardReverseMatch(inputVal, currentCard);
      onRecordReview(
        currentCard.id,
        currentReversePrompt.component,
        isCardMatch ? 'good' : 'again',
        responseTimeMs,
        inputVal,
        isCardMatch
      );

      if (!isCardMatch) {
        onLogMistake(
          currentCard.id,
          currentReversePrompt.component,
          inputVal || '[Blank]',
          currentCard.name,
          responseTimeMs,
          'mode_e_reverse'
        );
        setSessionResults((prev) => ({
          ...prev,
          incorrectCount: prev.incorrectCount + 1,
          mistakesList: [
            ...prev.mistakesList,
            {
              card: currentCard,
              component: `Reverse (${currentReversePrompt.component})`,
              userAnswer: inputVal,
              expected: `${currentCard.code} (${currentCard.name})`,
            },
          ],
        }));
      } else {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      }

      setFeedback({
        show: true,
        isCorrect: isCardMatch,
        userAnswer: inputVal,
        expectedAnswer: `${currentCard.code} — ${currentCard.name}`,
      });
    } else if (activeMode === 'speed') {
      // Rapid fire check
      const match = checkAnswer(inputVal, currentCard.person, strict);
      if (match.isCorrect) {
        setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
      } else {
        setSessionResults((prev) => ({ ...prev, incorrectCount: prev.incorrectCount + 1 }));
      }
      handleNextCard();
    } else if (activeMode === 'suit_practice') {
      if (suitPracticeType === 'full') {
        const pMatch = checkAnswer(personInput, currentCard.person, strict);
        const aMatch = checkAnswer(actionInput, currentCard.action, strict);
        const oMatch = checkAnswer(objectInput, currentCard.object, strict);
        const allCorrect = pMatch.isCorrect && aMatch.isCorrect && oMatch.isCorrect;

        if (!allCorrect) {
          setSessionResults((prev) => ({
            ...prev,
            incorrectCount: prev.incorrectCount + 1,
            mistakesList: [
              ...prev.mistakesList,
              {
                card: currentCard,
                component: 'Suit Full PAO',
                userAnswer: `${personInput} | ${actionInput} | ${objectInput}`,
                expected: `${currentCard.person} | ${currentCard.action} | ${currentCard.object}`,
              },
            ],
          }));
        } else {
          setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
        }

        setFeedback({
          show: true,
          isCorrect: allCorrect,
          userAnswer: `${personInput} | ${actionInput} | ${objectInput}`,
          expectedAnswer: `${currentCard.person} | ${currentCard.action} | ${currentCard.object}`,
          personCorrect: pMatch.isCorrect,
          actionCorrect: aMatch.isCorrect,
          objectCorrect: oMatch.isCorrect,
        });
      } else {
        const expected = currentCard[suitPracticeType];
        const match = checkAnswer(inputVal, expected, strict);
        if (!match.isCorrect) {
          setSessionResults((prev) => ({
            ...prev,
            incorrectCount: prev.incorrectCount + 1,
            mistakesList: [
              ...prev.mistakesList,
              {
                card: currentCard,
                component: suitPracticeType,
                userAnswer: inputVal,
                expected,
              },
            ],
          }));
        } else {
          setSessionResults((prev) => ({ ...prev, correctCount: prev.correctCount + 1 }));
        }

        setFeedback({
          show: true,
          isCorrect: match.isCorrect,
          userAnswer: inputVal,
          expectedAnswer: expected,
        });
      }
    }
  }, [
    currentCard,
    feedback.show,
    cardStartTime,
    settings.strictSpelling,
    activeMode,
    inputVal,
    personInput,
    actionInput,
    objectInput,
    onRecordReview,
    onLogMistake,
    currentReversePrompt,
    suitPracticeType,
    handleNextCard,
  ]);

  // Skip card in Speed Mode
  const handleSkipCard = () => {
    setSessionResults((prev) => ({ ...prev, skippedCount: prev.skippedCount + 1 }));
    handleNextCard();
  };

  // Keyboard shortcut for Enter: submit or next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (feedback.show) {
          e.preventDefault();
          handleNextCard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback.show, handleNextCard]);

  // Mode Selection Metadata Cards
  const modeList: {
    key: TrainingModeKey;
    title: string;
    description: string;
    badge: string;
    accent: string;
  }[] = [
    {
      key: 'person',
      title: 'Mode A: Person Recall',
      description: 'Given a card, recall who the character is.',
      badge: 'Character',
      accent: 'border-amber-700/50 hover:border-amber-500 text-amber-300',
    },
    {
      key: 'action',
      title: 'Mode B: Action Recall',
      description: 'Given a card, recall what action is being performed.',
      badge: 'Action',
      accent: 'border-sky-700/50 hover:border-sky-500 text-sky-300',
    },
    {
      key: 'object',
      title: 'Mode C: Object Recall',
      description: 'Given a card, recall the physical object or prop.',
      badge: 'Object',
      accent: 'border-emerald-700/50 hover:border-emerald-500 text-emerald-300',
    },
    {
      key: 'full_pao',
      title: 'Mode D: Full PAO Recall',
      description: 'Recall Person, Action, and Object simultaneously.',
      badge: 'Full Triad',
      accent: 'border-indigo-700/50 hover:border-indigo-500 text-indigo-300',
    },
    {
      key: 'reverse',
      title: 'Mode E: Reverse Recall',
      description: 'Given Person, Action, or Object, identify the playing card.',
      badge: 'Reverse',
      accent: 'border-purple-700/50 hover:border-purple-500 text-purple-300',
    },
    {
      key: 'deck_test',
      title: 'Mode F: Random Deck Test',
      description: 'Exhaustive shuffled test (10, 26, or 54 cards, zero repeats).',
      badge: 'Exam',
      accent: 'border-rose-700/50 hover:border-rose-500 text-rose-300',
    },
    {
      key: 'speed',
      title: 'Mode G: Speed Challenge',
      description: 'Timed countdown challenge (30s, 60s, 2m, 5m). Test recall velocity!',
      badge: 'Speed',
      accent: 'border-yellow-700/50 hover:border-yellow-500 text-yellow-300',
    },
    {
      key: 'suit_practice',
      title: 'Mode H: Suit Practice',
      description: 'Focus on one universe: Hearts, Spades, Diamonds, Clubs, or Jokers.',
      badge: 'Suit Drill',
      accent: 'border-teal-700/50 hover:border-teal-500 text-teal-300',
    },
  ];

  // ==========================================
  // VIEW 1: MODE SELECTION HUB
  // ==========================================
  if (!isPlaying) {
    return (
      <div className="space-y-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141824] via-[#10141d] to-[#121929] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>PAO TRAINING MATRIX &bull; 8 MODES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              SELECT TRAINING PROTOCOL
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Choose from single-component recall, full triad mastery, reverse lookup, shuffled deck exams, or rapid-fire velocity challenges.
            </p>
          </div>

          <button
            onClick={() => startSession(activeMode)}
            className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Selected Mode</span>
          </button>
        </div>

        {/* Mode Selector Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modeList.map((m) => {
            const isSelected = activeMode === m.key;
            return (
              <div
                key={m.key}
                onClick={() => setActiveMode(m.key)}
                className={`p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-[#151a27] border-indigo-500 shadow-xl shadow-indigo-500/10'
                    : 'bg-[#10131c] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-slate-950/80 ${m.accent}`}
                    >
                      {m.badge}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{m.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    {isSelected ? 'Active Mode' : 'Click to select'}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration Options for Chosen Mode */}
        <div className="p-6 rounded-2xl bg-[#10131b] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Mode Specific Configurations: {activeMode.toUpperCase()}</span>
          </h3>

          {/* Mode F: Deck Test Size */}
          {activeMode === 'deck_test' && (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Test Deck Size:</span>
              {[10, 26, 54].map((size) => (
                <button
                  key={size}
                  onClick={() => setDeckTestSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                    deckTestSize === size
                      ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {size} Cards {size === 54 ? '(Full Deck)' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Mode G: Speed Challenge Duration */}
          {activeMode === 'speed' && (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Challenge Duration:</span>
              {[30, 60, 120, 300].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSpeedDuration(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                    speedDuration === sec
                      ? 'bg-yellow-950/80 text-yellow-300 border-yellow-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {sec >= 60 ? `${sec / 60} Minute${sec > 60 ? 's' : ''}` : `${sec} Seconds`}
                </button>
              ))}
            </div>
          )}

          {/* Mode H: Suit Practice Config */}
          {activeMode === 'suit_practice' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">Target Suit:</span>
                {(['hearts', 'spades', 'diamonds', 'clubs', 'jokers'] as Suit[]).map((st) => {
                  const sInfo = suitStyles[st];
                  return (
                    <button
                      key={st}
                      onClick={() => setSelectedSuit(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                        selectedSuit === st
                          ? `${sInfo.accentBg} ${sInfo.textClass} border-slate-600`
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {sInfo.symbol} {st.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">Practice Type:</span>
                {(['full', 'person', 'action', 'object'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSuitPracticeType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border capitalize transition ${
                      suitPracticeType === type
                        ? 'bg-teal-950/80 text-teal-300 border-teal-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode E: Reverse Recall Config */}
          {activeMode === 'reverse' && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">Prompt Component:</span>
              {(['random', 'person', 'action', 'object'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setReversePromptType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border capitalize transition ${
                    reversePromptType === t
                      ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* General hint toggle info */}
          <div className="text-[11px] font-mono text-slate-500 pt-1">
            Hints enabled: {settings.enableHints ? 'YES' : 'NO'} &bull; Strict Spelling:{' '}
            {settings.strictSpelling ? 'ON' : 'OFF (typos tolerated)'}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: COMPLETED SESSION SUMMARY
  // ==========================================
  if (sessionResults.completed) {
    const totalAttempted =
      sessionResults.correctCount + sessionResults.incorrectCount + sessionResults.skippedCount;
    const accuracy =
      totalAttempted > 0 ? Math.round((sessionResults.correctCount / totalAttempted) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#11141d] border border-slate-800 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center mx-auto text-indigo-400">
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            Training Session Concluded
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {activeMode.replace('_', ' ').toUpperCase()} COMPLETE
          </h2>
        </div>

        {/* Big Accuracy Ring / Stat */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-slate-400 font-mono block">Accuracy</span>
            <span className="text-3xl font-black text-emerald-400 font-mono">{accuracy}%</span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-mono block">Correct / Total</span>
            <span className="text-3xl font-black text-white font-mono">
              {sessionResults.correctCount} / {totalAttempted}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-mono block">Time</span>
            <span className="text-3xl font-black text-sky-400 font-mono">
              {(sessionResults.totalTimeMs / 1000).toFixed(0)}s
            </span>
          </div>
        </div>

        {/* Mistakes Review List if any */}
        {sessionResults.mistakesList.length > 0 && (
          <div className="text-left space-y-3 pt-2">
            <h4 className="text-xs font-mono uppercase text-slate-400">Mistakes in this session:</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sessionResults.mistakesList.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/80 border border-red-900/40 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-200">{m.card.code}</span>
                    <span className="text-slate-400 ml-2">({m.component})</span>
                    <p className="text-[11px] text-red-400">Your answer: {m.userAnswer || '[Empty]'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-mono">
                      Expected
                    </span>
                    <span className="text-emerald-400 font-medium">{m.expected}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => startSession(activeMode)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider uppercase transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retest This Mode</span>
          </button>

          <button
            onClick={() => setIsPlaying(false)}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs tracking-wider uppercase transition"
          >
            Choose Another Mode
          </button>

          <button
            onClick={onBackToDashboard}
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs tracking-wider uppercase transition"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE PLAYING / TESTING ARENA
  // ==========================================
  if (!currentCard) return null;

  const currentSuit = suitStyles[currentCard.suit];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Session Header Status */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {activeMode.replace('_', ' ')}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Card {currentIndex + 1} of {testCards.length}
            </span>
          </div>
        </div>

        {/* Countdown timer for speed mode */}
        {activeMode === 'speed' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-950/80 border border-yellow-700/60 font-mono text-yellow-300 text-sm font-bold animate-pulse">
            <Clock className="w-4 h-4" />
            <span>{speedRemainingSeconds}s remaining</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="text-emerald-400">{sessionResults.correctCount} correct</span>
            &bull;
            <span className="text-red-400">{sessionResults.incorrectCount} mistakes</span>
          </div>
        )}

        <button
          onClick={() => setIsPlaying(false)}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition"
        >
          Quit
        </button>
      </div>

      {/* Main Card Stage */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#131722] via-[#0f121a] to-[#0a0c11] border border-slate-800 shadow-2xl flex flex-col items-center space-y-6">
        
        {/* If Mode E: Reverse Recall, show the Person/Action/Object prompt instead of card face */}
        {activeMode === 'reverse' ? (
          <div className="w-full text-center space-y-4 py-4">
            <span className="text-xs font-mono uppercase tracking-widest text-purple-400 block font-bold">
              Target {currentReversePrompt.component.toUpperCase()} To Identify
            </span>

            <div className="p-6 rounded-2xl bg-purple-950/30 border border-purple-500/30 max-w-md mx-auto shadow-xl">
              <h2 className="text-3xl font-black text-white tracking-wide">
                &ldquo;{currentReversePrompt.text}&rdquo;
              </h2>
              <span className="text-xs text-slate-400 font-mono mt-2 block">
                Which playing card in your PAO deck owns this {currentReversePrompt.component}?
              </span>
            </div>

            {feedback.show && (
              <div className="py-2 flex justify-center">
                <PlayingCard
                  card={currentCard}
                  size="md"
                  revealed={true}
                  highlightComponent={currentReversePrompt.component}
                />
              </div>
            )}
          </div>
        ) : (
          /* Normal Modes: Show Playing Card */
          <div className="flex flex-col items-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              {activeMode === 'person'
                ? 'Who is the Character?'
                : activeMode === 'action'
                ? 'What is the Action?'
                : activeMode === 'object'
                ? 'What is the Object?'
                : 'Recall Full Person + Action + Object'}
            </span>

            <PlayingCard
              card={currentCard}
              size="hero"
              revealed={feedback.show}
              highlightComponent={
                activeMode === 'person'
                  ? 'person'
                  : activeMode === 'action'
                  ? 'action'
                  : activeMode === 'object'
                  ? 'object'
                  : 'all'
              }
            />

            {/* Hint Box (if enabled) */}
            {settings.enableHints && !feedback.show && (
              <div className="text-center">
                {!hintShown ? (
                  <button
                    onClick={() => setHintShown(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-300 transition"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Show Hint</span>
                  </button>
                ) : (
                  <div className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-3 py-1 rounded-lg">
                    Universe: {currentCard.universe} &bull; First letter:{' '}
                    {activeMode === 'person'
                      ? currentCard.person[0]
                      : activeMode === 'action'
                      ? currentCard.action[0]
                      : activeMode === 'object'
                      ? currentCard.object[0]
                      : `${currentCard.person[0]} / ${currentCard.action[0]} / ${currentCard.object[0]}`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Answer Input Forms */}
        {!feedback.show ? (
          <div className="w-full max-w-md space-y-4">
            {activeMode === 'full_pao' ||
            (activeMode === 'suit_practice' && suitPracticeType === 'full') ||
            activeMode === 'deck_test' ? (
              /* Triad Inputs */
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-mono uppercase text-amber-400 block mb-1">
                    Person
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter character name..."
                    value={personInput}
                    onChange={(e) => setPersonInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-sky-400 block mb-1">
                    Action
                  </label>
                  <input
                    type="text"
                    placeholder="Enter action..."
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-emerald-400 block mb-1">
                    Object
                  </label>
                  <input
                    type="text"
                    placeholder="Enter object..."
                    value={objectInput}
                    onChange={(e) => setObjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitAnswer();
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            ) : (
              /* Single Input */
              <div className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                  placeholder={
                    activeMode === 'reverse'
                      ? 'Type card code e.g. 7H, 7 hearts, 7♥, RJ...'
                      : `Type ${activeMode}...`
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 shadow-inner text-center font-medium"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSubmitAnswer}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 transition"
              >
                Submit Answer [Enter]
              </button>

              {activeMode === 'speed' && (
                <button
                  onClick={handleSkipCard}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-mono text-xs uppercase transition"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Feedback Card */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl space-y-4 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              {feedback.isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <span
                className={`text-lg font-bold font-mono ${
                  feedback.isCorrect ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            {/* Answer Comparison */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-left">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">
                  Expected Answer:
                </span>
                <span className="text-white font-semibold text-sm">
                  {feedback.expectedAnswer}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">
                  Your Answer:
                </span>
                <span
                  className={feedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}
                >
                  {feedback.userAnswer || '[Empty]'}
                </span>
              </div>
            </div>

            <button
              onClick={handleNextCard}
              autoFocus
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              <span>Next Card</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
