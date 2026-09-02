import { initializeFirebase, FirestoreRepository } from './firebase.js';

// Base Interface for Repository Pattern
export class BaseRepository {
  async savePlayer(player) { throw new Error('Not implemented'); }
  async getPlayer(playerId) { throw new Error('Not implemented'); }
  async getAllPlayers() { throw new Error('Not implemented'); }
  async saveMatch(match) { throw new Error('Not implemented'); }
  async getMatchHistory(limit) { throw new Error('Not implemented'); }
  async saveChallenge(challenge) { throw new Error('Not implemented'); }
  async getChallenges(limit) { throw new Error('Not implemented'); }
  async saveRoyaleResult(result) { throw new Error('Not implemented'); }
  async getRoyaleResults(limit) { throw new Error('Not implemented'); }
  async saveStatistics(stats) { throw new Error('Not implemented'); }
  async getStatistics() { throw new Error('Not implemented'); }
  getStatus() { throw new Error('Not implemented'); }
}

// In-Memory Repository Fallback (Used when Firebase is offline/unconfigured)
export class MemoryRepository extends BaseRepository {
  constructor() {
    super();
    this.name = 'MemoryRepository';
    this.players = new Map();
    this.matches = new Map();
    this.challenges = new Map();
    this.royaleResults = [];
    this.statistics = {
      totalMatchesPlayed: 0,
      totalPlayersRegistered: 0,
      totalRoyaleTournaments: 0,
      minigamePlays: {}
    };
  }

  async savePlayer(player) {
    const existing = this.players.get(player.playerId) || {};
    const updated = {
      ...existing,
      ...player,
      updatedAt: new Date().toISOString()
    };
    this.players.set(player.playerId, updated);
    this.statistics.totalPlayersRegistered = this.players.size;
    return updated;
  }

  async getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  async getAllPlayers() {
    return Array.from(this.players.values());
  }

  async saveMatch(match) {
    const matchId = match.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      ...match,
      matchId,
      recordedAt: new Date().toISOString()
    };
    this.matches.set(matchId, record);
    
    // Update aggregate stats
    this.statistics.totalMatchesPlayed++;
    const gType = match.gameType || 'unknown';
    this.statistics.minigamePlays[gType] = (this.statistics.minigamePlays[gType] || 0) + 1;

    return record;
  }

  async getMatchHistory(limit = 50) {
    return Array.from(this.matches.values())
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .slice(0, limit);
  }

  async saveChallenge(challenge) {
    const record = {
      ...challenge,
      updatedAt: new Date().toISOString()
    };
    this.challenges.set(challenge.challengeId, record);
    return record;
  }

  async getChallenges(limit = 50) {
    return Array.from(this.challenges.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit);
  }

  async saveRoyaleResult(result) {
    const royaleId = result.royaleId || `royale_${Date.now()}`;
    const record = {
      ...result,
      royaleId,
      recordedAt: new Date().toISOString()
    };
    this.royaleResults.unshift(record);
    this.statistics.totalRoyaleTournaments++;
    return record;
  }

  async getRoyaleResults(limit = 20) {
    return this.royaleResults.slice(0, limit);
  }

  async saveStatistics(stats) {
    this.statistics = { ...this.statistics, ...stats, updatedAt: new Date().toISOString() };
    return this.statistics;
  }

  async getStatistics() {
    return { ...this.statistics };
  }

  getStatus() {
    return {
      type: 'In-Memory',
      isAvailable: true,
      connected: true,
      details: 'Operating in Fast In-Memory Database Mode (No Firebase credentials required)'
    };
  }
}

// Transparent Proxy Repository that resolves the best backend dynamically
export class UnifiedRepository extends BaseRepository {
  constructor() {
    super();
    this.activeRepo = new MemoryRepository();
    this.initPromise = this.init();
  }

  async init() {
    try {
      const fbResult = await initializeFirebase();
      if (fbResult.success && fbResult.db) {
        this.activeRepo = new FirestoreRepository(fbResult.db);
        console.log('🔥 [Database Repository] Active Repository: Firebase Firestore');
      } else {
        console.log('📦 [Database Repository] Active Repository: MemoryRepository (Fast In-Memory fallback)');
      }
    } catch (err) {
      console.warn('⚠️ [Database Repository] Error during init, using MemoryRepository:', err.message);
    }
  }

  async savePlayer(player) {
    await this.initPromise;
    return this.activeRepo.savePlayer(player);
  }

  async getPlayer(playerId) {
    await this.initPromise;
    return this.activeRepo.getPlayer(playerId);
  }

  async getAllPlayers() {
    await this.initPromise;
    return this.activeRepo.getAllPlayers();
  }

  async saveMatch(match) {
    await this.initPromise;
    return this.activeRepo.saveMatch(match);
  }

  async getMatchHistory(limit) {
    await this.initPromise;
    return this.activeRepo.getMatchHistory(limit);
  }

  async saveChallenge(challenge) {
    await this.initPromise;
    return this.activeRepo.saveChallenge(challenge);
  }

  async getChallenges(limit) {
    await this.initPromise;
    return this.activeRepo.getChallenges(limit);
  }

  async saveRoyaleResult(result) {
    await this.initPromise;
    return this.activeRepo.saveRoyaleResult(result);
  }

  async getRoyaleResults(limit) {
    await this.initPromise;
    return this.activeRepo.getRoyaleResults(limit);
  }

  async saveStatistics(stats) {
    await this.initPromise;
    return this.activeRepo.saveStatistics(stats);
  }

  async getStatistics() {
    await this.initPromise;
    return this.activeRepo.getStatistics();
  }

  getStatus() {
    return this.activeRepo.getStatus();
  }
}

export const dbRepository = new UnifiedRepository();
