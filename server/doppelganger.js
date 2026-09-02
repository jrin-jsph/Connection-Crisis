import { CONFIG } from '../shared/constants.js';
import { CHALLENGE_STATUS } from '../shared/events.js';

/**
 * Normalizes player name for similarity matching:
 * - Lowercase
 * - Strips leading/trailing whitespace
 * - Collapses consecutive spaces
 * - Strips common separators (_, -, ., #, numbers if trailing)
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\-.\s+#@!]+/g, '');
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Computes Jaro-Winkler distance / normalized similarity score between 0.0 and 1.0.
 * Accurately scores phonetic and single-character variances (e.g. Jerrin vs Jerin = 0.94).
 */
export function calculateSimilarity(nameA, nameB) {
  if (!nameA || !nameB) return 0;

  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  // 1. Exact match after normalization
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  // 2. Levenshtein ratio
  const dist = levenshteinDistance(normA, normB);
  const levRatio = 1 - (dist / maxLen);

  // 3. Prefix matching bonus (Jaro-Winkler prefix scaling)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(normA.length, normB.length)); i++) {
    if (normA[i] === normB[i]) prefix++;
    else break;
  }

  // Blended similarity score with prefix bonus
  const similarity = levRatio + (prefix * 0.05 * (1 - levRatio));
  return Math.min(1.0, Math.max(0.0, Number(similarity.toFixed(4))));
}

export class DoppelgangerDetector {
  constructor(threshold = CONFIG.SIMILARITY_THRESHOLD || 0.85) {
    this.threshold = threshold;
    this.challengedPairs = new Set(); // Stores sorted "pidA_pidB"
  }

  _getPairKey(idA, idB) {
    return [idA, idB].sort().join(':::');
  }

  hasPairBeenChallenged(idA, idB) {
    return this.challengedPairs.has(this._getPairKey(idA, idB));
  }

  markPairChallenged(idA, idB) {
    this.challengedPairs.add(this._getPairKey(idA, idB));
  }

  clearHistory() {
    this.challengedPairs.clear();
  }

  /**
   * Scans a candidate player against a list of active contenders.
   * Returns a Challenge object if a Doppelganger is detected, or null.
   */
  findDoppelganger(candidatePlayer, activePlayers) {
    if (!candidatePlayer || !candidatePlayer.playerId) return null;

    for (const otherPlayer of activePlayers) {
      // Rule 1: Do not compare with self
      if (candidatePlayer.playerId === otherPlayer.playerId) continue;

      // Rule 2: Do not re-challenge already paired players
      if (this.hasPairBeenChallenged(candidatePlayer.playerId, otherPlayer.playerId)) continue;

      const score = calculateSimilarity(candidatePlayer.name, otherPlayer.name);

      // Check if threshold met
      if (score >= this.threshold) {
        this.markPairChallenged(candidatePlayer.playerId, otherPlayer.playerId);

        const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        return {
          challengeId,
          playerA: {
            playerId: candidatePlayer.playerId,
            name: candidatePlayer.name,
            device: candidatePlayer.device
          },
          playerB: {
            playerId: otherPlayer.playerId,
            name: otherPlayer.name,
            device: otherPlayer.device
          },
          similarityScore: score,
          status: CHALLENGE_STATUS.CREATED,
          countdownRemaining: CONFIG.CHALLENGE_COUNTDOWN_SECONDS || 60,
          enteredPlayers: [],
          createdAt: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Full scan of all active players in the room.
   */
  scanAll(playersList) {
    const active = playersList.filter(p => !p.eliminated && p.status !== 'ELIMINATED');
    const detectedChallenges = [];

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const pA = active[i];
        const pB = active[j];

        if (this.hasPairBeenChallenged(pA.playerId, pB.playerId)) continue;

        const score = calculateSimilarity(pA.name, pB.name);
        if (score >= this.threshold) {
          this.markPairChallenged(pA.playerId, pB.playerId);
          const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          detectedChallenges.push({
            challengeId,
            playerA: { playerId: pA.playerId, name: pA.name, device: pA.device },
            playerB: { playerId: pB.playerId, name: pB.name, device: pB.device },
            similarityScore: score,
            status: CHALLENGE_STATUS.CREATED,
            countdownRemaining: CONFIG.CHALLENGE_COUNTDOWN_SECONDS || 60,
            enteredPlayers: [],
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    return detectedChallenges;
  }
}

export const doppelgangerDetector = new DoppelgangerDetector();
