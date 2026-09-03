import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';
import { gameManager } from '../games/index.js';
import { dbRepository } from '../database/index.js';

const ALL_MINIGAMES = ['reaction_rush', 'rock_paper_scissors', 'memory_match', 'quick_math', 'target_click'];

export class RoyaleManager {
  constructor(io, addLogCallback, broadcastStatusCallback, eliminatePlayerCallback) {
    this.io = io;
    this.addLog = addLogCallback || console.log;
    this.broadcastStatus = broadcastStatusCallback || (() => {});
    this.eliminatePlayer = eliminatePlayerCallback || (() => {});
    
    this.currentRoyale = null;
    this.royaleHistory = [];
  }

  /**
   * Start a new Connection Crisis Royale Tournament.
   * @param {Array<Object>} players - Array of active player objects
   */
  startRoyale(players) {
    const activeContenders = players.filter(p => !p.eliminated && p.status !== PLAYER_STATUS.ELIMINATED);
    if (activeContenders.length < 2) {
      return { success: false, error: 'At least 2 active contenders required to initiate Royale Tournament' };
    }

    const royaleId = 'royale_' + Date.now();
    this.currentRoyale = {
      royaleId,
      status: 'RUNNING',
      currentRound: 1,
      totalInitialContenders: activeContenders.length,
      activeContenders: [...activeContenders],
      advancingContenders: [],
      eliminatedContenders: [],
      matches: [],
      startTime: Date.now(),
      champion: null
    };

    this.addLog(`👑 CONNECTION CRISIS ROYALE INITIATED: [${royaleId}] with ${activeContenders.length} Contenders!`, 'royale');
    this.io.emit(SOCKET_EVENTS.ROYALE_STARTED, {
      royaleId,
      contendersCount: activeContenders.length,
      contenders: activeContenders.map(p => ({ playerId: p.playerId, name: p.name, device: p.device }))
    });

    this.startRound(1);
    return { success: true, royaleId, contendersCount: activeContenders.length };
  }

  /**
   * Setup and launch pairs for the given round.
   */
  startRound(roundNumber) {
    if (!this.currentRoyale) return;

    const royale = this.currentRoyale;
    royale.currentRound = roundNumber;
    royale.advancingContenders = [];
    royale.matches = [];

    // Shuffle active contenders for fair pairing
    const pool = [...royale.activeContenders].sort(() => Math.random() - 0.5);
    const matches = [];

    let byeContender = null;
    if (pool.length % 2 !== 0) {
      // Odd number of contenders: 1 lucky contender gets a Bye
      byeContender = pool.pop();
      royale.advancingContenders.push(byeContender);
      this.addLog(`🎟️ ${byeContender.name} received an Automatic BYE to Round ${roundNumber + 1}!`, 'royale');
    }

    // Pair remaining contenders into 1v1 matches
    for (let i = 0; i < pool.length; i += 2) {
      const pA = pool[i];
      const pB = pool[i + 1];
      const matchId = `match_r${roundNumber}_${i / 2}_${Date.now()}`;
      const chosenGameType = ALL_MINIGAMES[Math.floor(Math.random() * ALL_MINIGAMES.length)];

      const match = {
        matchId,
        round: roundNumber,
        playerA: pA,
        playerB: pB,
        gameType: chosenGameType,
        status: 'PENDING',
        winner: null,
        loser: null
      };

      matches.push(match);
    }

    royale.matches = matches;

    this.addLog(`⚔️ ROYALE ROUND ${roundNumber} STARTING: ${matches.length} Showdowns Created.`, 'royale');

    this.io.emit(SOCKET_EVENTS.ROYALE_ROUND_START, {
      royaleId: royale.royaleId,
      roundNumber,
      matches: matches.map(m => ({
        matchId: m.matchId,
        playerA: { playerId: m.playerA.playerId, name: m.playerA.name },
        playerB: { playerId: m.playerB.playerId, name: m.playerB.name },
        gameType: m.gameType
      })),
      byePlayer: byeContender ? { playerId: byeContender.playerId, name: byeContender.name } : null
    });

    // Launch each match in this round
    for (const match of matches) {
      this.launchMatch(match);
    }

    this.broadcastStatus();
  }

  /**
   * Launch a specific match in the round.
   */
  launchMatch(match) {
    match.status = 'SELECTING';
    const gameId = 'game_' + match.matchId;

    // 1. Synchronized 3-second selection broadcast
    this.io.emit(SOCKET_EVENTS.GAME_SELECTED, {
      challengeId: match.matchId,
      selectedGameType: match.gameType,
      durationSec: 3,
      playerA: match.playerA,
      playerB: match.playerB
    });

    // 2. Start game after 3 seconds
    setTimeout(() => {
      if (!this.currentRoyale || this.currentRoyale.status === 'FINISHED') return;

      match.status = 'IN_PROGRESS';
      const game = gameManager.createGame(gameId, match.gameType, match.playerA, match.playerB);
      match.game = game;

      this.io.emit(SOCKET_EVENTS.GAME_STARTED, {
        gameId,
        challengeId: match.matchId,
        playerA: match.playerA,
        playerB: match.playerB,
        playerAId: match.playerA.playerId,
        playerBId: match.playerB.playerId,
        gameType: match.gameType,
        gameData: game.getState()
      });

      // Start minigame logic callbacks
      if (match.gameType === 'reaction_rush') {
        game.start(
          (signalTimestamp) => {
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
      } else if (match.gameType === 'rock_paper_scissors') {
        game.start(
          (sec, round) => {
            this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, round } });
          },
          (roundRecord, matchFinished, finishRes) => {
            this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: game.getState(true) });
          }
        );
      } else if (match.gameType === 'memory_match') {
        game.start((patternState) => {
          this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: patternState });
        });
      } else if (match.gameType === 'target_click') {
        game.start(
          (sec, currentTarget) => {
            this.io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, currentTarget, scores: game.scores } });
          },
          async (matchResult) => {
            await this.handleMatchCompletion(match.matchId, matchResult.winnerId, matchResult.loserId, {
              scores: matchResult.scores,
              reason: 'TIME_EXPIRED_MOST_POINTS'
            });
          }
        );
      } else {
        game.start();
      }

      this.broadcastStatus();
    }, 3000);
  }

  /**
   * Handle when a match in the Royale tournament completes.
   */
  async handleMatchCompletion(matchOrGameId, winnerId, loserId, extraData = {}) {
    if (!this.currentRoyale) return;

    const royale = this.currentRoyale;
    const cleanId = matchOrGameId.replace('game_', '');
    const match = royale.matches.find(m => m.matchId === cleanId || 'game_' + m.matchId === matchOrGameId);
    if (!match || match.status === 'COMPLETED') return;

    match.status = 'COMPLETED';
    const winner = match.playerA.playerId === winnerId ? match.playerA : match.playerB;
    const loser = match.playerA.playerId === loserId ? match.playerA : match.playerB;
    match.winner = winner;
    match.loser = loser;

    royale.advancingContenders.push(winner);
    royale.eliminatedContenders.push(loser);

    // Call elimination handler to eliminate loser and ban name
    await this.eliminatePlayer(loser, winner, 'ROYALE_ELIMINATION');

    this.addLog(`🏆 ${winner.name} won Royale Match against ${loser.name}! Advancing to next round.`, 'royale');

    this.io.emit(SOCKET_EVENTS.GAME_FINISHED, {
      gameId: 'game_' + match.matchId,
      winnerId,
      loserId,
      winnerName: winner.name,
      loserName: loser.name,
      scores: extraData.scores,
      reason: extraData.reason || 'ROYALE_VICTORY',
      reactionMs: extraData.reactionMs
    });

    // Check if all matches in the current round are completed
    const allCompleted = royale.matches.every(m => m.status === 'COMPLETED');
    if (allCompleted) {
      this.finishRound();
    }
  }

  /**
   * Conclude current round and either start next round or crown Champion.
   */
  async finishRound() {
    if (!this.currentRoyale) return;
    const royale = this.currentRoyale;

    this.io.emit(SOCKET_EVENTS.ROYALE_ROUND_FINISH, {
      royaleId: royale.royaleId,
      completedRound: royale.currentRound,
      advancingContenders: royale.advancingContenders.map(p => ({ playerId: p.playerId, name: p.name }))
    });

    // Update active contenders pool with the survivors
    royale.activeContenders = [...royale.advancingContenders];

    if (royale.activeContenders.length === 1) {
      // 👑 TOURNAMENT COMPLETED! WE HAVE A CHAMPION: THE ONLY REAL ONE!
      const champion = royale.activeContenders[0];
      royale.champion = champion;
      royale.status = 'FINISHED';
      royale.endTime = Date.now();

      this.addLog(`👑 ==========================================`, 'royale');
      this.addLog(`👑 CONNECTION CRISIS ROYALE CHAMPION CROWNED!`, 'royale');
      this.addLog(`👑 "${champion.name}" IS THE ONLY REAL ONE!`, 'royale');
      this.addLog(`👑 ==========================================`, 'royale');

      const finalePayload = {
        royaleId: royale.royaleId,
        champion: {
          playerId: champion.playerId,
          name: champion.name,
          device: champion.device,
          title: 'THE ONLY REAL ONE'
        },
        totalRounds: royale.currentRound,
        initialContendersCount: royale.totalInitialContenders,
        durationMs: royale.endTime - royale.startTime
      };

      // Persist tournament record to database
      await dbRepository.saveRoyaleResult(finalePayload);

      this.io.emit(SOCKET_EVENTS.ROYALE_FINISHED, finalePayload);
      this.broadcastStatus();
    } else if (royale.activeContenders.length > 1) {
      // Advance to next round after 1.5s intermission
      this.addLog(`⏳ Round ${royale.currentRound} complete! Starting Round ${royale.currentRound + 1} in 1.5s...`, 'royale');
      setTimeout(() => {
        if (this.currentRoyale && this.currentRoyale.status !== 'FINISHED') {
          this.startRound(royale.currentRound + 1);
        }
      }, 1500);
    }
  }

  getStatus() {
    if (!this.currentRoyale) return null;
    return {
      royaleId: this.currentRoyale.royaleId,
      status: this.currentRoyale.status,
      currentRound: this.currentRoyale.currentRound,
      activeContendersCount: this.currentRoyale.activeContenders.length,
      eliminatedContendersCount: this.currentRoyale.eliminatedContenders.length,
      champion: this.currentRoyale.champion,
      matches: this.currentRoyale.matches.map(m => ({
        matchId: m.matchId,
        playerAName: m.playerA.name,
        playerBName: m.playerB.name,
        gameType: m.gameType,
        status: m.status,
        winnerName: m.winner?.name
      }))
    };
  }

  clearAll() {
    this.currentRoyale = null;
  }
}
