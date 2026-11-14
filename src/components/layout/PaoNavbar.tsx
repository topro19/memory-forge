"use client";

import React from 'react';
import {
  Flame,
  Zap,
  Brain,
  Layers,
  AlertTriangle,
  BarChart2,
  Database,
  Keyboard,
  LayoutDashboard,
} from 'lucide-react';

export interface PaoNavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  dueCount: number;
  mistakesCount: number;
  streakCount: number;
  onOpenShortcuts: () => void;
}

export function PaoNavbar({
  currentTab,
  onSelectTab,
  dueCount,
  mistakesCount,
  streakCount,
  onOpenShortcuts,
}: PaoNavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'train', label: 'Train Hub', icon: Layers },
    { id: 'triad_challenge', label: '3-Card Triad', icon: Brain },
    { id: 'srs_review', label: 'SRS Review', icon: Zap, badge: dueCount > 0 ? dueCount : undefined },
    { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle, badge: mistakesCount > 0 ? mistakesCount : undefined },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
    { id: 'database', label: 'Database', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0a0c12]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition">
            <span className="font-mono font-black text-white text-base tracking-tighter">MF</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-widest text-white uppercase group-hover:text-indigo-400 transition">
              MEMORY <span className="text-indigo-400 font-extrabold">FORGE</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
              PAO 54 Cognitive Engine
            </span>
          </div>
        </div>

        {/* Main Desktop Navigation Items */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative px-3 py-2 rounded-xl text-xs font-medium font-mono flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      item.id === 'srs_review'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5">
          {/* Study Streak Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-400">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-bold">{streakCount}</span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">DAY STREAK</span>
          </div>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Scrollable Horizontal Subnav */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-800/60 bg-[#0a0c12] no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 bg-slate-900 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

export default PaoNavbar;
