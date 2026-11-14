import {
  CardSRSData,
  ComponentSRSState,
  MasteryLevel,
  PAOCard,
  PAOComponent,
  SRSRating,
  SRSReviewRecord,
} from '@/types/pao';

export function createDefaultComponentSRS(): ComponentSRSState {
  return {
    level: 'new',
    intervalMinutes: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewed: null,
    nextReviewDate: 0,
    history: [],
    totalReviews: 0,
    correctReviews: 0,
    totalResponseTimeMs: 0,
  };
}

export function createDefaultCardSRS(cardId: string): CardSRSData {
  return {
    cardId,
    person: createDefaultComponentSRS(),
    action: createDefaultComponentSRS(),
    object: createDefaultComponentSRS(),
    overallMastery: 'new',
    totalMistakes: 0,
  };
}

export function calculateComponentMastery(state: ComponentSRSState): MasteryLevel {
  if (state.totalReviews === 0) return 'new';
  const accuracy = state.totalReviews > 0 ? state.correctReviews / state.totalReviews : 0;
  // Mastered requires >= 7 days interval (10080 mins), >= 3 successful repetitions, and >= 80% accuracy
  if (state.intervalMinutes >= 10080 && state.repetitions >= 3 && accuracy >= 0.8) {
    return 'mastered';
  }
  // Reviewing if interval >= 1 day (1440 mins)
  if (state.intervalMinutes >= 1440) {
    return 'reviewing';
  }
  return 'learning';
}

export function computeOverallCardMastery(cardSrs: CardSRSData): MasteryLevel {
  const p = cardSrs.person.level;
  const a = cardSrs.action.level;
  const o = cardSrs.object.level;

  // STRICT REQUIREMENT: Only mastered if ALL three are mastered!
  if (p === 'mastered' && a === 'mastered' && o === 'mastered') {
    return 'mastered';
  }

  // If all are new, it is new
  if (p === 'new' && a === 'new' && o === 'new') {
    return 'new';
  }

  // If any is learning or failed, it's learning
  if (p === 'learning' || a === 'learning' || o === 'learning') {
    return 'learning';
  }

  // Otherwise reviewing
  return 'reviewing';
}

export function calculateNextSRS(
  currentState: ComponentSRSState,
  rating: SRSRating,
  responseTimeMs: number,
  userAnswer?: string,
  isCorrectOverride?: boolean
): { nextState: ComponentSRSState; record: SRSReviewRecord } {
  const now = Date.now();
  let nextIntervalMinutes = 1;
  let nextRepetitions = currentState.repetitions;
  let nextEaseFactor = currentState.easeFactor;
  const isCorrect = isCorrectOverride !== undefined ? isCorrectOverride : rating !== 'again';

  switch (rating) {
    case 'again':
      // Again: 1 minute interval, reset repetitions, reduce ease factor
      nextIntervalMinutes = 1;
      nextRepetitions = 0;
      nextEaseFactor = Math.max(1.3, currentState.easeFactor - 0.2);
      break;

    case 'hard':
      // Hard: 10 minutes interval, small penalty to ease factor
      nextIntervalMinutes = Math.max(10, Math.round(currentState.intervalMinutes * 1.2));
      nextRepetitions = Math.max(1, currentState.repetitions);
      nextEaseFactor = Math.max(1.3, currentState.easeFactor - 0.15);
      break;

    case 'good':
      // Good: 1 day first time, 3 days second time, then interval * ease factor
      nextRepetitions = currentState.repetitions + 1;
      if (nextRepetitions === 1) {
        nextIntervalMinutes = 1440; // 1 day
      } else if (nextRepetitions === 2) {
        nextIntervalMinutes = 4320; // 3 days
      } else {
        nextIntervalMinutes = Math.max(
          1440,
          Math.round(currentState.intervalMinutes * currentState.easeFactor)
        );
      }
      nextEaseFactor = Math.min(3.2, currentState.easeFactor + 0.05);
      break;

    case 'easy':
      // Easy: 3 days first time, 7 days second time, then accelerated
      nextRepetitions = currentState.repetitions + 1;
      if (nextRepetitions === 1) {
        nextIntervalMinutes = 4320; // 3 days
      } else if (nextRepetitions === 2) {
        nextIntervalMinutes = 10080; // 7 days
      } else {
        nextIntervalMinutes = Math.max(
          4320,
          Math.round(currentState.intervalMinutes * currentState.easeFactor * 1.35)
        );
      }
      nextEaseFactor = Math.min(3.5, currentState.easeFactor + 0.15);
      break;
  }

  const nextReviewDate = now + nextIntervalMinutes * 60 * 1000;
  const nextTotalReviews = currentState.totalReviews + 1;
  const nextCorrectReviews = currentState.correctReviews + (isCorrect ? 1 : 0);
  const nextTotalResponseTime = currentState.totalResponseTimeMs + responseTimeMs;

  const record: SRSReviewRecord = {
    id: `rev_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    component: 'person', // will be specified by caller
    rating,
    intervalMinutes: nextIntervalMinutes,
    responseTimeMs,
    userAnswer,
    isCorrect,
  };

  const candidateState: ComponentSRSState = {
    level: 'new',
    intervalMinutes: nextIntervalMinutes,
    easeFactor: Number(nextEaseFactor.toFixed(2)),
    repetitions: nextRepetitions,
    lastReviewed: now,
    nextReviewDate,
    history: [record, ...currentState.history.slice(0, 49)], // keep last 50
    totalReviews: nextTotalReviews,
    correctReviews: nextCorrectReviews,
    totalResponseTimeMs: nextTotalResponseTime,
  };

  candidateState.level = calculateComponentMastery(candidateState);

  return { nextState: candidateState, record };
}

export function isComponentDue(state: ComponentSRSState): boolean {
  if (state.totalReviews === 0) return true; // never reviewed
  return Date.now() >= state.nextReviewDate;
}

export interface ReviewQueueItem {
  card: PAOCard;
  component: PAOComponent;
  state: ComponentSRSState;
  priorityScore: number;
  reason: 'due' | 'forgotten' | 'slow' | 'new';
}

// Calculates prioritization queue strictly following Section 5:
// 1. Frequently forgotten associations
// 2. Slow answers
// 3. Cards with low accuracy
// 4. Cards due for review
export function getPrioritizedReviewQueue(
  cards: PAOCard[],
  srsData: Record<string, CardSRSData>,
  componentFilter?: PAOComponent
): ReviewQueueItem[] {
  const now = Date.now();
  const queue: ReviewQueueItem[] = [];

  const componentsToTest: PAOComponent[] = componentFilter
    ? [componentFilter]
    : ['person', 'action', 'object'];

  for (const card of cards) {
    const cardSrs = srsData[card.id] || createDefaultCardSRS(card.id);

    for (const comp of componentsToTest) {
      const state = cardSrs[comp];
      const isDue = isComponentDue(state);
      const accuracy = state.totalReviews > 0 ? state.correctReviews / state.totalReviews : 0;
      const avgResponseTime =
        state.totalReviews > 0 ? state.totalResponseTimeMs / state.totalReviews : 0;
      const mistakesCount = state.totalReviews - state.correctReviews;

      let score = 0;
      let reason: 'due' | 'forgotten' | 'slow' | 'new' = 'new';

      if (state.totalReviews === 0) {
        score = 50; // New card
        reason = 'new';
      } else {
        // High priority if due
        if (isDue) {
          const overdueMinutes = (now - state.nextReviewDate) / 60000;
          score += 100 + Math.min(200, overdueMinutes / 10);
          reason = 'due';
        }

        // Penalty for mistakes (frequently forgotten)
        if (mistakesCount > 0) {
          score += mistakesCount * 25;
          reason = 'forgotten';
        }

        // Penalty for low accuracy (< 70%)
        if (accuracy < 0.7) {
          score += (1 - accuracy) * 80;
          reason = 'forgotten';
        }

        // Penalty for slow response (> 4000ms)
        if (avgResponseTime > 4000) {
          score += Math.min(60, (avgResponseTime - 4000) / 100);
          if (reason !== 'forgotten') reason = 'slow';
        }
      }

      queue.push({
        card,
        component: comp,
        state,
        priorityScore: score,
        reason,
      });
    }
  }

  // Sort descending by priority score
  queue.sort((a, b) => b.priorityScore - a.priorityScore);

  return queue;
}
