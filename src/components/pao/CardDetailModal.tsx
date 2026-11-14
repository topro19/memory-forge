"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAOCard, CardSRSData, MasteryLevel } from '@/types/pao';
import { PlayingCard, masteryConfig, suitStyles } from './PlayingCard';
import {
  X,
  Edit2,
  Save,
  Clock,
  Award,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CardDetailModalProps {
  card: PAOCard | null;
  cardSrs?: CardSRSData;
  isOpen: boolean;
  onClose: () => void;
  onSaveAssociations?: (cardId: string, person: string, action: string, object: string) => void;
  onQuickPractice?: (card: PAOCard) => void;
}

export function CardDetailModal({
  card,
  cardSrs,
  isOpen,
  onClose,
  onSaveAssociations,
  onQuickPractice,
}: CardDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [person, setPerson] = useState('');
  const [action, setAction] = useState('');
  const [object, setObject] = useState('');

  // Sync state when card opens
  React.useEffect(() => {
    if (card) {
      setPerson(card.person);
      setAction(card.action);
      setObject(card.object);
      setIsEditing(false);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const suitInfo = suitStyles[card.suit] || suitStyles.hearts;
  const overallMastery: MasteryLevel = cardSrs?.overallMastery || 'new';
  const masteryInfo = masteryConfig[overallMastery];

  const handleSave = () => {
    if (!person.trim() || !action.trim() || !object.trim()) return;
    if (onSaveAssociations) {
      onSaveAssociations(card.id, person.trim(), action.trim(), object.trim());
    }
    setIsEditing(false);
  };

  const formatInterval = (mins: number) => {
    if (mins <= 0) return 'Immediate';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${(mins / 1440).toFixed(1)}d`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-[#10141d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900/60 border border-slate-700/50 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Card Preview Column */}
          <div className="p-6 bg-gradient-to-b from-[#141824] to-[#0d1017] border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col items-center justify-center gap-4">
            <PlayingCard
              card={card}
              size="md"
              revealed={true}
              highlightComponent="all"
              mastery={overallMastery}
              showMasteryBadge={true}
            />

            <div className="text-center">
              <span className="text-xs font-mono text-slate-400">Card ID: {card.id}</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded border ${masteryInfo.color}`}>
                  {masteryInfo.label}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Mistakes: {cardSrs?.totalMistakes || 0}
                </span>
              </div>
            </div>

            {onQuickPractice && (
              <button
                onClick={() => {
                  onClose();
                  onQuickPractice(card);
                }}
                className="w-full mt-2 py-2 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Practice This Card
              </button>
            )}
          </div>

          {/* Right: PAO Associations & SRS Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{card.name}</span>
                  <span className={`${suitInfo.textClass} text-2xl`}>{suitInfo.symbol}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">Universe: {card.universe}</p>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Association
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 rounded-lg border border-emerald-700/80 flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              )}
            </div>

            {/* PAO Components Form / Display */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                PAO Components
              </h4>

              {/* Person */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                    Person
                  </span>
                  {cardSrs?.person && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Level: {cardSrs.person.level} &bull; Next: {formatInterval(cardSrs.person.intervalMinutes)}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                ) : (
                  <div className="text-base font-semibold text-slate-200">{card.person}</div>
                )}
              </div>

              {/* Action */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-sky-400 uppercase tracking-wider">
                    Action
                  </span>
                  {cardSrs?.action && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Level: {cardSrs.action.level} &bull; Next: {formatInterval(cardSrs.action.intervalMinutes)}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-400"
                  />
                ) : (
                  <div className="text-base font-semibold text-slate-200">{card.action}</div>
                )}
              </div>

              {/* Object */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                    Object
                  </span>
                  {cardSrs?.object && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Level: {cardSrs.object.level} &bull; Next: {formatInterval(cardSrs.object.intervalMinutes)}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={object}
                    onChange={(e) => setObject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <div className="text-base font-semibold text-slate-200">{card.object}</div>
                )}
              </div>
            </div>

            {/* Component Independent SRS Status Breakdown */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Independent SRS Metrics
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono">Person Reps</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {cardSrs?.person.repetitions || 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {cardSrs?.person.totalReviews
                      ? `${Math.round(
                          ((cardSrs.person.correctReviews || 0) / cardSrs.person.totalReviews) * 100
                        )}% acc`
                      : 'Unreviewed'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono">Action Reps</span>
                  <span className="text-sm font-bold text-sky-400 font-mono">
                    {cardSrs?.action.repetitions || 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {cardSrs?.action.totalReviews
                      ? `${Math.round(
                          ((cardSrs.action.correctReviews || 0) / cardSrs.action.totalReviews) * 100
                        )}% acc`
                      : 'Unreviewed'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-mono">Object Reps</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {cardSrs?.object.repetitions || 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {cardSrs?.object.totalReviews
                      ? `${Math.round(
                          ((cardSrs.object.correctReviews || 0) / cardSrs.object.totalReviews) * 100
                        )}% acc`
                      : 'Unreviewed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
