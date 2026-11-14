"use client";

import React, { useState, useMemo } from 'react';
import { AppSettings, CardSRSData, PAOCard, PAOStoreData, Suit } from '@/types/pao';
import { suitStyles } from '../pao/PlayingCard';
import { CardDetailModal } from '../pao/CardDetailModal';
import { exportJSON, importJSON } from '@/lib/paoStorage';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Search,
  Edit2,
  Check,
  AlertTriangle,
  FileJson,
  Settings,
  Sparkles,
} from 'lucide-react';

interface DatabaseManagerProps {
  store: PAOStoreData;
  onUpdateCardAssociations: (cardId: string, person: string, action: string, object: string) => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onResetToDefault: () => void;
  onReloadStore: () => void;
  onBackToDashboard: () => void;
}

export function DatabaseManager({
  store,
  onUpdateCardAssociations,
  onUpdateSettings,
  onResetToDefault,
  onReloadStore,
  onBackToDashboard,
}: DatabaseManagerProps) {
  const { cards, srsData, settings } = store;

  const [activeTab, setActiveTab] = useState<'database' | 'settings'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuit, setSelectedSuit] = useState<Suit | 'all'>('all');
  const [editingCard, setEditingCard] = useState<PAOCard | null>(null);

  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (selectedSuit !== 'all' && card.suit !== selectedSuit) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          card.name.toLowerCase().includes(q) ||
          card.code.toLowerCase().includes(q) ||
          card.person.toLowerCase().includes(q) ||
          card.action.toLowerCase().includes(q) ||
          card.object.toLowerCase().includes(q) ||
          card.universe.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cards, selectedSuit, searchQuery]);

  // Export JSON
  const handleExport = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory_forge_pao_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importJSON(content);
      if (res.success) {
        setImportStatus({ message: 'Backup successfully restored!', isError: false });
        onReloadStore();
      } else {
        setImportStatus({ message: res.error || 'Failed to import JSON.', isError: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#141824] via-[#10141d] to-[#121929] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>PAO REPOSITORY & CONFIGURATION ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            DATABASE & TEST SETTINGS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Inspect and customize associations, export or restore your progress in JSON, and tune
            testing parameters.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
              activeTab === 'database'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PAO Database ({cards.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Test Settings
          </button>
        </div>
      </div>

      {/* Export / Import & Action Ribbon */}
      <div className="p-4 rounded-2xl bg-[#10131c] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-2 cursor-pointer transition">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to reset all 54 associations to the default Naruto / One Piece / Pokémon / Gumball database?'
                )
              ) {
                onResetToDefault();
              }
            }}
            className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-medium flex items-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span>Reset to Defaults</span>
          </button>
        </div>

        {importStatus && (
          <span
            className={`text-xs font-mono px-3 py-1 rounded-lg border ${
              importStatus.isError
                ? 'bg-red-950/80 text-red-300 border-red-700'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
            }`}
          >
            {importStatus.message}
          </span>
        )}
      </div>

      {/* TAB 1: PAO DATABASE TABLE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Search & Suit Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#10131c] border border-slate-800">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search character, action, or object..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'hearts', 'spades', 'diamonds', 'clubs', 'jokers'] as const).map(
                (suit) => (
                  <button
                    key={suit}
                    onClick={() => setSelectedSuit(suit)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border capitalize transition ${
                      selectedSuit === suit
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {suit}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Database Table */}
          <div className="p-6 rounded-3xl bg-[#10131c] border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Card</th>
                  <th className="py-3 px-3">Universe</th>
                  <th className="py-3 px-3 text-amber-400">Person (Who)</th>
                  <th className="py-3 px-3 text-sky-400">Action (Does)</th>
                  <th className="py-3 px-3 text-emerald-400">Object (What)</th>
                  <th className="py-3 px-3">Mastery</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCards.map((card) => {
                  const suitInfo = suitStyles[card.suit];
                  const cardSrs = srsData[card.id];
                  const mastery = cardSrs?.overallMastery || 'new';

                  return (
                    <tr key={card.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-3 font-bold">
                        <span className={`inline-flex items-center gap-1.5 ${suitInfo.textClass}`}>
                          <span>{card.code}</span>
                          <span className="text-slate-400 font-normal">({card.name})</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{card.universe}</td>
                      <td className="py-3 px-3 text-white font-medium">{card.person}</td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{card.action}</td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{card.object}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border capitalize ${
                            mastery === 'mastered'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80'
                              : mastery === 'reviewing'
                              ? 'bg-sky-950/70 text-sky-300 border-sky-700/80'
                              : mastery === 'learning'
                              ? 'bg-amber-950/70 text-amber-300 border-amber-700/80'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {mastery}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setEditingCard(card)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 text-[11px] ml-auto transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEST SETTINGS (Section 8 Explicit Requirement) */}
      {activeTab === 'settings' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#10131c] border border-slate-800 space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Cognitive Test & Memory Training Settings</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure parameters for hints, timing, spelling strictness, and included suits.
            </p>
          </div>

          <div className="space-y-4">
            {/* Include Jokers */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Include Jokers</span>
                <span className="text-xs text-slate-400">
                  Include Red Joker (Saitama) and Black Joker (Boo Boo the Fool) in random tests.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeJokers}
                onChange={(e) => onUpdateSettings({ includeJokers: e.target.checked })}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Enable Hints */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Enable Hints</span>
                <span className="text-xs text-slate-400">
                  Allows viewing universe name and first letter hints during recall challenges.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableHints}
                onChange={(e) => onUpdateSettings({ enableHints: e.target.checked })}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Strict Spelling vs Fuzzy Matching */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Strict Spelling Mode</span>
                <span className="text-xs text-slate-400">
                  When enabled, answers must match exactly without tolerance for minor typos.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.strictSpelling}
                onChange={(e) => onUpdateSettings({ strictSpelling: e.target.checked })}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Sound effects */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Audio Feedback</span>
                <span className="text-xs text-slate-400">
                  Enable subtle chime feedback on correct/incorrect submissions.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Default Test Size */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-sm font-semibold text-white block">
                Default Deck Test Size
              </span>
              <div className="flex gap-3">
                {[10, 26, 54].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => onUpdateSettings({ deckTestSize: sz })}
                    className={`px-4 py-2 rounded-xl text-xs font-mono border transition ${
                      settings.deckTestSize === sz
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {sz} Cards
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Detail / Edit Modal */}
      <CardDetailModal
        card={editingCard}
        cardSrs={editingCard ? srsData[editingCard.id] : undefined}
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSaveAssociations={onUpdateCardAssociations}
      />
    </div>
  );
}
