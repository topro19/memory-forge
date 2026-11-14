"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Reveal answer / Flip playing card' },
    { key: 'Enter', desc: 'Submit answer / Proceed to next card' },
    { key: '1', desc: 'Rate "Again" (Forgot — 1 min interval)' },
    { key: '2', desc: 'Rate "Hard" (Struggled — 10 min interval)' },
    { key: '3', desc: 'Rate "Good" (Remembered — 1 day+ interval)' },
    { key: '4', desc: 'Rate "Easy" (Instant — 3 days+ interval)' },
    { key: 'Tab', desc: 'Switch between Person, Action, Object fields' },
    { key: 'Esc', desc: 'Close modals / Return to dashboard' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#11141d] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white">
              <Keyboard className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold font-mono">KEYBOARD SHORTCUTS</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {shortcuts.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
              >
                <span className="text-slate-300">{s.desc}</span>
                <kbd className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-indigo-300">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-mono text-slate-500 text-center">
            Designed for high-speed, frictionless cognitive drills.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
