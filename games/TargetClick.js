import { BaseGame } from './BaseGame.js';

export class TargetClickGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    super(gameId, type || 'target_click', playerA, playerB, options);
    this.durationSec = options.durationSec || 10;
    this.secondsRemaining = this.durationSec;
    this.currentTarget = null;
    this.gameTimer = null;
    this.scores = {
      [playerA.playerId]: 0,
      [playerB.playerId]: 0
    };
  }

  generateTarget() {
    return {
      targetId: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      x: Math.floor(Math.random() * 70) + 15, // 15% to 85% bounds
      y: Math.floor(Math.random() * 65) + 18, // 18% to 83% bounds
      size: Math.floor(Math.random() * 15) + 55, // 55px to 70px
      spawnTime: Date.now()
    };
  }

  initialize() {
    this.secondsRemaining = this.durationSec;
    this.currentTarget = this.generateTarget();
    this.scores = {
      [this.playerA.playerId]: 0,
      [this.playerB.playerId]: 0
    };

    this.state = {
      status: 'RUNNING',
      secondsRemaining: this.secondsRemaining,
      currentTarget: this.currentTarget,
      scores: { ...this.scores }
    };

    return this.getState();
  }

  start(onTickCallback, onFinishCallback) {
    this.state.status = 'RUNNING';
    this.startTime = Date.now();
    this.onTick = onTickCallback;
    this.onFinish = onFinishCallback;

    if (this.gameTimer) clearInterval(this.gameTimer);

    this.gameTimer = setInterval(() => {
      this.secondsRemaining -= 1;
      this.state.secondsRemaining = this.secondsRemaining;

      if (this.onTick) {
        this.onTick(this.secondsRemaining, this.currentTarget);
      }

      if (this.secondsRemaining <= 0) {
        clearInterval(this.gameTimer);
        const matchResult = this.finish();
        if (this.onFinish) this.onFinish(matchResult);
      }
    }, 1000);

    return this.getState();
  }

  validateAction(playerId, actionType, actionData) {
    if (this.isFinished || this.state.status !== 'RUNNING') return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    if (actionType !== 'target_click') return false;
    if (!actionData?.targetId) return false;
    return true;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid target click submission' };
    }

    // Verify target matches current active target
    if (actionData.targetId !== this.currentTarget?.targetId) {
      return {
        success: false,
        stale: true,
        message: 'Target already claimed or expired',
        state: this.getState()
      };
    }

    // Award point to player
    this.scores[playerId] = (this.scores[playerId] || 0) + 1;
    this.state.scores = { ...this.scores };

    // Spawn next target immediately
    this.currentTarget = this.generateTarget();
    this.state.currentTarget = this.currentTarget;

    return {
      success: true,
      hit: true,
      scorerId: playerId,
      scores: { ...this.scores },
      nextTarget: this.currentTarget,
      state: this.getState()
    };
  }

  determineWinner() {
    const scoreA = this.scores[this.playerA.playerId] || 0;
    const scoreB = this.scores[this.playerB.playerId] || 0;
    if (scoreA > scoreB) return this.playerA.playerId;
    if (scoreB > scoreA) return this.playerB.playerId;
    return this.playerA.playerId; // Draw default
  }

  finish(forcedWinnerId = null) {
    if (this.gameTimer) clearInterval(this.gameTimer);
    return super.finish(forcedWinnerId);
  }

  getState() {
    return {
      ...super.getState(),
      secondsRemaining: this.secondsRemaining,
      currentTarget: this.currentTarget,
      scores: this.scores
    };
  }
}
