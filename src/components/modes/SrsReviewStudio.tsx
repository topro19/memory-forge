"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CardSRSData,
  PAOCard,
  PAOComponent,
  PAOStoreData,
  SRSRating,
} from '@/types/pao';
import { PlayingCard, suitStyles } from '../pao/PlayingCard';
import { getPrioritizedReviewQueue, ReviewQueueItem } from '@/lib/srsEngine';
import { checkAnswer } from '@/lib/matcher';
import {
  Zap,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  Sliders,
  Keyboard,
} from 'lucide-react';

interface SrsReviewStudioProps {
  store: PAOStoreData;
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
  onBackToDashboard: () => void;
}

export function SrsReviewStudio({
  store,
  onRecordReview,
  onLogMistake,
  onBackToDashboard,
}: SrsReviewStudioProps) {
  const { cards, srsData, settings } = store;

  // Filter component
  const [componentFilter, setComponentFilter] = useState<PAOComponent | 'all'>('all');
  const [includeAllInsteadOfDue, setIncludeAllInsteadOfDue] = useState(false);

  // Review queue
  const queue = useMemo(() => {
    const filter = componentFilter === 'all' ? undefined : componentFilter;
    const prioritized = getPrioritizedReviewQueue(cards, srsData, filter);

    if (includeAllInsteadOfDue) {
      return prioritized;
    }

    // Filter to only cards due OR never reviewed
    const now = Date.now();
    const dueItems = prioritized.filter(
      (item) => item.state.totalReviews === 0 || now >= item.state.nextReviewDate
    );

    // If no cards are strictly due, provide the top 15 prioritized
    return dueItems.length > 0 ? dueItems : prioritized.slice(0, 15);
  }, [cards, srsData, componentFilter, includeAllInsteadOfDue]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingEvaluated, setTypingEvaluated] = useState<{
    tested: boolean;
    isCorrect: boolean;
  }>({ tested: false, isCorrect: false });
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionCompletedCount, setSessionCompletedCount] = useState(0);

  const currentItem: ReviewQueueItem | undefined = queue[currentIndex];

  // Reset card state when moving to next
  useEffect(() => {
    setIsRevealed(false);
    setTypedAnswer('');
    setTypingEvaluated({ tested: false, isCorrect: false });
    setStartTime(Date.now());
  }, [currentIndex, currentItem?.card.id, currentItem?.component]);

  // Expected answer for current component
  const expectedAnswer = useMemo(() => {
    if (!currentItem) return '';
    return currentItem.card[currentItem.component];
  }, [currentItem]);

  // Handle rating submission
  const handleRating = useCallback(
    (rating: SRSRating) => {
      if (!currentItem) return;
      const responseTimeMs = Date.now() - startTime;
      const isCorrect = rating !== 'again';

      onRecordReview(
        currentItem.card.id,
        currentItem.component,
        rating,
        responseTimeMs,
        typedAnswer || undefined,
        isCorrect
      );

      if (!isCorrect) {
        onLogMistake(
          currentItem.card.id,
          currentItem.component,
          typedAnswer || '[Felt completely forgotten]',
          expectedAnswer,
          responseTimeMs,
          'srs_review'
        );
      }

      setSessionCompletedCount((prev) => prev + 1);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // queue completed or reached end
        setCurrentIndex(0);
      }
    },
    [currentItem, startTime, typedAnswer, onRecordReview, onLogMistake, expectedAnswer, currentIndex, queue.length]
  );

  // Reveal answer
  const handleReveal = useCallback(() => {
    if (typedAnswer.trim()) {
      const match = checkAnswer(typedAnswer, expectedAnswer, settings.strictSpelling);
      setTypingEvaluated({ tested: true, isCorrect: match.isCorrect });
    }
    setIsRevealed(true);
  }, [typedAnswer, expectedAnswer, settings.strictSpelling]);

  // Keyboard shortcuts (Space = reveal, 1 = again, 2 = hard, 3 = good, 4 = easy, Enter = submit/reveal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger rating hotkeys if user is actively typing in input, unless Enter is pressed
      const isInputActive = document.activeElement?.tagName === 'INPUT';

      if (e.key === ' ' && !isInputActive) {
        e.preventDefault();
        if (!isRevealed) {
          handleReveal();
        }
      } else if (e.key === 'Enter') {
        if (!isRevealed) {
          e.preventDefault();
          handleReveal();
        }
      } else if (isRevealed && !isInputActive) {
        if (e.key === '1') handleRating('again');
        if (e.key === '2') handleRating('hard');
        if (e.key === '3') handleRating('good');
        if (e.key === '4') handleRating('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, handleReveal, handleRating]);

  // Compute predicted intervals for Anki-like button tags
  const predictedIntervals = useMemo(() => {
    if (!currentItem) return { again: '1m', hard: '10m', good: '1d', easy: '3d' };
    const curInt = currentItem.state.intervalMinutes;
    const reps = currentItem.state.repetitions;
    const ef = currentItem.state.easeFactor;

    const formatM = (mins: number) => {
      if (mins < 60) return `${mins}m`;
      if (mins < 1440) return `${Math.round(mins / 60)}h`;
      return `${(mins / 1440).toFixed(0)}d`;
    };

    return {
      again: '1m',
      hard: formatM(Math.max(10, Math.round(curInt * 1.2))),
      good:
        reps === 0
          ? '1d'
          : reps === 1
          ? '3d'
          : formatM(Math.round(curInt * ef)),
      easy:
        reps === 0
          ? '3d'
          : reps === 1
          ? '7d'
          : formatM(Math.round(curInt * ef * 1.35)),
    };
  }, [currentItem]);

  if (!currentItem) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#11141d] border border-slate-800 space-y-4">
        <Sparkles className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">All Caught Up!</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          No cards are currently due for spaced repetition review according to your schedule.
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => setIncludeAllInsteadOfDue(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Review Ahead Anyway
          </button>
          <button
            onClick={onBackToDashboard}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const suitInfo = suitStyles[currentItem.card.suit];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Session Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>SPACED REPETITION STUDIO</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Card {currentIndex + 1} of {queue.length} in queue &bull; {sessionCompletedCount} reviewed this session
            </p>
          </div>
        </div>

        {/* Filter component selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Focus:</span>
          <select
            value={componentFilter}
            onChange={(e) => setComponentFilter(e.target.value as PAOComponent | 'all')}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="all">All (P / A / O)</option>
            <option value="person">Person Only</option>
            <option value="action">Action Only</option>
            <option value="object">Object Only</option>
          </select>

          <button
            onClick={onBackToDashboard}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#131722] via-[#0f121a] to-[#0a0c11] border border-slate-800 shadow-2xl flex flex-col items-center text-center space-y-6">
        
        {/* Component Prompt Header */}
        <div className="space-y-1">
          <span className="text-[11px] font-mono tracking-widest text-slate-500 uppercase block">
            Target Component To Recall
          </span>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-slate-900/80">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentItem.component === 'person'
                  ? 'bg-amber-400'
                  : currentItem.component === 'action'
                  ? 'bg-sky-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span
              className={`text-sm sm:text-base font-bold font-mono uppercase tracking-wider ${
                currentItem.component === 'person'
                  ? 'text-amber-300'
                  : currentItem.component === 'action'
                  ? 'text-sky-300'
                  : 'text-emerald-300'
              }`}
            >
              {currentItem.component}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recall the {currentItem.component.toUpperCase()} associated with{' '}
            <strong className="text-white font-mono">{currentItem.card.name}</strong> ({currentItem.card.universe})
          </p>
        </div>

        {/* The Playing Card Display */}
        <div className="py-2">
          <PlayingCard
            card={currentItem.card}
            size="hero"
            revealed={isRevealed}
            highlightComponent={currentItem.component}
            mastery={currentItem.state.level}
            showMasteryBadge={true}
          />
        </div>

        {/* Optional Typing Input for Active Verification */}
        {!isRevealed ? (
          <div className="w-full max-w-md space-y-3">
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleReveal();
                  }
                }}
                placeholder={`Type the ${currentItem.component} (or press Space to reveal)...`}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 shadow-inner text-center"
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleReveal}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal Answer [Space]</span>
              </button>
            </div>
          </div>
        ) : (
          /* Answer Revealed View */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg space-y-6"
          >
            {/* Answer Canonical Callout */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg text-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Target Association
              </span>
              <div className="text-2xl font-black text-white tracking-wide">
                {expectedAnswer}
              </div>

              {/* Show user typed feedback if user entered text */}
              {typingEvaluated.tested && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
                    typingEvaluated.isCorrect
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-red-950/80 text-red-300 border-red-700/60'
                  }`}
                >
                  {typingEvaluated.isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Your input: &quot;{typedAnswer}&quot; ({typingEvaluated.isCorrect ? 'Correct!' : 'Incorrect'})
                  </span>
                </div>
              )}

              {/* Complete Triad for Reference */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-center gap-3">
                <span className={currentItem.component === 'person' ? 'text-amber-400 font-bold' : ''}>
                  P: {currentItem.card.person}
                </span>
                &bull;
                <span className={currentItem.component === 'action' ? 'text-sky-400 font-bold' : ''}>
                  A: {currentItem.card.action}
                </span>
                &bull;
                <span className={currentItem.component === 'object' ? 'text-emerald-400 font-bold' : ''}>
                  O: {currentItem.card.object}
                </span>
              </div>
            </div>

            {/* SRS Rating Actions (Section 5 Explicit requirement) */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Rate Your Recall (Calculates Genuine Spaced Repetition Interval)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1: Again */}
                <button
                  onClick={() => handleRating('again')}
                  className="p-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-200 flex flex-col items-center justify-center gap-1 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold font-mono">1</span>
                    <span className="text-xs font-semibold">Again</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400">
                    {predictedIntervals.again}
                  </span>
                  <span className="text-[9px] text-red-400/70">Forgot</span>
                </button>

                {/* 2: Hard */}
                <button
                  onClick={() => handleRating('hard')}
                  className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 flex flex-col items-center justify-center gap-1 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold font-mono">2</span>
                    <span className="text-xs font-semibold">Hard</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400">
                    {predictedIntervals.hard}
                  </span>
                  <span className="text-[9px] text-amber-400/70">Struggled</span>
                </button>

                {/* 3: Good */}
                <button
                  onClick={() => handleRating('good')}
                  className="p-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/80 text-sky-200 flex flex-col items-center justify-center gap-1 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold font-mono">3</span>
                    <span className="text-xs font-semibold">Good</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400">
                    {predictedIntervals.good}
                  </span>
                  <span className="text-[9px] text-sky-400/70">Remembered</span>
                </button>

                {/* 4: Easy */}
                <button
                  onClick={() => handleRating('easy')}
                  className="p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-200 flex flex-col items-center justify-center gap-1 transition group"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold font-mono">4</span>
                    <span className="text-xs font-semibold">Easy</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {predictedIntervals.easy}
                  </span>
                  <span className="text-[9px] text-emerald-400/70">Instant</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Keyboard hints footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80 w-full">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Space / Enter
            </kbd>{' '}
            Reveal
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              1-4
            </kbd>{' '}
            Rate
          </span>
        </div>
      </div>
    </div>
  );
}
