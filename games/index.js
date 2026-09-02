// Games module root & base GameManager abstraction

export class BaseGame {
  constructor(gameId, type, playerAId, playerBId) {
    this.gameId = gameId;
    this.type = type;
    this.playerAId = playerAId;
    this.playerBId = playerBId;
    this.state = {};
    this.isFinished = false;
    this.winnerId = null;
    this.loserId = null;
  }

  initialize() {}
  start() {}
  receiveAction(playerId, action) {}
  validateAction(playerId, action) { return true; }
  calculateScore() { return {}; }
  finish(winnerId, loserId) {
    this.isFinished = true;
    this.winnerId = winnerId;
    this.loserId = loserId;
  }
  determineWinner() { return null; }
}

export class GameManager {
  constructor() {
    this.activeGames = new Map();
  }

  createGame(gameId, type, playerAId, playerBId) {
    const game = new BaseGame(gameId, type, playerAId, playerBId);
    this.activeGames.set(gameId, game);
    return game;
  }

  getGame(gameId) {
    return this.activeGames.get(gameId);
  }

  removeGame(gameId) {
    return this.activeGames.delete(gameId);
  }
}

export const gameManager = new GameManager();
