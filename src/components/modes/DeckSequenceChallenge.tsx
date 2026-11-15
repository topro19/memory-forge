"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAOCard, PAOStoreData, Suit } from '@/types/pao';
import { PlayingCard, suitStyles } from '../pao/PlayingCard';
import { soundManager } from '@/lib/audioEffects';
import {
  Shuffle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  Undo2,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Search,
  Trophy,
  AlertTriangle,
  Brain,
  Hash,
} from 'lucide-react';

export interface DeckSequenceChallengeProps {
  store: PAOStoreData;
  onLogSequenceSession: (
    deckSize: number,
    correctCount: number,
    accuracy: number,
    memorizeTimeMs: number,
    recallTimeMs: number,
    firstErrorIndex: number | null,
    longestStreak: number,
    triadMode: boolean
  ) => void;
  onLogMistake: (
    cardId: string,
    component: 'person',
    userAnswer: string,
    correctAnswer: string,
    responseTimeMs: number,
    mode: string
  ) => void;
  onBackToDashboard: () => void;
}

type Phase = 'setup' | 'memorizing' | 'recalling' | 'results';
type ChunkMode = 'single' | 'triad';

export function DeckSequenceChallenge({
  store,
  onLogSequenceSession,
  onLogMistake,
  onBackToDashboard,
}: DeckSequenceChallengeProps) {
  // Configuration State
  const [deckSize, setDeckSize] = useState<number>(10);
  const [chunkMode, setChunkMode] = useState<ChunkMode>('single');
  const [includeJokers, setIncludeJokers] = useState<boolean>(true);
  const [showHints, setShowHints] = useState<boolean>(true);

  // Active Challenge State
  const [phase, setPhase] = useState<Phase>('setup');
  const [shuffledDeck, setShuffledDeck] = useState<PAOCard[]>([]);
  const [memorizeIndex, setMemorizeIndex] = useState<number>(0);
  const [reconstructedDeck, setReconstructedDeck] = useState<(PAOCard | null)[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // Timing State
  const [memorizeElapsedMs, setMemorizeElapsedMs] = useState<number>(0);
  const [recallElapsedMs, setRecallElapsedMs] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Card Rack Filter & Search
  const [filterSuit, setFilterSuit] = useState<Suit | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Available cards pool
  const baseCardPool = useMemo(() => {
    return store.cards.filter((c) => includeJokers || c.suit !== 'jokers');
  }, [store.cards, includeJokers]);

  // Start Challenge: Shuffle and initialize
  const handleStartChallenge = useCallback(() => {
    const pool = [...baseCardPool];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const actualSize = Math.min(deckSize, pool.length);
    const chosenDeck = pool.slice(0, actualSize);

    setShuffledDeck(chosenDeck);
    setMemorizeIndex(0);
    setReconstructedDeck(new Array(actualSize).fill(null));
    setSelectedSlot(0);
    setMemorizeElapsedMs(0);
    setRecallElapsedMs(0);
    setPhase('memorizing');

    if (store.settings.soundEffects) {
      soundManager.playClick();
    }
  }, [baseCardPool, deckSize, store.settings.soundEffects]);

  // Restart with same deck
  const handleRetrySameDeck = useCallback(() => {
    setMemorizeIndex(0);
    setReconstructedDeck(new Array(shuffledDeck.length).fill(null));
    setSelectedSlot(0);
    setMemorizeElapsedMs(0);
    setRecallElapsedMs(0);
    setPhase('memorizing');
  }, [shuffledDeck.length]);

  // Timer Effect for Memorization
  useEffect(() => {
    if (phase === 'memorizing') {
      const start = Date.now() - memorizeElapsedMs;
      timerRef.current = setInterval(() => {
        setMemorizeElapsedMs(Date.now() - start);
      }, 100);
    } else if (phase === 'recalling') {
      const start = Date.now() - recallElapsedMs;
      timerRef.current = setInterval(() => {
        setRecallElapsedMs(Date.now() - start);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Transition from Memorize to Recall
  const handleFinishMemorizing = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('recalling');
    setSelectedSlot(0);
    if (store.settings.soundEffects) {
      soundManager.playCorrect();
    }
  }, [store.settings.soundEffects]);

  // Place card into current slot
  const handlePlaceCard = useCallback(
    (card: PAOCard) => {
      // Check if already placed in the sequence
      const existingIndex = reconstructedDeck.findIndex((c) => c && c.id === card.id);
      if (existingIndex !== -1) {
        // Swap or remove from old slot
        const updated = [...reconstructedDeck];
        updated[existingIndex] = null;
        updated[selectedSlot] = card;
        setReconstructedDeck(updated);
      } else {
        const updated = [...reconstructedDeck];
        updated[selectedSlot] = card;
        setReconstructedDeck(updated);
      }

      if (store.settings.soundEffects) {
        soundManager.playClick();
      }

      // Auto-advance to the next empty slot
      const nextEmpty = reconstructedDeck.findIndex(
        (c, idx) => idx > selectedSlot && c === null
      );
      if (nextEmpty !== -1) {
        setSelectedSlot(nextEmpty);
      } else {
        // Find any empty slot
        const anyEmpty = reconstructedDeck.findIndex((c, idx) => idx !== selectedSlot && c === null);
        if (anyEmpty !== -1) {
          setSelectedSlot(anyEmpty);
        } else if (selectedSlot < reconstructedDeck.length - 1) {
          setSelectedSlot(selectedSlot + 1);
        }
      }
      setSearchQuery('');
    },
    [reconstructedDeck, selectedSlot, store.settings.soundEffects]
  );

  // Remove card from a slot
  const handleRemoveCard = useCallback((slotIdx: number) => {
    setReconstructedDeck((prev) => {
      const copy = [...prev];
      copy[slotIdx] = null;
      return copy;
    });
    setSelectedSlot(slotIdx);
  }, []);

  // Quick Undo last placed card
  const handleUndoLast = useCallback(() => {
    // Find the latest filled slot
    for (let i = reconstructedDeck.length - 1; i >= 0; i--) {
      if (reconstructedDeck[i] !== null) {
        handleRemoveCard(i);
        break;
      }
    }
  }, [reconstructedDeck, handleRemoveCard]);

  // Clear all placements
  const handleClearAll = useCallback(() => {
    setReconstructedDeck(new Array(shuffledDeck.length).fill(null));
    setSelectedSlot(0);
  }, [shuffledDeck.length]);

  // Set of already placed card IDs
  const placedCardIds = useMemo(() => {
    const set = new Map<string, number>();
    reconstructedDeck.forEach((card, idx) => {
      if (card) set.set(card.id, idx);
    });
    return set;
  }, [reconstructedDeck]);

  // Filtered Cards Rack
  const rackCards = useMemo(() => {
    return baseCardPool.filter((c) => {
      if (filterSuit !== 'all' && c.suit !== filterSuit) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeClean = c.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const valClean = c.value.toLowerCase();
        const personClean = c.person.toLowerCase();
        const suitClean = c.suit.toLowerCase();
        return (
          codeClean.includes(q) ||
          valClean.includes(q) ||
          personClean.includes(q) ||
          suitClean.includes(q)
        );
      }
      return true;
    });
  }, [baseCardPool, filterSuit, searchQuery]);

  // Submit and Calculate Results
  const handleVerifySequence = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correctCount = 0;
    let firstErrorIndex: number | null = null;
    let longestStreak = 0;
    let currentStreak = 0;

    shuffledDeck.forEach((actualCard, idx) => {
      const userPick = reconstructedDeck[idx];
      const isMatch = userPick && userPick.id === actualCard.id;

      if (isMatch) {
        correctCount++;
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        if (firstErrorIndex === null) {
          firstErrorIndex = idx + 1; // 1-based index
        }
        currentStreak = 0;

        // Log this mistake into store so it shows in Mistakes tab
        onLogMistake(
          actualCard.id,
          'person',
          userPick ? `${userPick.code} (${userPick.person})` : 'Empty Slot',
          `${actualCard.code} (${actualCard.person})`,
          Math.round(memorizeElapsedMs / shuffledDeck.length),
          'deck_sequence'
        );
      }
    });

    const accuracy = Math.round((correctCount / shuffledDeck.length) * 100);

    onLogSequenceSession(
      shuffledDeck.length,
      correctCount,
      accuracy,
      memorizeElapsedMs,
      recallElapsedMs,
      firstErrorIndex,
      longestStreak,
      chunkMode === 'triad'
    );

    if (store.settings.soundEffects) {
      if (accuracy >= 80) soundManager.playCorrect();
      else soundManager.playIncorrect();
    }

    setPhase('results');
  }, [
    shuffledDeck,
    reconstructedDeck,
    memorizeElapsedMs,
    recallElapsedMs,
    chunkMode,
    onLogMistake,
    onLogSequenceSession,
    store.settings.soundEffects,
  ]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'memorizing') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          if (chunkMode === 'single') {
            if (memorizeIndex < shuffledDeck.length - 1) {
              setMemorizeIndex((prev) => prev + 1);
            } else {
              handleFinishMemorizing();
            }
          } else {
            // Triad
            if (memorizeIndex + 3 < shuffledDeck.length) {
              setMemorizeIndex((prev) => prev + 3);
            } else {
              handleFinishMemorizing();
            }
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (chunkMode === 'single') {
            setMemorizeIndex((prev) => Math.max(0, prev - 1));
          } else {
            setMemorizeIndex((prev) => Math.max(0, prev - 3));
          }
        } else if (e.key.toLowerCase() === 'h') {
          setShowHints((prev) => !prev);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleFinishMemorizing();
        }
      } else if (phase === 'recalling') {
        if (e.key === 'ArrowLeft' && !searchInputRef.current?.matches(':focus')) {
          e.preventDefault();
          setSelectedSlot((prev) => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight' && !searchInputRef.current?.matches(':focus')) {
          e.preventDefault();
          setSelectedSlot((prev) => Math.min(shuffledDeck.length - 1, prev + 1));
        } else if (e.key === 'Backspace' && !searchInputRef.current?.matches(':focus')) {
          e.preventDefault();
          handleRemoveCard(selectedSlot);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    phase,
    memorizeIndex,
    shuffledDeck.length,
    chunkMode,
    selectedSlot,
    handleFinishMemorizing,
    handleRemoveCard,
  ]);

  // Format Elapsed Time (mm:ss.s)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  };

  // Quick text search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rackCards.length > 0) {
      handlePlaceCard(rackCards[0]);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e111a] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                Deck Sequence Challenge
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                SPEED CARDS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Memorize a full shuffled sequence &bull; Reconstruct the order from memory &bull; Instant accuracy audit
            </p>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          Exit to Dashboard
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. SETUP PHASE */}
      {/* ======================================================== */}
      {phase === 'setup' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1017] border border-slate-800 shadow-2xl max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold">
              CHAMPIONSHIP MEMORY MODE
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ready to Test Your Deck Recall?
            </h3>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              You will be presented with a randomly shuffled deck. Take as much time as you need to visualize your loci, then place all cards into their exact sequence.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {/* Deck Size Selector */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Select Deck Test Size</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { size: 10, label: '10 Cards', desc: 'Fast Warmup' },
                  { size: 26, label: '26 Cards', desc: 'Half Deck' },
                  { size: 52, label: '52 Cards', desc: 'Standard Deck' },
                  { size: 54, label: '54 Cards', desc: 'Full Deck + Jokers' },
                ].map((opt) => (
                  <button
                    key={opt.size}
                    onClick={() => {
                      setDeckSize(opt.size);
                      if (opt.size === 54) setIncludeJokers(true);
                      else if (opt.size === 52) setIncludeJokers(false);
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      deckSize === opt.size
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`text-base font-black font-mono ${
                        deckSize === opt.size ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chunking Mode: 1-by-1 vs 3-by-3 Triad */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-400" />
                <span>Memorization Chunking Strategy</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setChunkMode('single')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    chunkMode === 'single'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">Single Card (1-by-1)</span>
                    <span className="text-xs font-mono text-sky-400">Classic</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Flip through the deck one card at a time. Ideal for deliberate focus.
                  </p>
                </button>

                <button
                  onClick={() => setChunkMode('triad')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    chunkMode === 'triad'
                      ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">3-Card Triad (Loci Mode)</span>
                    <span className="text-xs font-mono text-indigo-400">Championship</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Groups cards in 3s (Person 1 + Action 2 + Object 3) into a single mental scene per locus.
                  </p>
                </button>
              </div>
            </div>

            {/* Helpers & Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHints}
                  onChange={(e) => setShowHints(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Show PAO Cues during memorization</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeJokers}
                  onChange={(e) => setIncludeJokers(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Include Jokers (Saitama &amp; Boo Boo)</span>
              </label>
            </div>
          </div>

          {/* Action Launch */}
          <div className="pt-4">
            <button
              onClick={handleStartChallenge}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition transform active:scale-[0.99]"
            >
              <Shuffle className="w-5 h-5 text-amber-200" />
              <span>SHUFFLE DECK &amp; START MEMORIZING</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-center text-[11px] font-mono text-slate-500 mt-2">
              Hotkeys: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Space</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">→</kbd> next card &bull; <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Enter</kbd> finish
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MEMORIZATION PHASE */}
      {/* ======================================================== */}
      {phase === 'memorizing' && shuffledDeck.length > 0 && (
        <div className="space-y-6">
          {/* Top Stopwatch & Progress Bar */}
          <div className="p-4 rounded-2xl bg-[#0f131d] border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  MEMORIZING TIME
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
                  {formatTime(memorizeElapsedMs)}
                </span>
              </div>
            </div>

            {/* Progress Counter */}
            <div className="text-center sm:text-right">
              <span className="text-xs font-mono text-slate-400 block">
                {chunkMode === 'single' ? (
                  <>
                    CARD <span className="font-bold text-white">{memorizeIndex + 1}</span> OF{' '}
                    {shuffledDeck.length}
                  </>
                ) : (
                  <>
                    LOCUS <span className="font-bold text-white">{Math.floor(memorizeIndex / 3) + 1}</span>{' '}
                    OF {Math.ceil(shuffledDeck.length / 3)}
                  </>
                )}
              </span>
              <div className="w-32 sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{
                    width: `${((memorizeIndex + (chunkMode === 'triad' ? 3 : 1)) / shuffledDeck.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Quick Done Button */}
            <button
              onClick={handleFinishMemorizing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
            >
              <span>Done Memorizing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Card(s) View */}
          {chunkMode === 'single' ? (
            /* Single Card View */
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div className="relative">
                <PlayingCard
                  card={shuffledDeck[memorizeIndex]}
                  size="hero"
                  revealed={true}
                  customClass="shadow-2xl shadow-indigo-950/60"
                />
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-300 shadow">
                  #{memorizeIndex + 1}
                </div>
              </div>

              {/* PAO Association Pill */}
              {showHints && (
                <div className="max-w-md w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
                  <div className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest">
                    {shuffledDeck[memorizeIndex].universe}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-amber-900/40">
                      <span className="text-[10px] text-amber-400 uppercase block font-mono">Person</span>
                      <span className="font-bold text-slate-200">{shuffledDeck[memorizeIndex].person}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-sky-900/40">
                      <span className="text-[10px] text-sky-400 uppercase block font-mono">Action</span>
                      <span className="font-bold text-slate-200">{shuffledDeck[memorizeIndex].action}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                      <span className="text-[10px] text-emerald-400 uppercase block font-mono">Object</span>
                      <span className="font-bold text-slate-200">{shuffledDeck[memorizeIndex].object}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Triad 3-Card Chunking View */
            <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {/* Card 1: PERSON */}
                <div className="p-4 rounded-2xl bg-[#0d1017] border border-amber-900/50 flex flex-col items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold uppercase">
                    1. PERSON (#{memorizeIndex + 1})
                  </div>
                  {shuffledDeck[memorizeIndex] && (
                    <>
                      <PlayingCard card={shuffledDeck[memorizeIndex]} size="md" revealed={true} />
                      <div className="text-center">
                        <span className="text-base font-black text-amber-300 block">
                          {shuffledDeck[memorizeIndex].person}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {shuffledDeck[memorizeIndex].universe}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Card 2: ACTION */}
                <div className="p-4 rounded-2xl bg-[#0d1017] border border-sky-900/50 flex flex-col items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-bold uppercase">
                    2. ACTION (#{memorizeIndex + 2})
                  </div>
                  {shuffledDeck[memorizeIndex + 1] ? (
                    <>
                      <PlayingCard card={shuffledDeck[memorizeIndex + 1]} size="md" revealed={true} />
                      <div className="text-center">
                        <span className="text-base font-black text-sky-300 block">
                          {shuffledDeck[memorizeIndex + 1].action}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {shuffledDeck[memorizeIndex + 1].universe}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-600 font-mono">
                      (End of Deck)
                    </div>
                  )}
                </div>

                {/* Card 3: OBJECT */}
                <div className="p-4 rounded-2xl bg-[#0d1017] border border-emerald-900/50 flex flex-col items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold uppercase">
                    3. OBJECT (#{memorizeIndex + 3})
                  </div>
                  {shuffledDeck[memorizeIndex + 2] ? (
                    <>
                      <PlayingCard card={shuffledDeck[memorizeIndex + 2]} size="md" revealed={true} />
                      <div className="text-center">
                        <span className="text-base font-black text-emerald-300 block">
                          {shuffledDeck[memorizeIndex + 2].object}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {shuffledDeck[memorizeIndex + 2].universe}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-600 font-mono">
                      (End of Deck)
                    </div>
                  )}
                </div>
              </div>

              {/* Synthesized Mental Scene */}
              {shuffledDeck[memorizeIndex] && (
                <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/50 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block mb-1">
                    COMBINED LOCUS SCENE
                  </span>
                  <p className="text-lg font-black text-white">
                    <span className="text-amber-300">{shuffledDeck[memorizeIndex].person}</span>
                    {' + '}
                    <span className="text-sky-300">
                      {shuffledDeck[memorizeIndex + 1]?.action || '...'}
                    </span>
                    {' + '}
                    <span className="text-emerald-300">
                      {shuffledDeck[memorizeIndex + 2]?.object || '...'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between max-w-xl mx-auto pt-4 gap-3">
            <button
              onClick={() => {
                if (chunkMode === 'single') {
                  setMemorizeIndex((prev) => Math.max(0, prev - 1));
                } else {
                  setMemorizeIndex((prev) => Math.max(0, prev - 3));
                }
              }}
              disabled={memorizeIndex === 0}
              className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition text-xs font-mono"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setShowHints((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
            >
              {showHints ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showHints ? 'Hide Cues' : 'Show Cues'} [H]</span>
            </button>

            {memorizeIndex < (chunkMode === 'single' ? shuffledDeck.length - 1 : shuffledDeck.length - 3) ? (
              <button
                onClick={() => {
                  if (chunkMode === 'single') {
                    setMemorizeIndex((prev) => prev + 1);
                  } else {
                    setMemorizeIndex((prev) => prev + 3);
                  }
                }}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition text-xs font-mono shadow-lg shadow-indigo-600/30"
              >
                <span>Next ({chunkMode === 'single' ? 'Card' : 'Triad'})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishMemorizing}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition text-xs font-mono shadow-lg shadow-emerald-600/30"
              >
                <span>Start Recall ➔</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RECONSTRUCTION / RECALL PHASE */}
      {/* ======================================================== */}
      {phase === 'recalling' && (
        <div className="space-y-6">
          {/* Top Bar: Progress, Timer & Actions */}
          <div className="p-4 rounded-2xl bg-[#0e121a] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                  RECALL TIMER
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {formatTime(recallElapsedMs)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Placed:{' '}
                <span className="font-bold text-white">
                  {reconstructedDeck.filter(Boolean).length}
                </span>{' '}
                / {shuffledDeck.length}
              </span>

              <button
                onClick={handleUndoLast}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                title="Undo last placed card"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
                title="Clear all cards"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleVerifySequence}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Verify Sequence</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: The Sequence Grid (Slots 1 to N) */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-[#0b0e15] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Target Sequence (Click slot to select)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-indigo-400">
                  Active Slot: #{selectedSlot + 1}
                </span>
              </div>

              {/* Slot Cards Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 xl:grid-cols-7 gap-2 max-h-[560px] overflow-y-auto pr-1">
                {reconstructedDeck.map((card, idx) => {
                  const isSelected = selectedSlot === idx;
                  const suitInfo = card ? suitStyles[card.suit] : null;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedSlot(idx)}
                      className={`relative aspect-[2.5/3.5] rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center p-1 select-none ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/60 shadow-lg scale-105 z-10'
                          : card
                          ? 'border-slate-700/80 bg-slate-900/90 hover:border-slate-500'
                          : 'border-dashed border-slate-800 bg-slate-950/50 hover:border-slate-700'
                      }`}
                    >
                      {/* Slot Number Badge */}
                      <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </span>

                      {/* Card Content or Empty Placeholder */}
                      {card ? (
                        <>
                          <span
                            className={`text-sm sm:text-base font-black font-mono leading-none ${
                              suitInfo?.textClass || 'text-white'
                            }`}
                          >
                            {card.code}
                          </span>
                          <span className="text-[9px] font-medium text-slate-300 truncate max-w-full px-1 mt-1 text-center">
                            {card.person}
                          </span>

                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCard(idx);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition"
                            title="Remove"
                          >
                            &times;
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-600 text-base font-mono">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Available Cards Rack */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-[#0b0e15] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Card Rack &bull; Drop into #{selectedSlot + 1}
                  </h3>
                </div>
              </div>

              {/* Fast Keyboard Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Quick pick by code (e.g. 7h, as, kd, rj) or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </form>

              {/* Suit Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'hearts', label: '♥ Hearts' },
                    { id: 'spades', label: '♠ Spades' },
                    { id: 'diamonds', label: '♦ Diamonds' },
                    { id: 'clubs', label: '♣ Clubs' },
                    { id: 'jokers', label: '★ Jokers' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterSuit(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition ${
                      filterSuit === tab.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Rack Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {rackCards.map((card) => {
                  const placedAt = placedCardIds.get(card.id);
                  const isPlaced = placedAt !== undefined;
                  const suitInfo = suitStyles[card.suit];

                  return (
                    <button
                      key={card.id}
                      onClick={() => handlePlaceCard(card)}
                      className={`relative aspect-[2.5/3.5] rounded-xl border p-1 flex flex-col items-center justify-between text-center transition ${
                        isPlaced
                          ? 'opacity-35 bg-slate-950/40 border-slate-900 hover:opacity-75'
                          : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/80 hover:scale-105 shadow'
                      }`}
                    >
                      <span
                        className={`text-sm font-black font-mono leading-none ${suitInfo.textClass}`}
                      >
                        {card.code}
                      </span>
                      <span className="text-[9px] font-medium text-slate-300 truncate w-full px-0.5">
                        {card.person}
                      </span>

                      {isPlaced && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                          #{placedAt + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. RESULTS & AUDIT PHASE */}
      {/* ======================================================== */}
      {phase === 'results' && (
        <div className="space-y-8">
          {/* Hero Audit Banner */}
          {(() => {
            let correct = 0;
            let firstErr: number | null = null;
            let maxStreak = 0;
            let curStreak = 0;

            shuffledDeck.forEach((actual, idx) => {
              const pick = reconstructedDeck[idx];
              if (pick && pick.id === actual.id) {
                correct++;
                curStreak++;
                if (curStreak > maxStreak) maxStreak = curStreak;
              } else {
                if (firstErr === null) firstErr = idx + 1;
                curStreak = 0;
              }
            });

            const accuracy = Math.round((correct / shuffledDeck.length) * 100);
            const isPerfect = accuracy === 100;

            return (
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
                  isPerfect
                    ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-indigo-950/60 border-emerald-500/50'
                    : accuracy >= 80
                    ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border-indigo-500/50'
                    : 'bg-gradient-to-br from-slate-900 via-slate-950 to-[#0e111a] border-slate-800'
                }`}
              >
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      {isPerfect
                        ? '100% PERFECT MEMORY RECALL'
                        : accuracy >= 80
                        ? 'CHAMPIONSHIP-TIER RECALL'
                        : 'CHALLENGE COMPLETE'}
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {correct} / {shuffledDeck.length} Cards Correct
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                      {isPerfect
                        ? 'Astonishing feat! You recalled every single card in exact sequence without a single flaw.'
                        : `You correctly sequenced ${correct} out of ${shuffledDeck.length} cards (${accuracy}% accuracy). Review below to see where your loci slipped!`}
                    </p>
                  </div>

                  {/* Quick Score Tile */}
                  <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 font-mono">
                    <div className="text-center">
                      <span className="text-[10px] uppercase text-slate-500 block">Accuracy</span>
                      <span className="text-3xl font-black text-emerald-400">{accuracy}%</span>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase text-slate-500 block">Memorize</span>
                      <span className="text-sm font-bold text-cyan-400">
                        {formatTime(memorizeElapsedMs)}
                      </span>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase text-slate-500 block">Recall</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatTime(recallElapsedMs)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">First Error Point</span>
                    <span className="text-sm font-bold text-amber-400">
                      {firstErr === null ? 'None (Flawless)' : `Card #${firstErr}`}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Longest Streak</span>
                    <span className="text-sm font-bold text-indigo-400">{maxStreak} Cards</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Memorize Speed</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {memorizeElapsedMs > 0
                        ? `${((shuffledDeck.length / (memorizeElapsedMs / 1000)) * 60).toFixed(1)} cpm`
                        : '-'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Total Misplaced</span>
                    <span className="text-sm font-bold text-red-400">
                      {shuffledDeck.length - correct} Cards
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Detailed Verification List */}
          <div className="p-6 rounded-3xl bg-[#0b0e15] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Sequence Verification (Side-by-Side Audit)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Green = Correct &bull; Red = Misplaced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {shuffledDeck.map((actualCard, idx) => {
                const userCard = reconstructedDeck[idx];
                const isMatch = userCard && userCard.id === actualCard.id;
                const actualSuit = suitStyles[actualCard.suit];
                const userSuit = userCard ? suitStyles[userCard.suit] : null;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      isMatch
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : 'bg-red-950/20 border-red-800/70'
                    }`}
                  >
                    {/* Header badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-black text-slate-400">
                        POSITION #{idx + 1}
                      </span>
                      {isMatch ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> MATCH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> WRONG
                        </span>
                      )}
                    </div>

                    {/* Comparison Cards */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Actual Target Card */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-14 rounded-lg border border-slate-700 flex flex-col items-center justify-center font-mono font-bold text-sm ${actualSuit.textClass} bg-slate-900 shadow`}
                        >
                          {actualCard.code}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-500 block">
                            Target
                          </span>
                          <span className="text-xs font-bold text-slate-200 block truncate max-w-[90px]">
                            {actualCard.person}
                          </span>
                        </div>
                      </div>

                      {/* Your Placed Card */}
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          Your Pick
                        </span>
                        {userCard ? (
                          <div className="flex items-center gap-2 justify-end">
                            <div>
                              <span
                                className={`text-xs font-bold block truncate max-w-[90px] ${
                                  isMatch ? 'text-emerald-300' : 'text-red-300'
                                }`}
                              >
                                {userCard.person}
                              </span>
                            </div>
                            <div
                              className={`w-10 h-14 rounded-lg border border-slate-700 flex flex-col items-center justify-center font-mono font-bold text-sm ${
                                userSuit?.textClass || 'text-white'
                              } bg-slate-900 shadow`}
                            >
                              {userCard.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-red-400 italic">Empty Slot</span>
                        )}
                      </div>
                    </div>

                    {/* Target Card PAO Cue */}
                    {!isMatch && (
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                        <span className="text-slate-500">PAO: </span>
                        <span className="text-amber-400">{actualCard.person}</span> +{' '}
                        <span className="text-sky-400">{actualCard.action}</span> +{' '}
                        <span className="text-emerald-400">{actualCard.object}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-4">
            <button
              onClick={handleRetrySameDeck}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Same Deck</span>
            </button>

            <button
              onClick={handleStartChallenge}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <Shuffle className="w-4 h-4" />
              <span>New Shuffled Deck</span>
            </button>

            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition text-sm font-medium"
            >
              Change Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
