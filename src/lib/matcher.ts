import { PAOCard } from '@/types/pao';

// Strips diacritics / accents (e.g. Jinchūriki -> Jinchuriki)
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

// Checks if user answer matches target answer
export function checkAnswer(
  userAnswer: string,
  targetAnswer: string,
  strictSpelling: boolean = false
): { isCorrect: boolean; similarity: number; canonical: string } {
  const normUser = normalizeText(userAnswer);
  const normTarget = normalizeText(targetAnswer);

  if (!normUser) {
    return { isCorrect: false, similarity: 0, canonical: targetAnswer };
  }

  // Exact match after normalization
  if (normUser === normTarget) {
    return { isCorrect: true, similarity: 1, canonical: targetAnswer };
  }

  // Check common aliases / core names
  // e.g. "Trafalgar D. Law" -> "law", "Monkey D. Luffy" -> "luffy", "Boo Boo the Fool" -> "boo boo"
  const aliases = getKnownAliases(targetAnswer);
  for (const alias of aliases) {
    if (normUser === normalizeText(alias)) {
      return { isCorrect: true, similarity: 1, canonical: targetAnswer };
    }
  }

  // Substring check for compound objects or titles if user provided meaningful part
  // e.g., "Ramen bowl" -> user typed "ramen"
  if (normTarget.split(' ').includes(normUser) && normUser.length >= 4) {
    return { isCorrect: true, similarity: 0.9, canonical: targetAnswer };
  }

  // Fuzzy match if strict mode is disabled
  if (!strictSpelling) {
    const dist = levenshteinDistance(normUser, normTarget);
    const maxLen = Math.max(normUser.length, normTarget.length);
    const similarity = 1 - dist / maxLen;

    // Tolerance thresholds:
    // length < 5: exact only
    // length 5..7: max 1 typo (dist <= 1)
    // length >= 8: max 2 typos (dist <= 2, length difference <= 1)
    const lenDiff = Math.abs(normUser.length - normTarget.length);
    if (
      (normTarget.length >= 5 && normTarget.length <= 7 && dist <= 1) ||
      (normTarget.length >= 8 && dist <= 2 && lenDiff <= 1)
    ) {
      return { isCorrect: true, similarity, canonical: targetAnswer };
    }

    // Check distance against aliases as well
    for (const alias of aliases) {
      const normAlias = normalizeText(alias);
      const aliasDist = levenshteinDistance(normUser, normAlias);
      const aliasLenDiff = Math.abs(normUser.length - normAlias.length);
      if (
        (normAlias.length >= 5 && normAlias.length <= 7 && aliasDist <= 1) ||
        (normAlias.length >= 8 && aliasDist <= 2 && aliasLenDiff <= 1)
      ) {
        return { isCorrect: true, similarity: 0.95, canonical: targetAnswer };
      }
    }
  }

  return { isCorrect: false, similarity: 0, canonical: targetAnswer };
}

// Generate sensible aliases for known PAO entities
function getKnownAliases(target: string): string[] {
  const normalized = normalizeText(target);
  const aliases: string[] = [];

  switch (normalized) {
    case 'trafalgar d law':
      aliases.push('law', 'trafalgar law', 'trafalgar');
      break;
    case 'monkey d luffy':
      aliases.push('luffy', 'monkey luffy', 'straw hat');
      break;
    case 'roronoa zoro':
      aliases.push('zoro');
      break;
    case 'fugaku uchiha':
      aliases.push('fugaku');
      break;
    case 'principal brown':
      aliases.push('brown');
      break;
    case 'boo boo the fool':
      aliases.push('boo boo', 'booboo', 'booboo the fool');
      break;
    case 'jinchuriki':
      aliases.push('jinchuuriki', 'jinchuuriki', 'jinchuriki');
      break;
    case 'boa hancock':
      aliases.push('hancock');
      break;
    case 'paperback novel':
      aliases.push('novel', 'paperback', 'book');
      break;
    case 'ramen bowl':
      aliases.push('ramen');
      break;
    case 'giant meteor':
      aliases.push('meteor');
      break;
    case 'red umbrella':
      aliases.push('umbrella');
      break;
    case 'chakra crystal':
      aliases.push('crystal');
      break;
    case 'oil lantern':
      aliases.push('lantern');
      break;
    case 'iron bell':
      aliases.push('bell');
      break;
    case 'treasure chest':
      aliases.push('chest');
      break;
    case 'rubber band':
      aliases.push('rubberband');
      break;
    case 'steel pipe':
      aliases.push('pipe');
      break;
    case 'ghost balloon':
      aliases.push('balloon');
      break;
    case 'frying pan':
      aliases.push('pan');
      break;
    case 'bowling pins':
      aliases.push('pins', 'bowling pin');
      break;
    case 'marble statue':
      aliases.push('statue');
      break;
    case 'concrete pillar':
      aliases.push('pillar');
      break;
    case 'crystal orb':
      aliases.push('orb');
      break;
    case 'prayer beads':
      aliases.push('beads');
      break;
    case 'swimming pool':
      aliases.push('pool');
      break;
    case 'ice sculpture':
      aliases.push('sculpture');
      break;
    case 'power socket':
      aliases.push('socket');
      break;
    case 'golden crown':
      aliases.push('crown');
      break;
    case 'glass dome':
      aliases.push('dome');
      break;
    case 'hand mirror':
      aliases.push('mirror');
      break;
    case 'dynamite stick':
      aliases.push('dynamite');
      break;
    case 'electric razor':
      aliases.push('razor');
      break;
    case 'chocolate bar':
      aliases.push('chocolate');
      break;
    case 'charcoal pencil':
      aliases.push('pencil');
      break;
    case 'rubber stamp':
      aliases.push('stamp');
      break;
    case 'vacuum cleaner':
      aliases.push('vacuum');
      break;
    case 'concrete wall':
      aliases.push('wall');
      break;
    case 'banana peel':
      aliases.push('banana');
      break;
    default:
      break;
  }

  return aliases;
}

// Matching card codes for Mode E (Reverse Recall)
// e.g. target: card with code "7♥", id "H-7", name "7 of Hearts"
export function checkCardReverseMatch(userInput: string, targetCard: PAOCard): boolean {
  const normUser = normalizeText(userInput).replace(/\s+/g, '');
  if (!normUser) return false;

  const validRepresentations: string[] = [
    normalizeText(targetCard.code).replace(/\s+/g, ''),
    normalizeText(targetCard.id).replace(/\s+/g, ''),
    normalizeText(targetCard.name).replace(/\s+/g, ''),
  ];

  // Map suit names and symbols
  const suitNames: Record<string, string[]> = {
    hearts: ['h', 'heart', 'hearts', '♥'],
    spades: ['s', 'spade', 'spades', '♠'],
    diamonds: ['d', 'diamond', 'diamonds', '♦'],
    clubs: ['c', 'club', 'clubs', '♣'],
    jokers: ['joker', 'jokers', 'star', '★'],
  };

  const suitKeywords = suitNames[targetCard.suit] || [];

  if (targetCard.suit === 'jokers') {
    if (targetCard.value === 'RJ') {
      validRepresentations.push('rj', 'redjoker', 'jokerred', 'red');
    } else {
      validRepresentations.push('bj', 'blackjoker', 'jokerblack', 'black');
    }
  } else {
    // e.g. 7 of hearts -> "7h", "h7", "7heart", "7hearts", "heart7"
    const val = targetCard.value.toLowerCase();
    for (const sk of suitKeywords) {
      validRepresentations.push(`${val}${sk}`);
      validRepresentations.push(`${sk}${val}`);
      validRepresentations.push(`${val}of${sk}`);
    }
  }

  for (const rep of validRepresentations) {
    if (normUser === rep) return true;
  }

  return false;
}
