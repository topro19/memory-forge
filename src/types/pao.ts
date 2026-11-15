export type Suit = 'hearts' | 'spades' | 'diamonds' | 'clubs' | 'jokers';

export type CardValue =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'RJ'
  | 'BJ';

export type PAOComponent = 'person' | 'action' | 'object';

export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'mastered';

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface PAOCard {
  id: string; // e.g. "H-A", "S-10", "RJ"
  suit: Suit;
  value: CardValue;
  name: string; // "Ace of Hearts" or "Red Joker"
  code: string; // "A♥", "10♠", "RJ"
  person: string;
  action: string;
  object: string;
  universe: string; // "Naruto", "One Piece", "Pokémon", "The Amazing World of Gumball", "One Punch Man", "Gumball / Cartoon"
  suitSymbol: string; // "♥", "♠", "♦", "♣", "★"
}

export interface SRSReviewRecord {
  id: string;
  timestamp: number;
  component: PAOComponent;
  rating: SRSRating;
  intervalMinutes: number;
  responseTimeMs: number;
  userAnswer?: string;
  isCorrect: boolean;
}

export interface ComponentSRSState {
  level: MasteryLevel;
  intervalMinutes: number; // in minutes
  easeFactor: number; // default 2.5
  repetitions: number; // consecutive successful reviews
  lastReviewed: number | null; // epoch timestamp
  nextReviewDate: number; // epoch timestamp
  history: SRSReviewRecord[];
  totalReviews: number;
  correctReviews: number;
  totalResponseTimeMs: number;
}

export interface CardSRSData {
  cardId: string;
  person: ComponentSRSState;
  action: ComponentSRSState;
  object: ComponentSRSState;
  overallMastery: MasteryLevel;
  totalMistakes: number;
}

export interface MistakeLog {
  id: string;
  timestamp: number;
  cardId: string;
  cardCode: string;
  cardName: string;
  suit: Suit;
  component: PAOComponent;
  userAnswer: string;
  correctAnswer: string;
  responseTimeMs: number;
  mode: string;
}

export interface DailyActivityLog {
  date: string; // YYYY-MM-DD
  cardsStudied: number;
  correctCount: number;
  totalCount: number;
  timeSpentMs: number;
}

export interface ThreeCardSessionLog {
  id: string;
  timestamp: number;
  cards: [string, string, string]; // [cardId1, cardId2, cardId3]
  story: {
    person: string;
    action: string;
    object: string;
  };
  rating: 'success' | 'partial' | 'failed';
  timeSpentMs: number;
}

export interface SpeedChallengeScore {
  id: string;
  timestamp: number;
  durationSeconds: number; // 30, 60, 120, 300
  correct: number;
  incorrect: number;
  skipped: number;
  avgResponseTimeMs: number;
  score: number;
}

export interface DeckSequenceLog {
  id: string;
  timestamp: number;
  deckSize: number;
  correctCount: number;
  accuracy: number;
  memorizeTimeMs: number;
  recallTimeMs: number;
  firstErrorIndex: number | null;
  longestStreak: number;
  triadMode: boolean;
}

export interface AppSettings {
  includeJokers: boolean;
  enableHints: boolean;
  enableTimer: boolean;
  timerSecondsPerCard: number;
  strictSpelling: boolean; // if false, allows small typos / case / aliases
  selectedSuits: Suit[];
  deckTestSize: number; // 10, 26, 54, custom
  threeCardAutoRevealSeconds: number;
  soundEffects: boolean;
}

export interface PAOStoreData {
  version: number;
  cards: PAOCard[];
  srsData: Record<string, CardSRSData>;
  mistakes: MistakeLog[];
  dailyActivity: Record<string, DailyActivityLog>;
  threeCardLogs: ThreeCardSessionLog[];
  speedScores: SpeedChallengeScore[];
  deckSequenceLogs?: DeckSequenceLog[];
  settings: AppSettings;
  streak: {
    current: number;
    lastActiveDate: string | null;
    longest: number;
  };
}
