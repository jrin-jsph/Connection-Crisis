import { BaseGame } from './BaseGame.js';

const COLOR_SET = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

export class MemoryMatchGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    super(gameId, type || 'memory_match', playerA, playerB, options);
    this.initialLength = options.initialLength || 3;
    this.maxRounds = options.maxRounds || 5;
    this.currentRound = 1;
    this.masterSequence = [];
    
    // Player progress per round: playerId -> current step index
    this.playerProgress = new Map();
    this.playerMistakes = new Set();
    this.completedRoundPlayers = new Set();
  }

  initialize() {
    this.currentRound = 1;
    this.playerMistakes.clear();
    this.completedRoundPlayers.clear();
    this.playerProgress.set(this.playerA.playerId, 0);
    this.playerProgress.set(this.playerB.playerId, 0);

    // Generate full master sequence
    this.masterSequence = [];
    for (let i = 0; i < this.initialLength + this.maxRounds; i++) {
      const randomColor = COLOR_SET[Math.floor(Math.random() * COLOR_SET.length)];
      this.masterSequence.push(randomColor);
    }

    this.state = {
      status: 'SHOWING_PATTERN', // SHOWING_PATTERN -> INPUT_PHASE -> ROUND_SUCCESS -> FINISHED
      round: this.currentRound,
      currentSequence: this.getCurrentRoundSequence(),
      sequenceLength: this.getCurrentRoundSequence().length,
      playerProgress: {
        [this.playerA.playerId]: 0,
        [this.playerB.playerId]: 0
      },
      scores: {
        [this.playerA.playerId]: 0,
        [this.playerB.playerId]: 0
      },
      mistakes: []
    };

    return this.getState();
  }

  getCurrentRoundSequence() {
    const len = this.initialLength + (this.currentRound - 1);
    return this.masterSequence.slice(0, len);
  }

  start(onPatternReadyCallback) {
    this.state.status = 'SHOWING_PATTERN';
    this.startTime = Date.now();
    this.onPatternReady = onPatternReadyCallback;

    // Pattern display duration proportional to length (e.g. 700ms per item + 500ms prep)
    const displayDurationMs = (this.getCurrentRoundSequence().length * 750) + 600;

    setTimeout(() => {
      if (this.isFinished) return;
      this.state.status = 'INPUT_PHASE';
      if (this.onPatternReady) {
        this.onPatternReady(this.getState());
      }
    }, displayDurationMs);

    return this.getState();
  }

  validateAction(playerId, actionType, actionData) {
    if (this.isFinished) return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    if (actionType !== 'memory_step') return false;
    if (this.state.status !== 'INPUT_PHASE') return false;
    if (this.playerMistakes.has(playerId)) return false;
    if (!COLOR_SET.includes(actionData?.color)) return false;

    return true;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid memory step or not in input phase' };
    }

    const currentStep = this.playerProgress.get(playerId) || 0;
    const roundSequence = this.getCurrentRoundSequence();
    const expectedColor = roundSequence[currentStep];
    const chosenColor = actionData.color;

    // 1. Check for Mistake
    if (chosenColor !== expectedColor) {
      this.playerMistakes.add(playerId);
      this.state.mistakes.push(playerId);
      
      const opponentId = playerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId;
      this.state.scores[opponentId] = 100;
      this.state.scores[playerId] = 0;

      const finishResult = this.finish(opponentId);
      return {
        success: true,
        correct: false,
        completed: true,
        winnerId: opponentId,
        loserId: playerId,
        reason: 'INCORRECT_SEQUENCE_MISTAKE',
        state: this.getState()
      };
    }

    // 2. Correct Step
    const nextStep = currentStep + 1;
    this.playerProgress.set(playerId, nextStep);
    this.state.playerProgress[playerId] = nextStep;
    this.state.scores[playerId] = (this.state.scores[playerId] || 0) + 10;

    // If player completed this round's sequence
    if (nextStep >= roundSequence.length) {
      this.completedRoundPlayers.add(playerId);

      // Check if both completed round
      if (this.completedRoundPlayers.size >= 2 || (this.playerA.isSimulated || this.playerB.isSimulated)) {
        if (this.currentRound >= this.maxRounds) {
          // Max rounds reached - highest score wins
          const finishResult = this.finish();
          return {
            success: true,
            correct: true,
            completed: true,
            winnerId: finishResult.winnerId,
            loserId: finishResult.loserId,
            state: this.getState()
          };
        }

        // Advance to next round
        this.advanceToNextRound();
      }

      return {
        success: true,
        correct: true,
        roundComplete: true,
        currentStep: nextStep,
        sequenceLength: roundSequence.length,
        state: this.getState()
      };
    }

    return {
      success: true,
      correct: true,
      roundComplete: false,
      currentStep: nextStep,
      sequenceLength: roundSequence.length,
      state: this.getState()
    };
  }

  advanceToNextRound() {
    this.currentRound += 1;
    this.completedRoundPlayers.clear();
    this.playerProgress.set(this.playerA.playerId, 0);
    this.playerProgress.set(this.playerB.playerId, 0);

    this.state.status = 'SHOWING_PATTERN';
    this.state.round = this.currentRound;
    this.state.currentSequence = this.getCurrentRoundSequence();
    this.state.sequenceLength = this.getCurrentRoundSequence().length;
    this.state.playerProgress[this.playerA.playerId] = 0;
    this.state.playerProgress[this.playerB.playerId] = 0;

    const displayDurationMs = (this.getCurrentRoundSequence().length * 750) + 600;
    setTimeout(() => {
      if (this.isFinished) return;
      this.state.status = 'INPUT_PHASE';
      if (this.onPatternReady) {
        this.onPatternReady(this.getState());
      }
    }, displayDurationMs);
  }

  determineWinner() {
    if (this.state.scores[this.playerA.playerId] > this.state.scores[this.playerB.playerId]) return this.playerA.playerId;
    if (this.state.scores[this.playerB.playerId] > this.state.scores[this.playerA.playerId]) return this.playerB.playerId;
    return this.playerA.playerId;
  }

  getState() {
    return {
      ...super.getState(),
      round: this.currentRound,
      sequenceLength: this.getCurrentRoundSequence().length,
      // In SHOWING_PATTERN send sequence, during INPUT_PHASE clients recall sequence
      sequence: this.state.status === 'SHOWING_PATTERN' ? this.getCurrentRoundSequence() : undefined,
      currentStep: this.playerProgress,
      mistakes: Array.from(this.playerMistakes)
    };
  }
}
