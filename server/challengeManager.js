import { CHALLENGE_STATUS, PLAYER_STATUS, SOCKET_EVENTS } from '../shared/events.js';
import { CONFIG } from '../shared/constants.js';
import { dbRepository } from '../database/index.js';
import { gameManager } from '../games/index.js';

export class ChallengeManager {
  constructor(io, addLogCallback, broadcastStatusCallback) {
    this.io = io;
    this.addLog = addLogCallback || console.log;
    this.broadcastStatus = broadcastStatusCallback || (() => {});
    this.challenges = new Map(); // challengeId -> challengeObj
    this.timers = new Map(); // challengeId -> setIntervalId
  }

  createChallenge(playerA, playerB, similarityScore = 0.88) {
    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const challenge = {
      challengeId,
      playerA: {
        playerId: playerA.playerId,
        name: playerA.name,
        device: playerA.device
      },
      playerB: {
        playerId: playerB.playerId,
        name: playerB.name,
        device: playerB.device
      },
      similarityScore,
      status: CHALLENGE_STATUS.COUNTDOWN,
      countdownRemaining: CONFIG.CHALLENGE_COUNTDOWN_SECONDS || 60,
      enteredPlayers: [], // array of playerIds who clicked enter
      winnerId: null,
      loserId: null,
      createdAt: new Date().toISOString()
    };

    this.challenges.set(challengeId, challenge);
    dbRepository.saveChallenge(challenge);

    this.addLog(
      `⚡ DOPPELGANGER CRISIS! ${playerA.name} VS ${playerB.name} (60s countdown started)`,
      'challenge'
    );

    // Start 1-second server authoritative timer
    this.startCountdown(challengeId);

    // Broadcast challenge created
    this.io.emit(SOCKET_EVENTS.CHALLENGE_CREATED, { challenge });
    this.broadcastStatus();

    return challenge;
  }

  startCountdown(challengeId) {
    if (this.timers.has(challengeId)) {
      clearInterval(this.timers.get(challengeId));
    }

    const timerId = setInterval(() => {
      const ch = this.challenges.get(challengeId);
      if (!ch) {
        clearInterval(timerId);
        this.timers.delete(challengeId);
        return;
      }

      // If already started or finished, stop timer
      if (ch.status === CHALLENGE_STATUS.GAME_RUNNING || ch.status === CHALLENGE_STATUS.FINISHED || ch.status === CHALLENGE_STATUS.TIMEOUT) {
        clearInterval(timerId);
        this.timers.delete(challengeId);
        return;
      }

      ch.countdownRemaining -= 1;

      // Broadcast timer tick to challenge participants and host
      this.io.emit('challenge:tick', {
        challengeId: ch.challengeId,
        countdownRemaining: ch.countdownRemaining,
        enteredPlayers: ch.enteredPlayers
      });

      // Handle Timeout when timer hits 0
      if (ch.countdownRemaining <= 0) {
        clearInterval(timerId);
        this.timers.delete(challengeId);
        this.handleTimeout(challengeId);
      }
    }, 1000);

    this.timers.set(challengeId, timerId);
  }

  enterPlayer(challengeId, playerId) {
    const ch = this.challenges.get(challengeId);
    if (!ch) {
      return { success: false, error: 'Challenge not found' };
    }

    if (ch.status !== CHALLENGE_STATUS.COUNTDOWN && ch.status !== CHALLENGE_STATUS.WAITING && ch.status !== CHALLENGE_STATUS.CREATED) {
      return { success: false, error: 'Challenge is no longer accepting entry' };
    }

    // Verify player is one of the contenders
    if (ch.playerA.playerId !== playerId && ch.playerB.playerId !== playerId) {
      return { success: false, error: 'Player is not part of this showdown' };
    }

    if (!ch.enteredPlayers.includes(playerId)) {
      ch.enteredPlayers.push(playerId);
      const enteringPlayerName = ch.playerA.playerId === playerId ? ch.playerA.name : ch.playerB.name;
      this.addLog(`${enteringPlayerName} entered Doppelganger Challenge arena (${ch.enteredPlayers.length}/2 entered)`, 'challenge');
    }

    // Broadcast updated entered players list
    this.io.emit('challenge:player_entered', {
      challengeId: ch.challengeId,
      enteredPlayers: ch.enteredPlayers,
      playerId
    });

    // If both players have entered, transition to GAME_SELECTED and after 3s to GAME_RUNNING
    if (ch.enteredPlayers.length >= 2) {
      this.stopCountdown(challengeId);
      ch.status = CHALLENGE_STATUS.GAME_SELECTED;
      
      const ALL_MINIGAMES = ['reaction_rush', 'rock_paper_scissors', 'memory_match', 'quick_math', 'target_click'];
      const chosenGameType = ch.forcedGameType || ALL_MINIGAMES[Math.floor(Math.random() * ALL_MINIGAMES.length)];
      ch.selectedGameType = chosenGameType;

      this.addLog(`🎲 Random minigame selected: [${chosenGameType}] for ${ch.playerA.name} VS ${ch.playerB.name}`, 'game');

      // 1. Broadcast synchronized 3-second selection screen to both players and host
      this.io.emit(SOCKET_EVENTS.GAME_SELECTED, {
        challengeId: ch.challengeId,
        selectedGameType: chosenGameType,
        durationSec: 3,
        playerA: ch.playerA,
        playerB: ch.playerB
      });
      this.broadcastStatus();

      // 2. After 3 seconds, start the actual minigame
      setTimeout(() => {
        if (ch.status === CHALLENGE_STATUS.FINISHED) return;
        ch.status = CHALLENGE_STATUS.GAME_RUNNING;
        const gameId = 'game_' + ch.challengeId;

        const game = gameManager.createGame(gameId, chosenGameType, ch.playerA, ch.playerB);
        this.addLog(`Showdown Started: [${chosenGameType}] between ${ch.playerA.name} and ${ch.playerB.name}`, 'game');

        this.io.emit(SOCKET_EVENTS.CHALLENGE_STARTED, { challenge: ch });
        this.io.emit(SOCKET_EVENTS.GAME_STARTED, {
          gameId,
          challengeId: ch.challengeId,
          playerA: ch.playerA,
          playerB: ch.playerB,
          playerAId: ch.playerA.playerId,
          playerBId: ch.playerB.playerId,
          gameType: chosenGameType,
          gameData: game.getState()
        });

        // Initialize callbacks based on game type
        if (chosenGameType === 'reaction_rush') {
          game.start(
            (signalTimestamp) => {
              this.addLog(`⚡ SIGNAL FIRED in Reaction Rush [${gameId}]!`, 'game');
              this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
                gameId,
                state: { status: 'SIGNAL_TRIGGERED', signalActive: true, signalTimestamp }
              });
            },
            (countdownRemaining) => {
              this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, {
                gameId,
                state: { status: countdownRemaining > 0 ? 'COUNTDOWN' : 'WAITING', countdown: countdownRemaining }
              });
            }
          );
        } else if (chosenGameType === 'rock_paper_scissors') {
          game.start(
            (sec, round) => {
              this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, round } });
            },
            (roundRecord, matchFinished, finishRes) => {
              this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: game.getState(true) });
            }
          );
        } else if (chosenGameType === 'memory_match') {
          game.start((patternState) => {
            this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: patternState });
          });
        } else if (chosenGameType === 'target_click') {
          game.start(
            (sec, currentTarget) => {
              this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, currentTarget, scores: game.scores } });
            },
            async (matchResult) => {
              const winner = ch.playerA.playerId === matchResult.winnerId ? ch.playerA : ch.playerB;
              const loser = ch.playerA.playerId === matchResult.loserId ? ch.playerA : ch.playerB;
              await gameManager.finishGame(gameId, matchResult.winnerId);
              this.io.emit(SOCKET_EVENTS.GAME_FINISHED, {
                gameId,
                winnerId: matchResult.winnerId,
                loserId: matchResult.loserId,
                winnerName: winner?.name,
                loserName: loser?.name,
                scores: matchResult.scores,
                reason: 'TIME_EXPIRED_MOST_POINTS'
              });
              this.broadcastStatus();
            }
          );
        } else {
          game.start();
        }

        this.broadcastStatus();
      }, 3000);
    }

    return { success: true, challenge: ch };
  }

  handleTimeout(challengeId) {
    const ch = this.challenges.get(challengeId);
    if (!ch || ch.status === CHALLENGE_STATUS.GAME_RUNNING) return;

    ch.status = CHALLENGE_STATUS.TIMEOUT;

    // Identify who failed to enter
    const missedPlayers = [];
    if (!ch.enteredPlayers.includes(ch.playerA.playerId)) missedPlayers.push(ch.playerA);
    if (!ch.enteredPlayers.includes(ch.playerB.playerId)) missedPlayers.push(ch.playerB);

    const missedNames = missedPlayers.map(p => p.name).join(', ');
    this.addLog(`⏱️ Challenge Timeout! [${missedNames}] failed to enter within 60 seconds.`, 'warning');

    this.io.emit(SOCKET_EVENTS.CHALLENGE_TIMEOUT, {
      challengeId: ch.challengeId,
      missedPlayers: missedPlayers.map(p => p.playerId),
      challenge: ch
    });

    dbRepository.saveChallenge(ch);
    this.broadcastStatus();
  }

  stopCountdown(challengeId) {
    if (this.timers.has(challengeId)) {
      clearInterval(this.timers.get(challengeId));
      this.timers.delete(challengeId);
    }
  }

  getChallenge(challengeId) {
    return this.challenges.get(challengeId) || null;
  }

  getAllChallenges() {
    return Array.from(this.challenges.values());
  }

  clearAll() {
    for (const timerId of this.timers.values()) {
      clearInterval(timerId);
    }
    this.timers.clear();
    this.challenges.clear();
  }
}
