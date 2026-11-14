"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PAOCard, MasteryLevel, Suit } from '@/types/pao';
import { Sparkles, CheckCircle2, AlertCircle, Clock, Award } from 'lucide-react';

interface PlayingCardProps {
  card: PAOCard;
  isFlipped?: boolean;
  onFlip?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showMasteryBadge?: boolean;
  mastery?: MasteryLevel;
  highlightComponent?: 'person' | 'action' | 'object' | 'all' | 'none';
  customClass?: string;
  revealed?: boolean;
}

export const suitStyles: Record<
  Suit,
  {
    symbol: string;
    textClass: string;
    bgGlow: string;
    borderClass: string;
    accentBg: string;
    badgeColor: string;
  }
> = {
  hearts: {
    symbol: '♥',
    textClass: 'text-red-500',
    bgGlow: 'shadow-[0_0_20px_rgba(239,68,68,0.18)]',
    borderClass: 'border-red-900/40 hover:border-red-600/70',
    accentBg: 'bg-red-950/30',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  spades: {
    symbol: '♠',
    textClass: 'text-indigo-400',
    bgGlow: 'shadow-[0_0_20px_rgba(129,140,248,0.18)]',
    borderClass: 'border-indigo-900/40 hover:border-indigo-500/70',
    accentBg: 'bg-indigo-950/30',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  diamonds: {
    symbol: '♦',
    textClass: 'text-sky-400',
    bgGlow: 'shadow-[0_0_20px_rgba(56,189,248,0.18)]',
    borderClass: 'border-sky-900/40 hover:border-sky-500/70',
    accentBg: 'bg-sky-950/30',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  clubs: {
    symbol: '♣',
    textClass: 'text-emerald-400',
    bgGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.18)]',
    borderClass: 'border-emerald-900/40 hover:border-emerald-500/70',
    accentBg: 'bg-emerald-950/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  jokers: {
    symbol: '★',
    textClass: 'text-amber-400',
    bgGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    borderClass: 'border-amber-900/50 hover:border-amber-500/80',
    accentBg: 'bg-amber-950/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export const masteryConfig: Record<
  MasteryLevel,
  { label: string; color: string; icon: React.ReactNode }
> = {
  new: {
    label: 'New',
    color: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: <Sparkles className="w-2.5 h-2.5" />,
  },
  learning: {
    label: 'Learning',
    color: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    icon: <AlertCircle className="w-2.5 h-2.5" />,
  },
  reviewing: {
    label: 'Reviewing',
    color: 'bg-sky-950/60 text-sky-400 border-sky-800/60',
    icon: <Clock className="w-2.5 h-2.5" />,
  },
  mastered: {
    label: 'Mastered',
    color: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    icon: <Award className="w-2.5 h-2.5" />,
  },
};

export function PlayingCard({
  card,
  isFlipped = false,
  onFlip,
  onClick,
  size = 'md',
  showMasteryBadge = false,
  mastery = 'new',
  highlightComponent = 'none',
  customClass = '',
  revealed = false,
}: PlayingCardProps) {
  const suitInfo = suitStyles[card.suit] || suitStyles.hearts;
  const masteryInfo = masteryConfig[mastery] || masteryConfig.new;

  const sizeDimensions = {
    sm: 'w-24 h-36 text-xs',
    md: 'w-36 h-52 text-sm',
    lg: 'w-48 h-68 text-base',
    hero: 'w-64 h-92 text-lg sm:w-72 sm:h-[410px]',
  }[size];

  const rankText = card.value === 'RJ' ? 'RJ' : card.value === 'BJ' ? 'BJ' : card.value;

  return (
    <div
      onClick={onClick || onFlip}
      className={`relative perspective-1000 select-none cursor-pointer group ${sizeDimensions} ${customClass}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="w-full h-full relative preserve-3d"
      >
        {/* CARD FRONT FACE */}
        <div
          className={`absolute inset-0 backface-hidden rounded-xl border bg-gradient-to-b from-[#161a24] via-[#10131b] to-[#0b0d13] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-300 ${
            suitInfo.borderClass
          } ${suitInfo.bgGlow}`}
        >
          {/* Top Corner: Rank & Suit */}
          <div className="flex items-start justify-between">
            <div className={`flex flex-col items-center leading-none ${suitInfo.textClass}`}>
              <span className="font-mono font-black text-base sm:text-lg tracking-tight">
                {rankText}
              </span>
              <span className="text-sm sm:text-base">{suitInfo.symbol}</span>
            </div>

            {/* Mastery Tag or Universe Badge */}
            {showMasteryBadge ? (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${masteryInfo.color}`}
              >
                {masteryInfo.icon}
                <span>{masteryInfo.label}</span>
              </span>
            ) : (
              <span
                className={`text-[9px] sm:text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded border ${suitInfo.badgeColor}`}
              >
                {card.universe}
              </span>
            )}
          </div>

          {/* Centerpiece / Graphic Motif */}
          <div className="flex-1 flex flex-col items-center justify-center my-1 relative overflow-hidden">
            {/* Giant watermark suit symbol */}
            <div
              className={`absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl font-serif opacity-[0.07] pointer-events-none select-none ${suitInfo.textClass}`}
            >
              {suitInfo.symbol}
            </div>

            {/* Main Content Presentation */}
            {revealed ? (
              <div className="w-full space-y-1.5 z-10 text-center px-1">
                <div
                  className={`p-1 rounded text-xs transition-colors ${
                    highlightComponent === 'person' || highlightComponent === 'all'
                      ? 'bg-amber-500/20 text-amber-200 font-semibold border border-amber-500/40'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Person</span>
                  <p className="truncate font-medium">{card.person}</p>
                </div>

                <div
                  className={`p-1 rounded text-xs transition-colors ${
                    highlightComponent === 'action' || highlightComponent === 'all'
                      ? 'bg-sky-500/20 text-sky-200 font-semibold border border-sky-500/40'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Action</span>
                  <p className="truncate font-medium">{card.action}</p>
                </div>

                <div
                  className={`p-1 rounded text-xs transition-colors ${
                    highlightComponent === 'object' || highlightComponent === 'all'
                      ? 'bg-emerald-500/20 text-emerald-200 font-semibold border border-emerald-500/40'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Object</span>
                  <p className="truncate font-medium">{card.object}</p>
                </div>
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center text-center">
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-slate-800 ${suitInfo.accentBg} flex items-center justify-center mb-1.5 shadow-inner`}
                >
                  <span className={`text-2xl sm:text-4xl ${suitInfo.textClass}`}>
                    {suitInfo.symbol}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide">
                  {card.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {card.universe}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Corner: Inverted Rank & Suit */}
          <div className="flex items-end justify-between rotate-180">
            <div className={`flex flex-col items-center leading-none ${suitInfo.textClass}`}>
              <span className="font-mono font-black text-base sm:text-lg tracking-tight">
                {rankText}
              </span>
              <span className="text-sm sm:text-base">{suitInfo.symbol}</span>
            </div>
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
              PAO 54
            </span>
          </div>
        </div>

        {/* CARD BACK FACE (For flipped state) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-[#1b202e] via-[#0f121a] to-[#07090e] p-3 flex flex-col items-center justify-center rotate-y-180 shadow-2xl overflow-hidden`}
        >
          {/* Card Back Geometric Pattern */}
          <div className="w-full h-full border border-slate-700/50 rounded-lg p-2 flex flex-col items-center justify-between bg-lab-grid">
            <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">
              MEMORY FORGE
            </div>
            <div className="w-12 h-12 rounded-full border border-slate-600/50 flex items-center justify-center bg-slate-900/80 shadow-md">
              <span className="text-xl text-slate-400 font-bold">MF</span>
            </div>
            <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">
              COGNITIVE LAB
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
