// Database repository layer with In-Memory fallback and Firestore readiness

export class MemoryRepository {
  constructor() {
    this.players = new Map();
    this.matches = new Map();
    this.challenges = new Map();
    this.royaleStats = [];
  }

  async savePlayer(player) {
    this.players.set(player.playerId, { ...player, updatedAt: new Date().toISOString() });
    return this.players.get(player.playerId);
  }

  async getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  async getAllPlayers() {
    return Array.from(this.players.values());
  }

  async saveMatch(match) {
    this.matches.set(match.matchId, { ...match, recordedAt: new Date().toISOString() });
    return this.matches.get(match.matchId);
  }

  async saveChallenge(challenge) {
    this.challenges.set(challenge.challengeId, { ...challenge, updatedAt: new Date().toISOString() });
    return this.challenges.get(challenge.challengeId);
  }
}

export const dbRepository = new MemoryRepository();
