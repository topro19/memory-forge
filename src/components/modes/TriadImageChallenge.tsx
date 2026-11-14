"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAOCard, PAOStoreData, ThreeCardSessionLog } from '@/types/pao';
import { PlayingCard, suitStyles } from '../pao/PlayingCard';
import {
  Brain,
  Sparkles,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  History,
  Trophy,
} from 'lucide-react';

interface TriadImageChallengeProps {
  store: PAOStoreData;
  onLogTriadSession: (
    cards: [string, string, string],
    story: { person: string; action: string; object: string },
    rating: 'success' | 'partial' | 'failed',
    timeSpentMs: number
  ) => void;
  onBackToDashboard: () => void;
}

export function TriadImageChallenge({
  store,
  onLogTriadSession,
  onBackToDashboard,
}: TriadImageChallengeProps) {
  const { cards, threeCardLogs } = store;

  // Active 3 cards
  const [triadCards, setTriadCards] = useState<[PAOCard, PAOCard, PAOCard] | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Generate 3 unique random cards
  const dealNewTriad = useCallback(() => {
    if (cards.length < 3) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const c1 = shuffled[0];
    const c2 = shuffled[1];
    const c3 = shuffled[2];

    setTriadCards([c1, c2, c3]);
    setIsRevealed(false);
    setStartTime(Date.now());
    setElapsedSec(0);
    setTimerRunning(true);
  }, [cards]);

  // Initial deal
  useEffect(() => {
    if (!triadCards) {
      dealNewTriad();
    }
  }, [triadCards, dealNewTriad]);

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && !isRevealed) {
      interval = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, isRevealed, startTime]);

  // Handle rating
  const handleRating = (rating: 'success' | 'partial' | 'failed') => {
    if (!triadCards) return;
    const totalDurationMs = Date.now() - startTime;
    const story = {
      person: triadCards[0].person,
      action: triadCards[1].action,
      object: triadCards[2].object,
    };

    onLogTriadSession(
      [triadCards[0].id, triadCards[1].id, triadCards[2].id],
      story,
      rating,
      totalDurationMs
    );

    // Deal next triad immediately
    dealNewTriad();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isRevealed) {
        e.preventDefault();
        setIsRevealed(true);
        setTimerRunning(false);
      } else if (isRevealed) {
        if (e.key === '1') handleRating('success');
        if (e.key === '2') handleRating('partial');
        if (e.key === '3') handleRating('failed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed]);

  // Historical metrics
  const sessionStats = useMemo(() => {
    const total = threeCardLogs.length;
    if (total === 0) return { total: 0, successRate: 0, avgTimeSec: 0 };
    const successCount = threeCardLogs.filter((l) => l.rating === 'success').length;
    const successRate = Math.round((successCount / total) * 100);
    const avgTimeMs = threeCardLogs.reduce((acc, l) => acc + l.timeSpentMs, 0) / total;
    return {
      total,
      successRate,
      avgTimeSec: (avgTimeMs / 1000).toFixed(1),
    };
  }, [threeCardLogs]);

  if (!triadCards) return null;

  const [card1, card2, card3] = triadCards;

  // Construct dynamic composite scene sentence
  const compositeSentence = `${card1.person} is ${card2.action.toLowerCase()} the ${card3.object.toLowerCase()}!`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[#11141d] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-400">
            <Brain className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>THREE-CARD PAO IMAGE CHALLENGE</span>
            </h2>
            <p className="text-xs text-slate-400">
              Combine 3 playing cards into 1 unforgettable cognitive mental image: Person (Card 1) + Action (Card 2) + Object (Card 3).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{elapsedSec}s elapsed</span>
          </div>

          <button
            onClick={dealNewTriad}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Deal New Triad</span>
          </button>
        </div>
      </div>

      {/* Main Imagery Arena */}
      <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#141824] via-[#10131d] to-[#090b10] border border-slate-800/90 shadow-2xl flex flex-col items-center space-y-8">
        
        {/* Triad Blueprint Guide */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-6 text-xs font-mono uppercase tracking-wider">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="w-6 h-6 rounded-full bg-amber-950/80 border border-amber-600/80 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>Card 1: Person</span>
          </div>
          <span className="text-slate-600">+</span>
          <div className="flex items-center gap-2 text-sky-400">
            <span className="w-6 h-6 rounded-full bg-sky-950/80 border border-sky-600/80 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>Card 2: Action</span>
          </div>
          <span className="text-slate-600">+</span>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-600/80 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>Card 3: Object</span>
          </div>
        </div>

        {/* 3 Playing Cards in Row */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-2xl justify-items-center">
          {/* Card 1: Person */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="w-full flex justify-center">
              <PlayingCard
                card={card1}
                size="md"
                revealed={isRevealed}
                highlightComponent="person"
                customClass="shadow-2xl"
              />
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-amber-900/50 w-full text-center">
              <span className="text-[10px] uppercase font-mono text-amber-400 block font-bold">
                1. Person
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                {isRevealed ? card1.person : '???'}
              </p>
            </div>
          </div>

          {/* Card 2: Action */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="w-full flex justify-center">
              <PlayingCard
                card={card2}
                size="md"
                revealed={isRevealed}
                highlightComponent="action"
                customClass="shadow-2xl"
              />
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-sky-900/50 w-full text-center">
              <span className="text-[10px] uppercase font-mono text-sky-400 block font-bold">
                2. Action
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                {isRevealed ? card2.action : '???'}
              </p>
            </div>
          </div>

          {/* Card 3: Object */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="w-full flex justify-center">
              <PlayingCard
                card={card3}
                size="md"
                revealed={isRevealed}
                highlightComponent="object"
                customClass="shadow-2xl"
              />
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-900/50 w-full text-center">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
                3. Object
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                {isRevealed ? card3.object : '???'}
              </p>
            </div>
          </div>
        </div>

        {/* Reveal / Rate Controls */}
        {!isRevealed ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-xs text-slate-400 max-w-md text-center">
              Look at the three cards above. Mentally visualize the character from Card 1 performing the action from Card 2 onto the object from Card 3.
            </p>
            <button
              onClick={() => {
                setIsRevealed(true);
                setTimerRunning(false);
              }}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-purple-600/25 flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4" />
              <span>Reveal Mnemonic Scene [Space]</span>
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl space-y-6 text-center"
          >
            {/* The Synthesized Vivid Mental Story */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/70 border border-purple-500/30 shadow-xl space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300">
                Combined Mental Visualization Scene
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-snug">
                &ldquo;{compositeSentence}&rdquo;
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {card1.person} ({card1.universe}) &bull; {card2.action} ({card2.universe}) &bull; {card3.object} ({card3.universe})
              </p>
            </div>

            {/* Self Rating Buttons (Strict Section 7 Requirement) */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                How clearly did you mentally construct this scene?
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1: Successfully Visualised */}
                <button
                  onClick={() => handleRating('success')}
                  className="p-3.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-200 flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-emerald-950/40"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono">[1]</span>
                  </div>
                  <span className="text-xs font-semibold">Image Successfully Visualised</span>
                  <span className="text-[10px] text-emerald-400/80">Vivid & clear</span>
                </button>

                {/* 2: Partially Visualised */}
                <button
                  onClick={() => handleRating('partial')}
                  className="p-3.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 border border-amber-700/80 text-amber-200 flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-amber-950/40"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold font-mono">[2]</span>
                  </div>
                  <span className="text-xs font-semibold">Partially Visualised</span>
                  <span className="text-[10px] text-amber-400/80">Struggled on parts</span>
                </button>

                {/* 3: Failed to Visualise */}
                <button
                  onClick={() => handleRating('failed')}
                  className="p-3.5 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-700/80 text-red-200 flex flex-col items-center justify-center gap-1 transition shadow-lg shadow-red-950/40"
                >
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold font-mono">[3]</span>
                  </div>
                  <span className="text-xs font-semibold">Failed to Visualise</span>
                  <span className="text-[10px] text-red-400/80">Could not link</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* History and Stats for Triad Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-purple-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Triads Visualized</span>
            <span className="text-xl font-black text-white font-mono">
              {sessionStats.total} scenes
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Vivid Success Rate</span>
            <span className="text-xl font-black text-white font-mono">
              {sessionStats.successRate}%
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Avg Creation Speed</span>
            <span className="text-xl font-black text-white font-mono">
              {sessionStats.avgTimeSec}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
