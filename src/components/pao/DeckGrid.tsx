"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CardSRSData, MasteryLevel, PAOCard, Suit } from '@/types/pao';
import { PlayingCard, suitStyles } from './PlayingCard';
import { CardDetailModal } from './CardDetailModal';
import { Search, Filter, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

interface DeckGridProps {
  cards: PAOCard[];
  srsData: Record<string, CardSRSData>;
  onSaveAssociations: (cardId: string, person: string, action: string, object: string) => void;
  onQuickPractice?: (card: PAOCard) => void;
}

export function DeckGrid({
  cards,
  srsData,
  onSaveAssociations,
  onQuickPractice,
}: DeckGridProps) {
  const [selectedCard, setSelectedCard] = useState<PAOCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuitFilter, setSelectedSuitFilter] = useState<Suit | 'all'>('all');
  const [selectedMasteryFilter, setSelectedMasteryFilter] = useState<MasteryLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');

  // Filter cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Suit filter
      if (selectedSuitFilter !== 'all' && card.suit !== selectedSuitFilter) {
        return false;
      }

      // Mastery filter
      const cardMastery = srsData[card.id]?.overallMastery || 'new';
      if (selectedMasteryFilter !== 'all' && cardMastery !== selectedMasteryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = card.name.toLowerCase().includes(q);
        const matchesCode = card.code.toLowerCase().includes(q);
        const matchesPerson = card.person.toLowerCase().includes(q);
        const matchesAction = card.action.toLowerCase().includes(q);
        const matchesObject = card.object.toLowerCase().includes(q);
        const matchesUniverse = card.universe.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesCode ||
          matchesPerson ||
          matchesAction ||
          matchesObject ||
          matchesUniverse
        );
      }

      return true;
    });
  }, [cards, srsData, selectedSuitFilter, selectedMasteryFilter, searchQuery]);

  // Group by suit for grouped view
  const suitGroups = useMemo(() => {
    const groups: { suit: Suit; label: string; universe: string; cards: PAOCard[] }[] = [
      { suit: 'hearts', label: 'Hearts ♥', universe: 'Naruto', cards: [] },
      { suit: 'spades', label: 'Spades ♠', universe: 'One Piece', cards: [] },
      { suit: 'diamonds', label: 'Diamonds ♦', universe: 'Pokémon', cards: [] },
      { suit: 'clubs', label: 'Clubs ♣', universe: 'The Amazing World of Gumball', cards: [] },
      { suit: 'jokers', label: 'Jokers', universe: 'Special / Saitama & Boo Boo', cards: [] },
    ];

    for (const card of filteredCards) {
      const g = groups.find((grp) => grp.suit === card.suit);
      if (g) g.cards.push(card);
    }

    return groups.filter((g) => g.cards.length > 0);
  }, [filteredCards]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12151f] border border-slate-800 shadow-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search card, person, action, object or anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Badges: Suits */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedSuitFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition border ${
              selectedSuitFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-600'
                : 'bg-slate-900/40 text-slate-400 border-slate-800/80 hover:text-slate-200'
            }`}
          >
            All Suits ({cards.length})
          </button>

          <button
            onClick={() => setSelectedSuitFilter('hearts')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
              selectedSuitFilter === 'hearts'
                ? 'bg-red-950/80 text-red-300 border-red-600'
                : 'bg-slate-900/40 text-red-400/70 border-slate-800/80 hover:text-red-400'
            }`}
          >
            ♥ Hearts
          </button>

          <button
            onClick={() => setSelectedSuitFilter('spades')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
              selectedSuitFilter === 'spades'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500'
                : 'bg-slate-900/40 text-indigo-400/70 border-slate-800/80 hover:text-indigo-400'
            }`}
          >
            ♠ Spades
          </button>

          <button
            onClick={() => setSelectedSuitFilter('diamonds')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
              selectedSuitFilter === 'diamonds'
                ? 'bg-sky-950/80 text-sky-300 border-sky-500'
                : 'bg-slate-900/40 text-sky-400/70 border-slate-800/80 hover:text-sky-400'
            }`}
          >
            ♦ Diamonds
          </button>

          <button
            onClick={() => setSelectedSuitFilter('clubs')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
              selectedSuitFilter === 'clubs'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                : 'bg-slate-900/40 text-emerald-400/70 border-slate-800/80 hover:text-emerald-400'
            }`}
          >
            ♣ Clubs
          </button>

          <button
            onClick={() => setSelectedSuitFilter('jokers')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
              selectedSuitFilter === 'jokers'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500'
                : 'bg-slate-900/40 text-amber-400/70 border-slate-800/80 hover:text-amber-400'
            }`}
          >
            ★ Jokers
          </button>
        </div>

        {/* Mastery Filter & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMasteryFilter}
            onChange={(e) => setSelectedMasteryFilter(e.target.value as MasteryLevel | 'all')}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Mastery Levels</option>
            <option value="mastered">Mastered</option>
            <option value="reviewing">Reviewing</option>
            <option value="learning">Learning</option>
            <option value="new">New (Unstudied)</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'grouped' ? 'grid' : 'grouped')}
            className="p-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
            title={viewMode === 'grouped' ? 'Switch to Compact Grid' : 'Switch to Grouped Suits'}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#10141d] border border-slate-800">
          <p className="text-slate-400">No cards matched your filter or search criteria.</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {suitGroups.map((group) => {
            const suitInfo = suitStyles[group.suit];
            return (
              <div
                key={group.suit}
                className="p-5 rounded-2xl bg-[#10131b] border border-slate-800/80 shadow-lg space-y-4"
              >
                {/* Suit Group Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-2xl font-serif ${suitInfo.textClass}`}>
                      {suitInfo.symbol}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-wide">{group.label}</h3>
                    <span
                      className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${suitInfo.badgeColor}`}
                    >
                      {group.universe}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {group.cards.length} cards
                  </span>
                </div>

                {/* Cards row / grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3 sm:gap-4">
                  {group.cards.map((card) => {
                    const cardSrs = srsData[card.id];
                    const mastery = cardSrs?.overallMastery || 'new';
                    return (
                      <motion.div
                        key={card.id}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col items-center"
                      >
                        <PlayingCard
                          card={card}
                          size="sm"
                          showMasteryBadge={true}
                          mastery={mastery}
                          onClick={() => setSelectedCard(card)}
                          customClass="w-full !h-40"
                        />
                        {/* Compact Caption */}
                        <div className="mt-1 text-center w-full px-1">
                          <p className="text-[11px] font-medium text-slate-300 truncate">
                            {card.person}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {card.action} &bull; {card.object}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Uniform Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
          {filteredCards.map((card) => {
            const cardSrs = srsData[card.id];
            const mastery = cardSrs?.overallMastery || 'new';
            return (
              <motion.div
                key={card.id}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center"
              >
                <PlayingCard
                  card={card}
                  size="sm"
                  showMasteryBadge={true}
                  mastery={mastery}
                  onClick={() => setSelectedCard(card)}
                  customClass="w-full !h-40"
                />
                <div className="mt-1 text-center w-full px-1">
                  <p className="text-[11px] font-medium text-slate-300 truncate">{card.person}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {card.action} &bull; {card.object}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        cardSrs={selectedCard ? srsData[selectedCard.id] : undefined}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onSaveAssociations={onSaveAssociations}
        onQuickPractice={onQuickPractice}
      />
    </div>
  );
}
