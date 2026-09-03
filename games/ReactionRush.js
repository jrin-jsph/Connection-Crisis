import { BaseGame } from './BaseGame.js';

export class ReactionRushGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    super(gameId, type || 'reaction_rush', playerA, playerB, options);
    this.signalDelayMs = 0;
    this.signalTimestamp = null;
    this.clicks = new Map(); // playerId -> { timestamp, reactionMs, isEarly }
    this.countdownSeconds = 3;
  }

  initialize() {
    // Generate server authoritative random delay between 2000ms and 5000ms
    this.signalDelayMs = Math.floor(Math.random() * 3000) + 2000;
    this.state = {
      status: 'COUNTDOWN', // COUNTDOWN -> WAITING -> SIGNAL_TRIGGERED -> FINISHED
      countdown: this.countdownSeconds,
      signalActive: false,
      scores: {
        [this.playerA.playerId]: 0,
        [this.playerB.playerId]: 0
      },
      reactionTimes: {},
      earlyClickers: []
    };
    return this.getState();
  }

  start(onSignalTriggerCallback, onCountdownTickCallback) {
    this.state.status = 'COUNTDOWN';
    this.startTime = Date.now();

    // 3-second countdown on server
    let count = this.countdownSeconds;
    const countTimer = setInterval(() => {
      count -= 1;
      this.state.countdown = count;
      if (onCountdownTickCallback) onCountdownTickCallback(count);

      if (count <= 0) {
        clearInterval(countTimer);
        this.state.status = 'WAITING';
        if (onCountdownTickCallback) onCountdownTickCallback(0);

        // Schedule random delay before triggering CLICK! signal
        setTimeout(() => {
          if (this.isFinished) return;
          this.state.status = 'SIGNAL_TRIGGERED';
          this.state.signalActive = true;
          this.signalTimestamp = Date.now();
          if (onSignalTriggerCallback) onSignalTriggerCallback(this.signalTimestamp);
        }, this.signalDelayMs);
      }
    }, 1000);

    return this.getState();
  }

  validateAction(playerId, actionType, actionData) {
    if (this.isFinished) return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    if (actionType !== 'reaction_click') return false;
    if (this.clicks.has(playerId)) return false; // Only 1 click allowed per player
    return true;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid click action' };
    }

    const clickTime = actionData?.timestamp || Date.now();

    // 1. Check for Early Click / False Start before signal
    if (this.state.status === 'WAITING' || this.state.status === 'COUNTDOWN' || !this.state.signalActive) {
      this.clicks.set(playerId, { timestamp: clickTime, reactionMs: -1, isEarly: true });
      this.state.earlyClickers.push(playerId);
      
      // The other player automatically wins due to opponent's false start
      const opponentId = playerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId;
      this.state.scores[opponentId] = 100;
      this.state.scores[playerId] = 0;

      const finishResult = this.finish(opponentId);
      return {
        success: true,
        isEarly: true,
        completed: true,
        winnerId: opponentId,
        loserId: playerId,
        reason: 'FALSE_START_PENALTY',
        state: this.getState()
      };
    }

    // 2. Valid Click after signal
    const reactionMs = Math.max(1, clickTime - this.signalTimestamp);
    this.clicks.set(playerId, { timestamp: clickTime, reactionMs, isEarly: false });
    this.state.reactionTimes[playerId] = reactionMs;

    // First valid click wins
    if (this.clicks.size === 1) {
      this.state.scores[playerId] = 100;
      const opponentId = playerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId;
      this.state.scores[opponentId] = 0;

      const finishResult = this.finish(playerId);
      return {
        success: true,
        completed: true,
        winnerId: playerId,
        loserId: opponentId,
        reactionMs,
        state: this.getState()
      };
    }

    return { success: true, reactionMs, state: this.getState() };
  }

  getState() {
    return {
      ...super.getState(),
      signalActive: this.state.signalActive,
      countdown: this.state.countdown,
      reactionTimes: this.state.reactionTimes,
      earlyClickers: this.state.earlyClickers,
      signalDelayMs: this.isFinished ? this.signalDelayMs : undefined
    };
  }
}
