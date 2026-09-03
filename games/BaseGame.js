/**
 * Base Abstract Minigame Class
 * All 1v1 minigames inherit from BaseGame.
 */
export class BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    this.gameId = gameId;
    this.type = type;
    this.playerA = playerA; // { playerId, name, device }
    this.playerB = playerB; // { playerId, name, device }
    this.options = options;
    
    this.state = {
      status: 'INITIALIZED', // INITIALIZED, READY, RUNNING, FINISHED
      round: 1,
      scores: {
        [playerA.playerId]: 0,
        [playerB.playerId]: 0
      }
    };

    this.isFinished = false;
    this.winnerId = null;
    this.loserId = null;
    this.startTime = null;
    this.endTime = null;
    this.timer = null;
  }

  /**
   * Set up initial game parameters and random seeds.
   */
  initialize() {
    this.state.status = 'INITIALIZED';
    return this.getState();
  }

  /**
   * Start the minigame on the server.
   */
  start() {
    this.state.status = 'RUNNING';
    this.startTime = Date.now();
    return this.getState();
  }

  /**
   * Validate if player action is allowed.
   */
  validateAction(playerId, actionType, actionData) {
    if (this.isFinished || this.state.status !== 'RUNNING') return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    return true;
  }

  /**
   * Process a player action.
   */
  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid or disallowed action' };
    }
    return { success: true, state: this.getState() };
  }

  /**
   * Calculate scores based on game rules and action timing.
   */
  calculateScore() {
    return { ...this.state.scores };
  }

  /**
   * Determine the winner (returns winner playerId or 'DRAW').
   */
  determineWinner() {
    const scores = this.calculateScore() || {};
    const scoreA = scores[this.playerA.playerId] || 0;
    const scoreB = scores[this.playerB.playerId] || 0;
    if (scoreA > scoreB) return this.playerA.playerId;
    if (scoreB > scoreA) return this.playerB.playerId;
    return null; // Draw
  }

  /**
   * Finish the game, determine winner/loser, and lock state.
   */
  finish(forcedWinnerId = null) {
    this.isFinished = true;
    this.state.status = 'FINISHED';
    this.endTime = Date.now();
    if (this.timer) clearInterval(this.timer);

    this.winnerId = forcedWinnerId || this.determineWinner();
    if (this.winnerId) {
      this.loserId = this.winnerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId;
    }

    return {
      gameId: this.gameId,
      type: this.type,
      winnerId: this.winnerId,
      loserId: this.loserId,
      scores: this.calculateScore(),
      durationMs: this.endTime - (this.startTime || this.endTime),
      finalState: this.getState()
    };
  }

  /**
   * Clean public state snapshot sent to clients.
   */
  getState() {
    return {
      gameId: this.gameId,
      type: this.type,
      status: this.state.status,
      playerA: this.playerA,
      playerB: this.playerB,
      scores: this.state.scores,
      isFinished: this.isFinished,
      winnerId: this.winnerId,
      loserId: this.loserId,
      round: this.state.round
    };
  }
}
