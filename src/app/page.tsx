"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppSettings,
  PAOCard,
  PAOComponent,
  PAOStoreData,
  SRSRating,
} from '@/types/pao';
import {
  loadStore,
  recordSRSReview,
  logMistake,
  logThreeCardSession,
  logSpeedScore,
  logDeckSequenceSession,
  updateCardAssociations,
  updateSettings,
  resetAllDataToDefault,
} from '@/lib/paoStorage';
import { soundManager } from '@/lib/audioEffects';

import { PaoNavbar } from '@/components/layout/PaoNavbar';
import { KeyboardShortcutsModal } from '@/components/layout/KeyboardShortcutsModal';
import { MainDashboard } from '@/components/dashboard/MainDashboard';
import { TrainingHub, TrainingModeKey } from '@/components/modes/TrainingHub';
import { TriadImageChallenge } from '@/components/modes/TriadImageChallenge';
import { DeckSequenceChallenge } from '@/components/modes/DeckSequenceChallenge';
import { SrsReviewStudio } from '@/components/modes/SrsReviewStudio';
import { MistakesView } from '@/components/mistakes/MistakesView';
import { StatsView } from '@/components/stats/StatsView';
import { DatabaseManager } from '@/components/database/DatabaseManager';

export default function MemoryForgeApp() {
  const [store, setStore] = useState<PAOStoreData | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeTrainingMode, setActiveTrainingMode] = useState<TrainingModeKey>('person');
  const [drillCard, setDrillCard] = useState<PAOCard | null>(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);

  // Initialize store on client
  useEffect(() => {
    const loaded = loadStore();
    setStore(loaded);
  }, []);

  const refreshStore = useCallback(() => {
    const updated = loadStore();
    setStore(updated);
  }, []);

  // Handlers for record updates
  const handleRecordReview = useCallback(
    (
      cardId: string,
      component: PAOComponent,
      rating: SRSRating,
      responseTimeMs: number,
      userAnswer?: string,
      isCorrect?: boolean
    ) => {
      const updated = recordSRSReview(
        cardId,
        component,
        rating,
        responseTimeMs,
        userAnswer,
        isCorrect
      );
      setStore(updated);

      if (updated.settings.soundEffects) {
        if (isCorrect !== false && rating !== 'again') {
          soundManager.playCorrect();
        } else {
          soundManager.playIncorrect();
        }
      }
    },
    []
  );

  const handleLogMistake = useCallback(
    (
      cardId: string,
      component: PAOComponent,
      userAnswer: string,
      correctAnswer: string,
      responseTimeMs: number,
      mode: string
    ) => {
      const updated = logMistake(
        cardId,
        component,
        userAnswer,
        correctAnswer,
        responseTimeMs,
        mode
      );
      setStore(updated);
    },
    []
  );

  const handleLogTriadSession = useCallback(
    (
      cards: [string, string, string],
      story: { person: string; action: string; object: string },
      rating: 'success' | 'partial' | 'failed',
      timeSpentMs: number
    ) => {
      const updated = logThreeCardSession(cards, story, rating, timeSpentMs);
      setStore(updated);
      if (updated.settings.soundEffects) {
        if (rating === 'success') soundManager.playCorrect();
        else if (rating === 'failed') soundManager.playIncorrect();
      }
    },
    []
  );

  const handleLogSpeedScore = useCallback(
    (
      durationSeconds: number,
      correct: number,
      incorrect: number,
      skipped: number,
      avgResponseTimeMs: number
    ) => {
      const updated = logSpeedScore(
        durationSeconds,
        correct,
        incorrect,
        skipped,
        avgResponseTimeMs
      );
      setStore(updated);
    },
    []
  );

  const handleLogSequenceSession = useCallback(
    (
      deckSize: number,
      correctCount: number,
      accuracy: number,
      memorizeTimeMs: number,
      recallTimeMs: number,
      firstErrorIndex: number | null,
      longestStreak: number,
      triadMode: boolean
    ) => {
      const updated = logDeckSequenceSession(
        deckSize,
        correctCount,
        accuracy,
        memorizeTimeMs,
        recallTimeMs,
        firstErrorIndex,
        longestStreak,
        triadMode
      );
      setStore(updated);
    },
    []
  );

  const handleUpdateCardAssociations = useCallback(
    (cardId: string, person: string, action: string, object: string) => {
      const updated = updateCardAssociations(cardId, person, action, object);
      setStore(updated);
    },
    []
  );

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const updated = updateSettings(newSettings);
    setStore(updated);
  }, []);

  const handleResetToDefault = useCallback(() => {
    const reset = resetAllDataToDefault();
    setStore(reset);
  }, []);

  // Quick practice single card
  const handleQuickPracticeCard = useCallback((card: PAOCard) => {
    setDrillCard(card);
    setActiveTrainingMode('person');
    setCurrentTab('train');
  }, []);

  // Practice only mistakes
  const handlePracticeMistakes = useCallback((cardsToDrill: PAOCard[]) => {
    if (cardsToDrill.length > 0) {
      setDrillCard(cardsToDrill[0]);
    }
    setActiveTrainingMode('person');
    setCurrentTab('train');
  }, []);

  // Navigation with options
  const handleNavigateToTab = useCallback((tab: string, options?: { mode?: TrainingModeKey }) => {
    if (options?.mode) {
      setActiveTrainingMode(options.mode);
    }
    setCurrentTab(tab);
  }, []);

  // Compute status badges
  const { dueCount, mistakesCount, streakCount } = useMemo(() => {
    if (!store) return { dueCount: 0, mistakesCount: 0, streakCount: 0 };
    const now = Date.now();
    let due = 0;
    store.cards.forEach((card) => {
      const s = store.srsData[card.id];
      if (!s) return;
      ['person', 'action', 'object'].forEach((compKey) => {
        const comp = s[compKey as 'person' | 'action' | 'object'];
        if (comp.totalReviews === 0 || now >= comp.nextReviewDate) {
          due++;
        }
      });
    });

    return {
      dueCount: due,
      mistakesCount: store.mistakes.length,
      streakCount: store.streak.current,
    };
  }, [store]);

  // Loading Screen
  if (!store) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-200 flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-slate-400">
            INITIALIZING MEMORY FORGE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <PaoNavbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        dueCount={dueCount}
        mistakesCount={mistakesCount}
        streakCount={streakCount}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <MainDashboard
            store={store}
            onNavigateToTab={handleNavigateToTab}
            onSaveAssociations={handleUpdateCardAssociations}
            onQuickPracticeCard={handleQuickPracticeCard}
          />
        )}

        {currentTab === 'train' && (
          <TrainingHub
            store={store}
            initialMode={activeTrainingMode}
            initialCard={drillCard}
            onRecordReview={handleRecordReview}
            onLogMistake={handleLogMistake}
            onLogSpeedScore={handleLogSpeedScore}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'deck_sequence' && (
          <DeckSequenceChallenge
            store={store}
            onLogSequenceSession={handleLogSequenceSession}
            onLogMistake={handleLogMistake}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'triad_challenge' && (
          <TriadImageChallenge
            store={store}
            onLogTriadSession={handleLogTriadSession}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'srs_review' && (
          <SrsReviewStudio
            store={store}
            onRecordReview={handleRecordReview}
            onLogMistake={handleLogMistake}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'mistakes' && (
          <MistakesView
            store={store}
            onPracticeMistakes={handlePracticeMistakes}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView
            store={store}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'database' && (
          <DatabaseManager
            store={store}
            onUpdateCardAssociations={handleUpdateCardAssociations}
            onUpdateSettings={handleUpdateSettings}
            onResetToDefault={handleResetToDefault}
            onReloadStore={refreshStore}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}
      </main>

      {/* Global Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#05070a] py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 font-bold">MEMORY FORGE</span>
            <span>&bull; 54-CARD PAO COGNITIVE SYSTEM</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span>HEARTS ♥ NARUTO</span>
            <span>SPADES ♠ ONE PIECE</span>
            <span>DIAMONDS ♦ POKÉMON</span>
            <span>CLUBS ♣ GUMBALL</span>
            <span>JOKERS ★ SAITAMA & BOO BOO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
