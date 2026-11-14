import { DEFAULT_PAO_CARDS } from '@/data/defaultPaoDatabase';
import {
  AppSettings,
  CardSRSData,
  DailyActivityLog,
  MistakeLog,
  PAOCard,
  PAOComponent,
  PAOStoreData,
  SpeedChallengeScore,
  SRSRating,
  ThreeCardSessionLog,
} from '@/types/pao';
import {
  calculateNextSRS,
  computeOverallCardMastery,
  createDefaultCardSRS,
} from './srsEngine';

const STORAGE_KEY = 'memory_forge_store_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  includeJokers: true,
  enableHints: true,
  enableTimer: false,
  timerSecondsPerCard: 10,
  strictSpelling: false,
  selectedSuits: ['hearts', 'spades', 'diamonds', 'clubs', 'jokers'],
  deckTestSize: 10,
  threeCardAutoRevealSeconds: 5,
  soundEffects: true,
};

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInitialStoreData(): PAOStoreData {
  const initialSrsData: Record<string, CardSRSData> = {};
  for (const card of DEFAULT_PAO_CARDS) {
    initialSrsData[card.id] = createDefaultCardSRS(card.id);
  }

  return {
    version: 1,
    cards: DEFAULT_PAO_CARDS,
    srsData: initialSrsData,
    mistakes: [],
    dailyActivity: {},
    threeCardLogs: [],
    speedScores: [],
    settings: DEFAULT_SETTINGS,
    streak: {
      current: 0,
      lastActiveDate: null,
      longest: 0,
    },
  };
}

export function loadStore(): PAOStoreData {
  if (typeof window === 'undefined') {
    return getInitialStoreData();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialStoreData();
      saveStore(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<PAOStoreData>;
    const defaultData = getInitialStoreData();

    // Ensure all 54 cards exist
    const cards = Array.isArray(parsed.cards) && parsed.cards.length > 0 ? parsed.cards : defaultData.cards;
    const srsData = parsed.srsData || defaultData.srsData;

    // Ensure every card has SRS entries
    for (const card of cards) {
      if (!srsData[card.id]) {
        srsData[card.id] = createDefaultCardSRS(card.id);
      }
    }

    const merged: PAOStoreData = {
      version: parsed.version || 1,
      cards,
      srsData,
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      dailyActivity: parsed.dailyActivity || {},
      threeCardLogs: Array.isArray(parsed.threeCardLogs) ? parsed.threeCardLogs : [],
      speedScores: Array.isArray(parsed.speedScores) ? parsed.speedScores : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      streak: parsed.streak || { current: 0, lastActiveDate: null, longest: 0 },
    };

    return merged;
  } catch (e) {
    console.error('Failed to parse Memory Forge local storage:', e);
    return getInitialStoreData();
  }
}

export function saveStore(data: PAOStoreData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save Memory Forge local storage:', e);
  }
}

export function updateStreak(store: PAOStoreData): void {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (!store.streak.lastActiveDate) {
    store.streak.current = 1;
    store.streak.lastActiveDate = today;
    store.streak.longest = 1;
  } else if (store.streak.lastActiveDate === today) {
    // already active today, streak remains
  } else if (store.streak.lastActiveDate === yesterday) {
    store.streak.current += 1;
    store.streak.lastActiveDate = today;
    if (store.streak.current > store.streak.longest) {
      store.streak.longest = store.streak.current;
    }
  } else {
    // broke streak
    store.streak.current = 1;
    store.streak.lastActiveDate = today;
  }
}

export function recordSRSReview(
  cardId: string,
  component: PAOComponent,
  rating: SRSRating,
  responseTimeMs: number,
  userAnswer?: string,
  isCorrect?: boolean
): PAOStoreData {
  const store = loadStore();
  const cardSrs = store.srsData[cardId] || createDefaultCardSRS(cardId);
  const currentCompState = cardSrs[component];

  const { nextState, record } = calculateNextSRS(
    currentCompState,
    rating,
    responseTimeMs,
    userAnswer,
    isCorrect
  );
  record.component = component;

  cardSrs[component] = nextState;
  cardSrs.overallMastery = computeOverallCardMastery(cardSrs);

  if (rating === 'again' || isCorrect === false) {
    cardSrs.totalMistakes += 1;
  }

  store.srsData[cardId] = cardSrs;

  // Track daily activity
  const today = getTodayKey();
  if (!store.dailyActivity[today]) {
    store.dailyActivity[today] = {
      date: today,
      cardsStudied: 0,
      correctCount: 0,
      totalCount: 0,
      timeSpentMs: 0,
    };
  }

  const dayLog = store.dailyActivity[today];
  dayLog.cardsStudied += 1;
  dayLog.totalCount += 1;
  if (record.isCorrect) {
    dayLog.correctCount += 1;
  }
  dayLog.timeSpentMs += responseTimeMs;

  updateStreak(store);
  saveStore(store);
  return store;
}

export function logMistake(
  cardId: string,
  component: PAOComponent,
  userAnswer: string,
  correctAnswer: string,
  responseTimeMs: number,
  mode: string
): PAOStoreData {
  const store = loadStore();
  const card = store.cards.find((c) => c.id === cardId);
  if (!card) return store;

  const mistake: MistakeLog = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    cardId,
    cardCode: card.code,
    cardName: card.name,
    suit: card.suit,
    component,
    userAnswer,
    correctAnswer,
    responseTimeMs,
    mode,
  };

  store.mistakes = [mistake, ...store.mistakes.slice(0, 199)]; // keep latest 200 mistakes
  saveStore(store);
  return store;
}

export function logThreeCardSession(
  cards: [string, string, string],
  story: { person: string; action: string; object: string },
  rating: 'success' | 'partial' | 'failed',
  timeSpentMs: number
): PAOStoreData {
  const store = loadStore();
  const sessionLog: ThreeCardSessionLog = {
    id: `triad_${Date.now()}`,
    timestamp: Date.now(),
    cards,
    story,
    rating,
    timeSpentMs,
  };

  store.threeCardLogs = [sessionLog, ...store.threeCardLogs.slice(0, 99)];

  const today = getTodayKey();
  if (!store.dailyActivity[today]) {
    store.dailyActivity[today] = {
      date: today,
      cardsStudied: 0,
      correctCount: 0,
      totalCount: 0,
      timeSpentMs: 0,
    };
  }
  store.dailyActivity[today].timeSpentMs += timeSpentMs;
  store.dailyActivity[today].cardsStudied += 3;
  if (rating === 'success') {
    store.dailyActivity[today].correctCount += 3;
  } else if (rating === 'partial') {
    store.dailyActivity[today].correctCount += 1;
  }
  store.dailyActivity[today].totalCount += 3;

  updateStreak(store);
  saveStore(store);
  return store;
}

export function logSpeedScore(
  durationSeconds: number,
  correct: number,
  incorrect: number,
  skipped: number,
  avgResponseTimeMs: number
): PAOStoreData {
  const store = loadStore();
  const score = Math.max(0, correct * 100 - incorrect * 40 - skipped * 10);
  const newRecord: SpeedChallengeScore = {
    id: `speed_${Date.now()}`,
    timestamp: Date.now(),
    durationSeconds,
    correct,
    incorrect,
    skipped,
    avgResponseTimeMs,
    score,
  };

  store.speedScores = [newRecord, ...store.speedScores.slice(0, 49)];
  saveStore(store);
  return store;
}

export function updateCardAssociations(
  cardId: string,
  person: string,
  action: string,
  object: string
): PAOStoreData {
  const store = loadStore();
  const idx = store.cards.findIndex((c) => c.id === cardId);
  if (idx !== -1) {
    store.cards[idx] = {
      ...store.cards[idx],
      person,
      action,
      object,
    };
    saveStore(store);
  }
  return store;
}

export function updateSettings(newSettings: Partial<AppSettings>): PAOStoreData {
  const store = loadStore();
  store.settings = { ...store.settings, ...newSettings };
  saveStore(store);
  return store;
}

export function resetAllDataToDefault(): PAOStoreData {
  const initial = getInitialStoreData();
  saveStore(initial);
  return initial;
}

export function exportJSON(): string {
  const store = loadStore();
  return JSON.stringify(store, null, 2);
}

export function importJSON(jsonStr: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr) as PAOStoreData;
    if (!Array.isArray(parsed.cards) || parsed.cards.length !== 54) {
      return { success: false, error: 'Invalid JSON: Must contain exactly 54 cards.' };
    }
    if (!parsed.srsData) {
      return { success: false, error: 'Invalid JSON: Missing SRS state information.' };
    }
    saveStore(parsed);
    return { success: true };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : 'Unknown error parsing JSON';
    return { success: false, error: err };
  }
}
