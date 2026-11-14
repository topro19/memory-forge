"use client";

import React, { useMemo } from 'react';
import { PAOCard, PAOStoreData, MistakeLog } from '@/types/pao';
import { suitStyles } from '../pao/PlayingCard';
import {
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
  Trash2,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Play,
} from 'lucide-react';

interface MistakesViewProps {
  store: PAOStoreData;
  onPracticeMistakes: (cardsToDrill: PAOCard[]) => void;
  onBackToDashboard: () => void;
}

export function MistakesView({
  store,
  onPracticeMistakes,
  onBackToDashboard,
}: MistakesViewProps) {
  const { cards, mistakes, srsData } = store;

  // Analysis of mistakes
  const analysis = useMemo(() => {
    // 1. Most frequently forgotten cards
    const cardCounts: Record<string, number> = {};
    const characterConfusions: Record<string, { target: string; count: number }> = {};
    const actionConfusions: Record<string, { target: string; count: number }> = {};
    const objectConfusions: Record<string, { target: string; count: number }> = {};
    let totalFailedResponseTimeMs = 0;

    mistakes.forEach((m) => {
      cardCounts[m.cardId] = (cardCounts[m.cardId] || 0) + 1;
      totalFailedResponseTimeMs += m.responseTimeMs;

      // Confusions tracking
      const userNorm = m.userAnswer.trim();
      if (userNorm && userNorm !== '[Blank]' && userNorm !== '[Felt completely forgotten]') {
        const key = `${userNorm} -> ${m.correctAnswer}`;
        if (m.component === 'person') {
          if (!characterConfusions[key]) {
            characterConfusions[key] = { target: m.correctAnswer, count: 0 };
          }
          characterConfusions[key].count += 1;
        } else if (m.component === 'action') {
          if (!actionConfusions[key]) {
            actionConfusions[key] = { target: m.correctAnswer, count: 0 };
          }
          actionConfusions[key].count += 1;
        } else if (m.component === 'object') {
          if (!objectConfusions[key]) {
            objectConfusions[key] = { target: m.correctAnswer, count: 0 };
          }
          objectConfusions[key].count += 1;
        }
      }
    });

    // Sort cards by mistake count
    const mostForgottenCards = Object.entries(cardCounts)
      .map(([cardId, count]) => {
        const card = cards.find((c) => c.id === cardId);
        const srs = srsData[cardId];
        const totalReviews = srs
          ? srs.person.totalReviews + srs.action.totalReviews + srs.object.totalReviews
          : 0;
        const failureRate = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 100;
        return {
          card,
          count,
          failureRate,
        };
      })
      .filter((item): item is { card: PAOCard; count: number; failureRate: number } => item.card !== undefined)
      .sort((a, b) => b.count - a.count);

    // Sort confusions
    const topCharConfusions = Object.entries(characterConfusions)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const topActionConfusions = Object.entries(actionConfusions)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const topObjectConfusions = Object.entries(objectConfusions)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const avgRecallTimeSec =
      mistakes.length > 0
        ? (totalFailedResponseTimeMs / mistakes.length / 1000).toFixed(1)
        : '0.0';

    return {
      mostForgottenCards,
      topCharConfusions,
      topActionConfusions,
      topObjectConfusions,
      avgRecallTimeSec,
      totalMistakes: mistakes.length,
    };
  }, [cards, mistakes, srsData]);

  // Drill only mistakes handler
  const handleDrillMistakes = () => {
    if (analysis.mostForgottenCards.length === 0) return;
    const cardsToDrill = analysis.mostForgottenCards.map((item) => item.card);
    onPracticeMistakes(cardsToDrill);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#10141d] to-[#141824] border border-red-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-700/60 text-xs font-mono text-red-300">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ERROR INTELLIGENCE & CONFUSION AUDIT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            MISTAKE & WEAK SPOT ANALYSIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Examine neural interference patterns, confused character identities, and latency
            bottlenecks. Target your revision exclusively on high-friction associations.
          </p>
        </div>

        {/* Drill Mistake Button */}
        {analysis.mostForgottenCards.length > 0 && (
          <button
            onClick={handleDrillMistakes}
            className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Practice Only Mistakes ({analysis.mostForgottenCards.length} Cards)</span>
          </button>
        )}
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Logged Errors</span>
            <span className="text-2xl font-black text-white font-mono">
              {analysis.totalMistakes} mistakes
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Unique Cards With Errors</span>
            <span className="text-2xl font-black text-white font-mono">
              {analysis.mostForgottenCards.length} / {cards.length}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono block">Average Error Latency</span>
            <span className="text-2xl font-black text-white font-mono">
              {analysis.avgRecallTimeSec}s
            </span>
          </div>
        </div>
      </div>

      {/* Most Frequently Forgotten Cards Grid */}
      <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Most Frequently Forgotten Cards</span>
        </h3>

        {analysis.mostForgottenCards.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No mistakes recorded yet. Train with any mode to detect weak cards!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {analysis.mostForgottenCards.map(({ card, count, failureRate }) => {
              const suitInfo = suitStyles[card.suit];
              return (
                <div
                  key={card.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-800/80 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-lg border border-slate-800 flex items-center justify-center font-mono font-bold text-sm ${suitInfo.textClass} bg-slate-950`}
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
                    <span className="text-sm font-bold text-red-400 font-mono">
                      {count} err
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {failureRate}% fail
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confusion Breakdown (Characters, Actions, Objects) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Confused Characters */}
        <div className="p-5 rounded-2xl bg-[#10131c] border border-slate-800 space-y-3">
          <span className="text-xs font-mono uppercase text-amber-400 font-bold block">
            Most Confused Characters (Person)
          </span>
          {analysis.topCharConfusions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No character confusion patterns yet.</p>
          ) : (
            <div className="space-y-2">
              {analysis.topCharConfusions.map(([key, data]) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs flex justify-between items-center"
                >
                  <span className="text-slate-300 font-mono truncate max-w-[180px]">{key}</span>
                  <span className="text-amber-400 font-mono text-[11px] font-bold">
                    {data.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confused Actions */}
        <div className="p-5 rounded-2xl bg-[#10131c] border border-slate-800 space-y-3">
          <span className="text-xs font-mono uppercase text-sky-400 font-bold block">
            Most Confused Actions
          </span>
          {analysis.topActionConfusions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No action confusion patterns yet.</p>
          ) : (
            <div className="space-y-2">
              {analysis.topActionConfusions.map(([key, data]) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs flex justify-between items-center"
                >
                  <span className="text-slate-300 font-mono truncate max-w-[180px]">{key}</span>
                  <span className="text-sky-400 font-mono text-[11px] font-bold">
                    {data.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confused Objects */}
        <div className="p-5 rounded-2xl bg-[#10131c] border border-slate-800 space-y-3">
          <span className="text-xs font-mono uppercase text-emerald-400 font-bold block">
            Most Confused Objects
          </span>
          {analysis.topObjectConfusions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No object confusion patterns yet.</p>
          ) : (
            <div className="space-y-2">
              {analysis.topObjectConfusions.map(([key, data]) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs flex justify-between items-center"
                >
                  <span className="text-slate-300 font-mono truncate max-w-[180px]">{key}</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">
                    {data.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chronological Wrong-Answer History Table */}
      <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Wrong-Answer Chronological History
        </h3>

        {mistakes.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No wrong-answer records yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800 bg-slate-950/60 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Card</th>
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Your Answer</th>
                  <th className="py-2.5 px-3">Expected</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mistakes.map((m) => {
                  const suitInfo = suitStyles[m.suit];
                  return (
                    <tr key={m.id} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 font-bold text-slate-200">
                        <span className={suitInfo?.textClass}>{m.cardCode}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 capitalize">{m.component}</td>
                      <td className="py-2 px-3 text-red-400 truncate max-w-[180px]">
                        {m.userAnswer || '[Empty]'}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 truncate max-w-[180px]">
                        {m.correctAnswer}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {(m.responseTimeMs / 1000).toFixed(1)}s
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">{m.mode}</td>
                      <td className="py-2 px-3 text-slate-600 text-[10px]">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
