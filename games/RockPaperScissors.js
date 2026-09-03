import { BaseGame } from './BaseGame.js';

export class RockPaperScissorsGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    super(gameId, type || 'rock_paper_scissors', playerA, playerB, options);
    this.targetWins = options.targetWins || 2; // Best of 3 (first to 2 wins)
    this.roundDurationSec = options.roundDurationSec || 5;
    this.currentRound = 1;
    this.roundTimer = null;
    this.roundSecondsRemaining = this.roundDurationSec;
    
    this.roundChoices = new Map(); // roundNumber -> Map(playerId -> choice)
    this.roundHistory = []; // [{ round, choiceA, choiceB, winnerId, resultText }]
    this.scores = {
      [playerA.playerId]: 0,
      [playerB.playerId]: 0
    };
  }

  initialize() {
    this.currentRound = 1;
    this.roundSecondsRemaining = this.roundDurationSec;
    this.roundChoices.set(this.currentRound, new Map());
    this.state = {
      status: 'CHOOSING', // CHOOSING -> REVEAL -> INTERMISSION -> FINISHED
      round: this.currentRound,
      secondsRemaining: this.roundSecondsRemaining,
      targetWins: this.targetWins,
      scores: { ...this.scores },
      hasChosen: {
        [this.playerA.playerId]: false,
        [this.playerB.playerId]: false
      },
      lastRoundResult: null
    };
    return this.getState();
  }

  start(onTickCallback, onRoundEndCallback) {
    this.state.status = 'CHOOSING';
    this.startTime = Date.now();
    this.onTick = onTickCallback;
    this.onRoundEnd = onRoundEndCallback;

    this.startRoundTimer();
    return this.getState();
  }

  startRoundTimer() {
    if (this.roundTimer) clearInterval(this.roundTimer);
    this.roundSecondsRemaining = this.roundDurationSec;
    this.state.secondsRemaining = this.roundSecondsRemaining;

    this.roundTimer = setInterval(() => {
      this.roundSecondsRemaining -= 1;
      this.state.secondsRemaining = this.roundSecondsRemaining;

      if (this.onTick) {
        this.onTick(this.roundSecondsRemaining, this.currentRound);
      }

      // If timer reaches 0, evaluate round with whatever choices are in
      if (this.roundSecondsRemaining <= 0) {
        clearInterval(this.roundTimer);
        this.evaluateRound();
      }
    }, 1000);
  }

  validateAction(playerId, actionType, actionData) {
    if (this.isFinished) return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    if (actionType !== 'rps_choice') return false;
    if (this.state.status !== 'CHOOSING') return false;

    const validChoices = ['rock', 'paper', 'scissors'];
    if (!actionData?.choice || !validChoices.includes(actionData.choice)) return false;

    return true;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid RPS choice or round not in choosing state' };
    }

    const currentChoices = this.roundChoices.get(this.currentRound);
    currentChoices.set(playerId, actionData.choice);
    this.state.hasChosen[playerId] = true;

    // If both players have made their secret choices, evaluate immediately
    if (currentChoices.size >= 2) {
      if (this.roundTimer) clearInterval(this.roundTimer);
      const roundResult = this.evaluateRound();
      return {
        success: true,
        evaluated: true,
        completed: !!roundResult.matchFinished,
        winnerId: roundResult.matchWinnerId,
        loserId: roundResult.matchWinnerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId,
        roundResult,
        state: this.getState(true) // Reveal state
      };
    }

    return {
      success: true,
      evaluated: false,
      state: this.getState(false) // Keep choices concealed
    };
  }

  evaluateRound() {
    const choices = this.roundChoices.get(this.currentRound) || new Map();
    const choiceA = choices.get(this.playerA.playerId) || 'timeout';
    const choiceB = choices.get(this.playerB.playerId) || 'timeout';

    let roundWinnerId = null;
    let resultText = '';

    if (choiceA === choiceB) {
      roundWinnerId = null; // Draw
      resultText = `Draw! Both chose ${choiceA.toUpperCase()}`;
    } else if (choiceA === 'timeout' && choiceB !== 'timeout') {
      roundWinnerId = this.playerB.playerId;
      resultText = `${this.playerB.name} wins (Opponent timed out!)`;
    } else if (choiceB === 'timeout' && choiceA !== 'timeout') {
      roundWinnerId = this.playerA.playerId;
      resultText = `${this.playerA.name} wins (Opponent timed out!)`;
    } else if (choiceA === 'timeout' && choiceB === 'timeout') {
      roundWinnerId = null;
      resultText = 'Both players timed out!';
    } else if (
      (choiceA === 'rock' && choiceB === 'scissors') ||
      (choiceA === 'scissors' && choiceB === 'paper') ||
      (choiceA === 'paper' && choiceB === 'rock')
    ) {
      roundWinnerId = this.playerA.playerId;
      resultText = `${this.playerA.name} wins round! (${choiceA.toUpperCase()} beats ${choiceB.toUpperCase()})`;
    } else {
      roundWinnerId = this.playerB.playerId;
      resultText = `${this.playerB.name} wins round! (${choiceB.toUpperCase()} beats ${choiceA.toUpperCase()})`;
    }

    if (roundWinnerId) {
      this.scores[roundWinnerId] += 1;
    }

    this.state.scores = { ...this.scores };
    const roundRecord = {
      round: this.currentRound,
      choiceA,
      choiceB,
      winnerId: roundWinnerId,
      resultText,
      scores: { ...this.scores }
    };
    this.roundHistory.push(roundRecord);
    this.state.lastRoundResult = roundRecord;
    this.state.status = 'REVEAL';

    // Check if match won
    const wonMatch = this.scores[this.playerA.playerId] >= this.targetWins || 
                     this.scores[this.playerB.playerId] >= this.targetWins;

    if (wonMatch) {
      const matchWinnerId = this.scores[this.playerA.playerId] >= this.targetWins 
        ? this.playerA.playerId 
        : this.playerB.playerId;
      
      const finishRes = this.finish(matchWinnerId);
      if (this.onRoundEnd) this.onRoundEnd(roundRecord, true, finishRes);
      return { ...roundRecord, matchFinished: true, matchWinnerId };
    }

    // Schedule next round after brief reveal intermission (2.5s)
    if (this.onRoundEnd) this.onRoundEnd(roundRecord, false, null);
    
    setTimeout(() => {
      if (this.isFinished) return;
      this.currentRound += 1;
      this.roundChoices.set(this.currentRound, new Map());
      this.state.status = 'CHOOSING';
      this.state.round = this.currentRound;
      this.state.hasChosen = {
        [this.playerA.playerId]: false,
        [this.playerB.playerId]: false
      };
      this.startRoundTimer();
      if (this.onTick) this.onTick(this.roundDurationSec, this.currentRound);
    }, 2500);

    return { ...roundRecord, matchFinished: false };
  }

  determineWinner() {
    if (this.scores[this.playerA.playerId] > this.scores[this.playerB.playerId]) return this.playerA.playerId;
    if (this.scores[this.playerB.playerId] > this.scores[this.playerA.playerId]) return this.playerB.playerId;
    return null;
  }

  calculateScore() {
    return { ...this.scores };
  }

  getState(revealChoices = false) {
    const base = super.getState();
    const currentChoices = this.roundChoices.get(this.currentRound) || new Map();
    
    return {
      ...base,
      round: this.currentRound,
      targetWins: this.targetWins,
      secondsRemaining: this.roundSecondsRemaining,
      scores: this.scores,
      hasChosen: this.state?.hasChosen || {
        [this.playerA.playerId]: false,
        [this.playerB.playerId]: false
      },
      lastRoundResult: this.state?.lastRoundResult || null,
      // Only reveal current choices if revealChoices is true or status is REVEAL/FINISHED
      currentChoices: (revealChoices || this.state?.status === 'REVEAL' || this.isFinished) ? {
        [this.playerA.playerId]: currentChoices.get(this.playerA.playerId) || null,
        [this.playerB.playerId]: currentChoices.get(this.playerB.playerId) || null
      } : null
    };
  }
}
