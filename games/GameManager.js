import { BaseGame } from './BaseGame.js';
import { dbRepository } from '../database/index.js';

export class GameManager {
  constructor() {
    this.gameRegistry = new Map(); // typeName -> GameClass
    this.activeGames = new Map();   // gameId -> GameInstance
  }

  /**
   * Register a game type into the engine.
   */
  registerGame(typeName, GameClass) {
    this.gameRegistry.set(typeName, GameClass);
    console.log(`🎮 [GameManager] Registered minigame type: ${typeName}`);
  }

  /**
   * Create and initialize a new 1v1 game instance.
   */
  createGame(gameId, type, playerA, playerB, options = {}) {
    const GameClass = this.gameRegistry.get(type) || BaseGame;
    const game = new GameClass(gameId, type, playerA, playerB, options);
    game.initialize();
    this.activeGames.set(gameId, game);
    return game;
  }

  /**
   * Start game execution.
   */
  startGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) throw new Error(`Game [${gameId}] not found.`);
    return game.start();
  }

  /**
   * Route player action through server authoritative validation.
   */
  handleAction(gameId, playerId, actionType, actionData) {
    const game = this.activeGames.get(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    return game.receiveAction(playerId, actionType, actionData);
  }

  /**
   * Conclude a game, persist to repository, and determine winner/loser.
   */
  async finishGame(gameId, winnerId = null) {
    const game = this.activeGames.get(gameId);
    if (!game) throw new Error(`Game [${gameId}] not found.`);

    const matchResult = game.finish(winnerId);

    // Persist permanent match record to repository
    await dbRepository.saveMatch({
      matchId: gameId,
      gameType: game.type,
      playerA: game.playerA,
      playerB: game.playerB,
      winnerId: matchResult.winnerId,
      loserId: matchResult.loserId,
      scores: matchResult.scores,
      durationMs: matchResult.durationMs
    });

    return matchResult;
  }

  getGame(gameId) {
    return this.activeGames.get(gameId) || null;
  }

  removeGame(gameId) {
    return this.activeGames.delete(gameId);
  }

  getAvailableGameTypes() {
    return Array.from(this.gameRegistry.keys());
  }
}

export const gameManager = new GameManager();
