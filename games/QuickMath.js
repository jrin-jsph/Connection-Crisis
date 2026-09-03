import { BaseGame } from './BaseGame.js';

export class QuickMathGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options = {}) {
    super(gameId, type || 'quick_math', playerA, playerB, options);
    this.targetScore = options.targetScore || 3;
    this.currentQuestion = null;
    this.questionNumber = 1;
    this.answeredBy = new Set();
  }

  generateProblem() {
    const operators = ['+', '-', '*'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let num1, num2, answer;

    if (op === '+') {
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
    } else if (op === '-') {
      num1 = Math.floor(Math.random() * 20) + 10;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 10) + 2;
      num2 = Math.floor(Math.random() * 9) + 2;
      answer = num1 * num2;
    }

    // Generate 3 unique plausible distractors
    const optionsSet = new Set([answer]);
    while (optionsSet.size < 4) {
      const offset = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const distractor = Math.max(1, answer + offset);
      optionsSet.add(distractor);
    }

    // Shuffle options
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      questionId: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: `${num1} ${op === '*' ? '×' : op} ${num2} = ?`,
      num1,
      num2,
      op,
      answer,
      options
    };
  }

  initialize() {
    this.questionNumber = 1;
    this.currentQuestion = this.generateProblem();
    this.answeredBy.clear();

    this.state = {
      status: 'RUNNING',
      targetScore: this.targetScore,
      questionNumber: this.questionNumber,
      question: {
        questionId: this.currentQuestion.questionId,
        text: this.currentQuestion.text,
        options: this.currentQuestion.options
      },
      scores: {
        [this.playerA.playerId]: 0,
        [this.playerB.playerId]: 0
      },
      lastFeedback: null
    };

    return this.getState();
  }

  start() {
    this.state.status = 'RUNNING';
    this.startTime = Date.now();
    return this.getState();
  }

  validateAction(playerId, actionType, actionData) {
    if (this.isFinished || this.state.status !== 'RUNNING') return false;
    if (playerId !== this.playerA.playerId && playerId !== this.playerB.playerId) return false;
    if (actionType !== 'math_answer') return false;
    if (actionData?.selectedAnswer === undefined || actionData?.selectedAnswer === null) return false;
    return true;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid math answer submission' };
    }

    const selectedAnswer = Number(actionData.selectedAnswer);
    const isCorrect = selectedAnswer === this.currentQuestion.answer;
    const playerObj = playerId === this.playerA.playerId ? this.playerA : this.playerB;

    if (isCorrect) {
      // First correct answer wins +1 point
      this.state.scores[playerId] = (this.state.scores[playerId] || 0) + 1;
      this.state.lastFeedback = {
        playerId,
        playerName: playerObj.name,
        isCorrect: true,
        answer: this.currentQuestion.answer,
        message: `${playerObj.name} got it right! (+1 pt)`
      };

      // Check if player reached target score (e.g. 3)
      if (this.state.scores[playerId] >= this.targetScore) {
        const finishResult = this.finish(playerId);
        return {
          success: true,
          isCorrect: true,
          completed: true,
          winnerId: playerId,
          loserId: playerId === this.playerA.playerId ? this.playerB.playerId : this.playerA.playerId,
          state: this.getState()
        };
      }

      // Generate next question
      this.questionNumber += 1;
      this.currentQuestion = this.generateProblem();
      this.state.questionNumber = this.questionNumber;
      this.state.question = {
        questionId: this.currentQuestion.questionId,
        text: this.currentQuestion.text,
        options: this.currentQuestion.options
      };

      return {
        success: true,
        isCorrect: true,
        completed: false,
        scores: { ...this.state.scores },
        state: this.getState()
      };
    } else {
      // Wrong answer loses a point (minimum 0)
      this.state.scores[playerId] = Math.max(0, (this.state.scores[playerId] || 0) - 1);
      this.state.lastFeedback = {
        playerId,
        playerName: playerObj.name,
        isCorrect: false,
        message: `${playerObj.name} answered incorrectly! (-1 pt)`
      };

      return {
        success: true,
        isCorrect: false,
        completed: false,
        scores: { ...this.state.scores },
        state: this.getState()
      };
    }
  }

  determineWinner() {
    if (this.state.scores[this.playerA.playerId] >= this.targetScore) return this.playerA.playerId;
    if (this.state.scores[this.playerB.playerId] >= this.targetScore) return this.playerB.playerId;
    if (this.state.scores[this.playerA.playerId] > this.state.scores[this.playerB.playerId]) return this.playerA.playerId;
    return this.playerB.playerId;
  }

  getState() {
    return {
      ...super.getState(),
      targetScore: this.targetScore,
      questionNumber: this.questionNumber,
      question: this.state.question,
      lastFeedback: this.state.lastFeedback
    };
  }
}
