"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardSRSData, PAOCard, PAOStoreData, Suit } from '@/types/pao';
import { DeckGrid } from '../pao/DeckGrid';
import { suitStyles } from '../pao/PlayingCard';
import {
  Brain,
  Flame,
  Award,
  Clock,
  Target,
  AlertCircle,
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';

interface MainDashboardProps {
  store: PAOStoreData;
  onNavigateToTab: (tab: string, options?: any) => void;
  onSaveAssociations: (cardId: string, person: string, action: string, object: string) => void;
  onQuickPracticeCard: (card: PAOCard) => void;
}

export function MainDashboard({
  store,
  onNavigateToTab,
  onSaveAssociations,
  onQuickPracticeCard,
}: MainDashboardProps) {
  const { cards, srsData, streak, mistakes, speedScores, dailyActivity } = store;

  // Calculate high-level metrics
  const stats = useMemo(() => {
    let totalCardsMastered = 0;
    let personMastered = 0;
    let actionMastered = 0;
    let objectMastered = 0;
    let totalReviewsAll = 0;
    let totalCorrectAll = 0;
    let totalTimeAllMs = 0;

    let dueReviewsCount = 0;
    const now = Date.now();

    cards.forEach((card) => {
      const s = srsData[card.id];
      if (!s) return;

      if (s.overallMastery === 'mastered') totalCardsMastered++;
      if (s.person.level === 'mastered') personMastered++;
      if (s.action.level === 'mastered') actionMastered++;
      if (s.object.level === 'mastered') objectMastered++;

      ['person', 'action', 'object'].forEach((compKey) => {
        const comp = s[compKey as 'person' | 'action' | 'object'];
        totalReviewsAll += comp.totalReviews;
        totalCorrectAll += comp.correctReviews;
        totalTimeAllMs += comp.totalResponseTimeMs;
        if (comp.totalReviews === 0 || now >= comp.nextReviewDate) {
          dueReviewsCount++;
        }
      });
    });

    const overallAccuracy =
      totalReviewsAll > 0 ? Math.round((totalCorrectAll / totalReviewsAll) * 100) : 0;
    const avgResponseTimeSec =
      totalReviewsAll > 0 ? (totalTimeAllMs / totalReviewsAll / 1000).toFixed(1) : '0.0';

    // Calculate total tests completed from dailyActivity logs + speedScores
    let totalTestsCompleted = speedScores.length + store.threeCardLogs.length;
    Object.values(dailyActivity).forEach((d) => {
      totalTestsCompleted += Math.round(d.totalCount / 5); // approximate sessions
    });
    if (totalTestsCompleted === 0 && totalReviewsAll > 0) {
      totalTestsCompleted = Math.max(1, Math.round(totalReviewsAll / 10));
    }

    // Identify weakest cards (highest mistakes or lowest accuracy)
    const cardMistakeScores = cards.map((card) => {
      const s = srsData[card.id];
      const mistakesCount = s ? s.totalMistakes : 0;
      const totalRev = s
        ? s.person.totalReviews + s.action.totalReviews + s.object.totalReviews
        : 0;
      const totalCor = s
        ? s.person.correctReviews + s.action.correctReviews + s.object.correctReviews
        : 0;
      const acc = totalRev > 0 ? Math.round((totalCor / totalRev) * 100) : 100;

      return {
        card,
        mistakesCount,
        accuracy: acc,
        reviewed: totalRev > 0,
      };
    });

    // Cards with at least 1 mistake or low accuracy, sorted by mistakes descending
    const weakestCards = cardMistakeScores
      .filter((c) => c.mistakesCount > 0 || (c.reviewed && c.accuracy < 70))
      .sort((a, b) => b.mistakesCount - a.mistakesCount)
      .slice(0, 6);

    // Cards due for review
    const dueCardsList = cards
      .filter((card) => {
        const s = srsData[card.id];
        if (!s) return true;
        return (
          now >= s.person.nextReviewDate ||
          now >= s.action.nextReviewDate ||
          now >= s.object.nextReviewDate
        );
      })
      .slice(0, 8);

    return {
      totalCardsMastered,
      personMastered,
      actionMastered,
      objectMastered,
      overallAccuracy,
      avgResponseTimeSec,
      totalTestsCompleted,
      dueReviewsCount,
      weakestCards,
      dueCardsList,
    };
  }, [cards, srsData, speedScores, store.threeCardLogs, dailyActivity]);

  return (
    <div className="space-y-8">
      {/* Hero Welcome / Quick Action Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#141824] via-[#10141e] to-[#121929] border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-xs font-mono text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>COGNITIVE PAO ENGINE READY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              MEMORY <span className="text-indigo-400 font-extrabold">FORGE</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Master your custom 54-card Person-Action-Object system with genuine spaced
              repetition, 3-card mental imagery drills, and precision recall analytics.
            </p>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigateToTab('srs_review')}
              className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Review Due ({stats.dueReviewsCount})</span>
            </button>

            <button
              onClick={() => onNavigateToTab('train', { mode: 'person' })}
              className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Train Mode</span>
            </button>

            <button
              onClick={() => onNavigateToTab('triad_challenge')}
              className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium flex items-center gap-2 transition"
            >
              <Brain className="w-4 h-4 text-sky-400" />
              <span>3-Card Triad</span>
            </button>

            <button
              onClick={() => onNavigateToTab('deck_sequence')}
              className="px-4 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-sm font-semibold flex items-center gap-2 transition shadow-md shadow-amber-500/10"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Deck Sequence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Full Cards Mastered */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Full Cards</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.totalCardsMastered}
            </span>
            <span className="text-xs text-slate-500 font-mono"> / 54</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(stats.totalCardsMastered / 54) * 100}%` }}
            />
          </div>
        </div>

        {/* Person Mastery */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90">
              Persons
            </span>
            <span className="text-xs font-mono text-amber-400">P</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.personMastered}
            </span>
            <span className="text-xs text-slate-500 font-mono"> / 54</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${(stats.personMastered / 54) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Mastery */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400/90">
              Actions
            </span>
            <span className="text-xs font-mono text-sky-400">A</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.actionMastered}
            </span>
            <span className="text-xs text-slate-500 font-mono"> / 54</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-400 h-full transition-all duration-500"
              style={{ width: `${(stats.actionMastered / 54) * 100}%` }}
            />
          </div>
        </div>

        {/* Object Mastery */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90">
              Objects
            </span>
            <span className="text-xs font-mono text-emerald-400">O</span>
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.objectMastered}
            </span>
            <span className="text-xs text-slate-500 font-mono"> / 54</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-500"
              style={{ width: `${(stats.objectMastered / 54) * 100}%` }}
            />
          </div>
        </div>

        {/* Overall Accuracy */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Accuracy</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.overallAccuracy}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Lifetime retention</span>
        </div>

        {/* Study Streak */}
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {streak.current}
            </span>
            <span className="text-xs text-slate-400">days</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Best: {streak.longest} d</span>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#10131c] border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono">Average Recall Speed</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats.avgResponseTimeSec}s
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono">Total Tests Completed</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats.totalTestsCompleted} sessions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-mono">Due for SRS Review</span>
            <span className="text-lg font-bold text-white font-mono">
              {stats.dueReviewsCount} items
            </span>
          </div>
        </div>
      </div>

      {/* Weakest Cards & Cards Due for Review Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Weakest Cards (Priority intervention) */}
        <div className="p-5 rounded-2xl bg-[#10131c] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Weakest Cards & Associations
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('mistakes')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View All Mistakes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.weakestCards.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Award className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
              No problematic cards recorded yet. Start training to detect weak spots!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stats.weakestCards.map(({ card, mistakesCount, accuracy }) => {
                const suitInfo = suitStyles[card.suit];
                return (
                  <div
                    key={card.id}
                    onClick={() => onQuickPracticeCard(card)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg border border-slate-800 flex items-center justify-center font-mono font-bold text-sm ${suitInfo.textClass} bg-slate-950`}
                      >
                        {card.code}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{card.person}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {card.action} &bull; {card.object}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-red-400 font-mono">
                        {mistakesCount} err
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {accuracy}% acc
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Due for SRS Review */}
        <div className="p-5 rounded-2xl bg-[#10131c] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Cards Due For Spaced Repetition
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('srs_review')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              <span>Start Review Session</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.dueCardsList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Award className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
              All caught up! No cards are currently overdue for spaced repetition.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stats.dueCardsList.map((card) => {
                const suitInfo = suitStyles[card.suit];
                return (
                  <div
                    key={card.id}
                    onClick={() => onQuickPracticeCard(card)}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sky-700/60 cursor-pointer transition text-center"
                  >
                    <span
                      className={`text-sm font-bold font-mono block ${suitInfo.textClass} mb-1`}
                    >
                      {card.code}
                    </span>
                    <span className="text-xs font-medium text-slate-300 truncate block">
                      {card.person}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {card.action}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* The Visual 54-Card Deck Presentation (Section 3 Requirement) */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>VISUAL 54-CARD DECK FORGE</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive card roster across Naruto (♥), One Piece (♠), Pokémon (♦), Gumball (♣)
              and Jokers. Click any card to inspect or edit.
            </p>
          </div>
        </div>

        <DeckGrid
          cards={cards}
          srsData={srsData}
          onSaveAssociations={onSaveAssociations}
          onQuickPractice={onQuickPracticeCard}
        />
      </div>
    </div>
  );
}
