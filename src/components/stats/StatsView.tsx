"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { PAOStoreData, Suit } from '@/types/pao';
import {
  BarChart2,
  Calendar,
  Clock,
  TrendingUp,
  Target,
  Award,
  Zap,
  Activity,
} from 'lucide-react';

interface StatsViewProps {
  store: PAOStoreData;
  onBackToDashboard: () => void;
}

export function StatsView({ store, onBackToDashboard }: StatsViewProps) {
  const { cards, srsData, dailyActivity, streak } = store;

  // Calculate comprehensive metrics
  const computed = useMemo(() => {
    let totalReviews = 0;
    let totalCorrect = 0;
    let totalTimeMs = 0;

    let personMastered = 0;
    let actionMastered = 0;
    let objectMastered = 0;

    let suitStats: Record<Suit, { total: number; correct: number; timeMs: number }> = {
      hearts: { total: 0, correct: 0, timeMs: 0 },
      spades: { total: 0, correct: 0, timeMs: 0 },
      diamonds: { total: 0, correct: 0, timeMs: 0 },
      clubs: { total: 0, correct: 0, timeMs: 0 },
      jokers: { total: 0, correct: 0, timeMs: 0 },
    };

    cards.forEach((card) => {
      const srs = srsData[card.id];
      if (!srs) return;

      if (srs.person.level === 'mastered') personMastered++;
      if (srs.action.level === 'mastered') actionMastered++;
      if (srs.object.level === 'mastered') objectMastered++;

      (['person', 'action', 'object'] as const).forEach((comp) => {
        const cState = srs[comp];
        totalReviews += cState.totalReviews;
        totalCorrect += cState.correctReviews;
        totalTimeMs += cState.totalResponseTimeMs;

        suitStats[card.suit].total += cState.totalReviews;
        suitStats[card.suit].correct += cState.correctReviews;
        suitStats[card.suit].timeMs += cState.totalResponseTimeMs;
      });
    });

    // Also factor dailyActivity total time
    Object.values(dailyActivity).forEach((d) => {
      if (d.timeSpentMs > totalTimeMs) {
        totalTimeMs = Math.max(totalTimeMs, d.timeSpentMs);
      }
    });

    const retentionRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
    const avgResponseTimeSec =
      totalReviews > 0 ? (totalTimeMs / totalReviews / 1000).toFixed(1) : '0.0';

    // Format total time spent
    const totalMinutes = Math.floor(totalTimeMs / 60000);
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Suit accuracy bar data
    const suitChartData = [
      {
        suit: 'Hearts (Naruto)',
        accuracy:
          suitStats.hearts.total > 0
            ? Math.round((suitStats.hearts.correct / suitStats.hearts.total) * 100)
            : 0,
        reviews: suitStats.hearts.total,
        fill: '#ef4444',
      },
      {
        suit: 'Spades (One Piece)',
        accuracy:
          suitStats.spades.total > 0
            ? Math.round((suitStats.spades.correct / suitStats.spades.total) * 100)
            : 0,
        reviews: suitStats.spades.total,
        fill: '#818cf8',
      },
      {
        suit: 'Diamonds (Pokémon)',
        accuracy:
          suitStats.diamonds.total > 0
            ? Math.round((suitStats.diamonds.correct / suitStats.diamonds.total) * 100)
            : 0,
        reviews: suitStats.diamonds.total,
        fill: '#38bdf8',
      },
      {
        suit: 'Clubs (Gumball)',
        accuracy:
          suitStats.clubs.total > 0
            ? Math.round((suitStats.clubs.correct / suitStats.clubs.total) * 100)
            : 0,
        reviews: suitStats.clubs.total,
        fill: '#10b981',
      },
      {
        suit: 'Jokers',
        accuracy:
          suitStats.jokers.total > 0
            ? Math.round((suitStats.jokers.correct / suitStats.jokers.total) * 100)
            : 0,
        reviews: suitStats.jokers.total,
        fill: '#f59e0b',
      },
    ];

    // Person vs Action vs Object radar/bar data
    const componentMasteryData = [
      { component: 'Person', mastered: personMastered, total: 54, fullMark: 54 },
      { component: 'Action', mastered: actionMastered, total: 54, fullMark: 54 },
      { component: 'Object', mastered: objectMastered, total: 54, fullMark: 54 },
    ];

    // Daily accuracy chronological line data (past 14 days)
    const dailyKeys = Object.keys(dailyActivity).sort();
    let dailyChartData = dailyKeys.slice(-14).map((date) => {
      const act = dailyActivity[date];
      const acc = act.totalCount > 0 ? Math.round((act.correctCount / act.totalCount) * 100) : 0;
      return {
        date: date.slice(5), // MM-DD
        accuracy: acc,
        cardsStudied: act.cardsStudied,
      };
    });

    // If no past days recorded yet, provide synthetic current session point
    if (dailyChartData.length === 0) {
      dailyChartData = [{ date: 'Today', accuracy: retentionRate, cardsStudied: totalReviews }];
    }

    // Recent latency speed trend (from latest card reviews)
    const latencyHistory: { review: string; speedSec: number }[] = [];
    cards.forEach((c) => {
      const s = srsData[c.id];
      if (!s) return;
      s.person.history.slice(0, 5).forEach((h, idx) => {
        latencyHistory.push({
          review: `R${idx + 1}`,
          speedSec: Number((h.responseTimeMs / 1000).toFixed(2)),
        });
      });
    });
    const speedTrendData = latencyHistory.slice(0, 15);

    // Heatmap: Past 60 days
    const heatmapDays: { date: string; count: number; intensity: number }[] = [];
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const log = dailyActivity[dateKey];
      const count = log ? log.cardsStudied : 0;
      let intensity = 0;
      if (count > 0 && count < 10) intensity = 1;
      else if (count >= 10 && count < 25) intensity = 2;
      else if (count >= 25 && count < 50) intensity = 3;
      else if (count >= 50) intensity = 4;

      heatmapDays.push({ date: dateKey, count, intensity });
    }

    return {
      totalReviews,
      totalCorrect,
      totalHours,
      retentionRate,
      avgResponseTimeSec,
      suitChartData,
      componentMasteryData,
      dailyChartData,
      speedTrendData,
      heatmapDays,
    };
  }, [cards, srsData, dailyActivity]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141824] via-[#10141d] to-[#121929] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>NEURO-COGNITIVE ANALYTICS ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            LONGITUDINAL PROGRESS & RETENTION
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Empirical telemetry on recall accuracy, component mastery parity, latency trends, and
            daily consistency heatmaps.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider font-mono transition"
        >
          Return to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase">Retention Rate</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-black text-emerald-400 font-mono">
            {computed.retentionRate}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            {computed.totalCorrect} / {computed.totalReviews} correct
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase">Practice Time</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-3xl font-black text-white font-mono">
            {computed.totalHours} <span className="text-sm font-normal text-slate-400">hrs</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            Total active session duration
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase">Recall Velocity</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-3xl font-black text-white font-mono">
            {computed.avgResponseTimeSec} <span className="text-sm font-normal text-slate-400">s</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            Average response time
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#11141d] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase">Streak Consistency</span>
            <Award className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-3xl font-black text-rose-400 font-mono">
            {streak.current} <span className="text-sm font-normal text-slate-400">days</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            Personal best: {streak.longest} days
          </span>
        </div>
      </div>

      {/* Calendar Heatmap (Section 9 Requirement) */}
      <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              60-Day Study Activity Heatmap
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800" />
            <span className="w-3 h-3 rounded-sm bg-indigo-950 border border-indigo-900" />
            <span className="w-3 h-3 rounded-sm bg-indigo-800" />
            <span className="w-3 h-3 rounded-sm bg-indigo-600" />
            <span className="w-3 h-3 rounded-sm bg-emerald-400" />
            <span>More</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-start py-2">
          {computed.heatmapDays.map((day) => {
            const colorMap = [
              'bg-slate-900 border border-slate-800/80',
              'bg-indigo-950 border border-indigo-900',
              'bg-indigo-800',
              'bg-indigo-600',
              'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]',
            ];
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} cards reviewed`}
                className={`w-4 h-4 rounded-sm transition-all duration-200 cursor-pointer hover:scale-125 ${
                  colorMap[day.intensity]
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Recall Accuracy Trend */}
        <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Daily Recall Accuracy Trend (%)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={computed.dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f131d',
                    borderColor: '#1f2637',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ fill: '#818cf8', r: 4 }}
                  name="Accuracy (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suit-Wise Accuracy Breakdown */}
        <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-sky-400" />
            <span>Suit-Wise Accuracy Breakdown (%)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computed.suitChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
                <XAxis dataKey="suit" stroke="#64748b" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f131d',
                    borderColor: '#1f2637',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="accuracy" name="Accuracy (%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Person vs Action vs Object Mastery Comparison */}
        <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Person vs Action vs Object Mastery (Out of 54)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computed.componentMasteryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
                <XAxis dataKey="component" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 54]} stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f131d',
                    borderColor: '#1f2637',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="mastered" fill="#38bdf8" name="Mastered Cards" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recall Speed Over Recent Sessions */}
        <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Recent Recall Speed / Latency (Seconds)</span>
          </h3>
          <div className="h-64 w-full">
            {computed.speedTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No latency history recorded yet. Complete reviews to populate.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computed.speedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
                  <XAxis dataKey="review" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="s" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f131d',
                      borderColor: '#1f2637',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speedSec"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    name="Latency (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
