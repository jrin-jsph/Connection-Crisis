import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { SOCKET_EVENTS, PLAYER_STATUS, CHALLENGE_STATUS } from '../shared/events.js';
import { CONFIG } from '../shared/constants.js';
import { dbRepository } from '../database/index.js';
import { defaultHotspotController, createHotspotController } from '../network/index.js';
import { doppelgangerDetector, calculateSimilarity } from './doppelganger.js';
import { ChallengeManager } from './challengeManager.js';
import { RoyaleManager } from './royaleManager.js';
import { gameManager } from '../games/index.js';
import { sanitizePlayerName, RateLimiter, validatePlayerAction, isHostAuthorized } from './security.js';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || CONFIG.DEFAULT_PORT;
const hotspotController = defaultHotspotController;

// Security & Rate Limiting
const actionRateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 20 });
const regRateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 12 });
const hostSockets = new Set();

// Authoritative In-Memory Game State
const connectedSockets = new Map(); // socketId -> { playerId, sessionId }
const players = new Map(); // playerId -> playerData
const sessions = new Map(); // sessionId -> playerId
const activeGames = new Map(); // gameId -> gameState
const activityLog = []; // [{ id, text, type, timestamp }]
const eliminatedNames = new Set(); // normalized names of eliminated players (banned from rejoining)

function addActivityLog(text, type = 'info') {
  const item = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    text,
    type,
    timestamp: new Date().toLocaleTimeString()
  };
  activityLog.unshift(item);
  if (activityLog.length > 60) {
    activityLog.pop();
  }
  return item;
}

addActivityLog('Connection Crisis Authority Engine initialized', 'system');

function getHostIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

function buildHostStatusPayload() {
  const allPlayers = Array.from(players.values());
  const activePlayers = allPlayers.filter(
    p => p.status === PLAYER_STATUS.ACTIVE || p.status === PLAYER_STATUS.IN_CHALLENGE || p.status === PLAYER_STATUS.IN_GAME
  );
  const eliminatedPlayers = allPlayers.filter(p => p.status === PLAYER_STATUS.ELIMINATED);
  const challenges = challengeManager ? challengeManager.getAllChallenges() : [];

  return {
    serverOnline: true,
    port: PORT,
    hostIps: getHostIpAddresses(),
    hotspotStatus: hotspotController.getStatus(),
    database: dbRepository.getStatus(),
    playerCount: allPlayers.length,
    activeCount: activePlayers.length,
    eliminatedCount: eliminatedPlayers.length,
    players: allPlayers,
    activeChallenges: challenges,
    eliminatedPlayers: eliminatedPlayers,
    royale: royaleManager ? royaleManager.getStatus() : null,
    activityLog: activityLog.slice(0, 35),
    timestamp: Date.now()
  };
}

function broadcastHostStatus() {
  io.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, buildHostStatusPayload());
}

async function eliminatePlayerHelper(loser, winner, reason = 'MATCH_DEFEAT') {
  if (winner) {
    winner.status = PLAYER_STATUS.ACTIVE;
    winner.eliminated = false;
    await dbRepository.savePlayer(winner);
  }
  if (loser) {
    loser.status = PLAYER_STATUS.ELIMINATED;
    loser.eliminated = true;
    const normLoser = loser.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    eliminatedNames.add(normLoser);
    await dbRepository.savePlayer(loser);
    io.emit(SOCKET_EVENTS.PLAYER_ELIMINATED, {
      playerId: loser.playerId,
      name: loser.name,
      eliminatedAt: new Date().toISOString(),
      reason
    });
  }
  broadcastHostStatus();
}

// Instantiate Challenge & Royale Managers
const challengeManager = new ChallengeManager(io, addActivityLog, broadcastHostStatus);
const royaleManager = new RoyaleManager(io, addActivityLog, broadcastHostStatus, eliminatePlayerHelper);

function checkAndTriggerDoppelganger(newPlayer) {
  const activeContenders = Array.from(players.values()).filter(
    p => p.status === PLAYER_STATUS.ACTIVE && p.playerId !== newPlayer.playerId
  );

  for (const other of activeContenders) {
    if (doppelgangerDetector.hasPairBeenChallenged(newPlayer.playerId, other.playerId)) continue;
    
    const score = calculateSimilarity(newPlayer.name, other.name);
    if (score >= (CONFIG.SIMILARITY_THRESHOLD || 0.85)) {
      doppelgangerDetector.markPairChallenged(newPlayer.playerId, other.playerId);
      
      const pA = newPlayer;
      const pB = other;
      pA.status = PLAYER_STATUS.IN_CHALLENGE;
      pB.status = PLAYER_STATUS.IN_CHALLENGE;

      return challengeManager.createChallenge(pA, pB, score);
    }
  }
  return null;
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Connection Crisis Authority Server',
    uptime: process.uptime(),
    activeSockets: io.engine.clientsCount,
    playerCount: players.size,
    hostIps: getHostIpAddresses(),
    port: PORT,
    database: dbRepository.getStatus(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/host/status', async (req, res) => {
  res.json(buildHostStatusPayload());
});

// Socket.IO Authoritative Engine
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Handshake
  socket.emit(SOCKET_EVENTS.PONG, {
    message: 'Welcome to Connection Crisis Server Authority',
    serverTime: Date.now(),
    socketId: socket.id
  });

  // Reconnection Handshake
  socket.on(SOCKET_EVENTS.PLAYER_RECONNECTED, (payload, callback) => {
    const { sessionId, playerId } = payload || {};
    if (sessionId && sessions.has(sessionId)) {
      const pid = sessions.get(sessionId);
      const player = players.get(pid);
      if (player) {
        player.socketId = socket.id;

        // If player was eliminated, keep them in eliminated state
        if (player.eliminated || player.status === PLAYER_STATUS.ELIMINATED) {
          player.status = PLAYER_STATUS.ELIMINATED;
          connectedSockets.set(socket.id, { playerId: player.playerId, sessionId });
          if (callback) callback({ success: true, player, isEliminated: true });
          return;
        }

        // Restore active player session
        player.status = PLAYER_STATUS.ACTIVE;
        connectedSockets.set(socket.id, { playerId: player.playerId, sessionId });
        addActivityLog(`Player reconnected: ${player.name} (Session Restored)`, 'player');
        
        io.emit(SOCKET_EVENTS.PLAYER_RECONNECTED, { player });
        broadcastHostStatus();

        if (callback) callback({ success: true, player, restored: true });
        return;
      }
    }
    if (callback) callback({ success: false, message: 'Session not found or expired' });
  });

  // Host registration and status
  socket.on('host:register', (data, callback) => {
    hostSockets.add(socket.id);
    if (callback) callback({ success: true, isHost: true });
  });

  socket.on(SOCKET_EVENTS.HOST_GET_STATUS, () => {
    hostSockets.add(socket.id);
    socket.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, buildHostStatusPayload());
  });

  // 1. Player Registration
  socket.on(SOCKET_EVENTS.PLAYER_REGISTER, async (payload, callback) => {
    // A. Rate Limiting Check
    if (!regRateLimiter.isAllowed(socket.id)) {
      if (callback) callback({ success: false, error: 'RATE_LIMIT_EXCEEDED: Too many registration attempts. Please wait.' });
      return;
    }

    const { name, device } = payload || {};
    
    // B. Input Sanitization & XSS Prevention
    const nameCheck = sanitizePlayerName(name);
    if (!nameCheck.valid) {
      if (callback) callback({ success: false, error: nameCheck.error });
      return;
    }

    const trimmedName = nameCheck.sanitized;
    const normalizedName = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // C. Check if name is banned due to previous elimination
    if (eliminatedNames.has(normalizedName)) {
      if (callback) {
        callback({
          success: false,
          banned: true,
          error: `🚫 NAME BANNED: The moniker "${trimmedName}" was eliminated in a Connection Crisis showdown and cannot rejoin.`
        });
      }
      return;
    }

    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const sessionId = 's_' + Math.random().toString(36).substring(2, 11);

    const playerData = {
      playerId,
      sessionId,
      name: trimmedName,
      socketId: socket.id,
      device: device ? String(device).replace(/<[^>]*>?/gm, '').substring(0, 30) : 'Mobile Web',
      status: PLAYER_STATUS.ACTIVE,
      joinedAt: new Date().toISOString(),
      eliminated: false
    };

    players.set(playerId, playerData);
    sessions.set(sessionId, playerId);
    connectedSockets.set(socket.id, { playerId, sessionId });

    await dbRepository.savePlayer(playerData);
    addActivityLog(`Player registered: ${playerData.name} (${playerData.device})`, 'player');

    io.emit(SOCKET_EVENTS.PLAYER_JOINED, { player: playerData });
    broadcastHostStatus();

    // Check for Doppelgangers automatically
    checkAndTriggerDoppelganger(playerData);

    if (callback) {
      callback({ success: true, player: playerData });
    }
  });

  // 2. Challenge & Doppelganger Management
  socket.on(SOCKET_EVENTS.CHALLENGE_ENTER, (payload, callback) => {
    const { challengeId, playerId } = payload || {};
    const result = challengeManager.enterPlayer(challengeId, playerId);
    if (callback) callback(result);
  });

  // 3. Authoritative Game Action Handler
  socket.on(SOCKET_EVENTS.GAME_ACTION, async (payload, callback) => {
    // A. Action Rate Limiter (anti-spam)
    if (!actionRateLimiter.isAllowed(socket.id)) {
      if (callback) callback({ success: false, error: 'RATE_LIMIT_EXCEEDED: High-frequency action spam blocked' });
      return;
    }

    // B. Spoof Prevention & Identity Validation
    const validation = validatePlayerAction(socket, payload, connectedSockets, gameManager);
    if (!validation.valid) {
      if (callback) callback({ success: false, error: validation.error });
      return;
    }

    const { gameId, playerId, actionType, actionData } = payload || {};
    const player = players.get(playerId);
    if (!player || player.status === PLAYER_STATUS.ELIMINATED) {
      if (callback) callback({ success: false, error: 'Player cannot perform action' });
      return;
    }

    const result = gameManager.handleAction(gameId, playerId, actionType, actionData);
    if (!result.success) {
      if (callback) callback(result);
      return;
    }

    if (result.completed) {
      const matchResult = await gameManager.finishGame(gameId, result.winnerId);
      const winner = players.get(matchResult.winnerId);
      const loser = players.get(matchResult.loserId);

      await eliminatePlayerHelper(loser, winner, result.reason || 'MATCH_DEFEAT');

      // If Royale match is active, notify royale manager
      await royaleManager.handleMatchCompletion(gameId, matchResult.winnerId, matchResult.loserId, result);

      addActivityLog(`🏆 ${winner?.name || 'Winner'} won! 💀 ${loser?.name || 'Loser'} eliminated from Connection Crisis.`, 'game');

      io.emit(SOCKET_EVENTS.GAME_FINISHED, {
        gameId,
        winnerId: matchResult.winnerId,
        loserId: matchResult.loserId,
        winnerName: winner?.name,
        loserName: loser?.name,
        scores: matchResult.scores,
        reason: result.reason || 'MATCH_VICTORY',
        reactionMs: result.reactionMs
      });
      broadcastHostStatus();
    } else {
      io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: result.state });
    }

    if (callback) callback(result);
  });

  socket.on('game:create', (payload, callback) => {
    const { gameType, playerAId, playerBId, options } = payload || {};
    const pA = players.get(playerAId);
    const pB = players.get(playerBId);
    if (!pA || !pB) {
      if (callback) callback({ success: false, error: 'Players not found' });
      return;
    }
    const type = gameType || 'rock_paper_scissors';
    const gameId = `game_${type}_${Date.now()}`;
    const game = gameManager.createGame(gameId, type, pA, pB, options);
    
    if (type === 'rock_paper_scissors') {
      game.start(
        (sec, round) => {
          io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, round } });
        },
        (roundRecord, matchFinished, finishRes) => {
          io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: game.getState(true) });
        }
      );
    } else if (type === 'memory_match') {
      game.start((patternState) => {
        io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: patternState });
      });
    } else if (type === 'target_click') {
      game.start(
        (sec, currentTarget) => {
          io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, state: { secondsRemaining: sec, currentTarget, scores: game.scores } });
        },
        async (matchResult) => {
          const winner = players.get(matchResult.winnerId);
          const loser = players.get(matchResult.loserId);
          await gameManager.finishGame(gameId, matchResult.winnerId);
          io.emit(SOCKET_EVENTS.GAME_FINISHED, {
            gameId,
            winnerId: matchResult.winnerId,
            loserId: matchResult.loserId,
            winnerName: winner?.name,
            loserName: loser?.name,
            scores: matchResult.scores,
            reason: 'TIME_EXPIRED_MOST_POINTS'
          });
          broadcastHostStatus();
        }
      );
    } else {
      game.start();
    }

    addActivityLog(`Minigame Started: [${type}] between ${pA.name} and ${pB.name}`, 'game');

    io.emit(SOCKET_EVENTS.GAME_STARTED, {
      gameId,
      playerAId: pA.playerId,
      playerBId: pB.playerId,
      playerA: pA,
      playerB: pB,
      gameType: type,
      gameData: game.getState()
    });

    if (callback) callback({ success: true, gameId, gameData: game.getState() });
  });

  function guardHost(callback) {
    if (!isHostAuthorized(socket, hostSockets)) {
      addActivityLog(`⚠️ Blocked unauthorized admin action from socket ${socket.id}`, 'security');
      if (callback) callback({ success: false, error: 'UNAUTHORIZED_HOST_ACTION: Only the host dashboard can perform this action' });
      return false;
    }
    return true;
  }

  // 4. Host Triggers
  socket.on(SOCKET_EVENTS.HOST_START_GAME, (data, callback) => {
    if (!guardHost(callback)) return;
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    if (active.length < 2) {
      if (callback) callback({ success: false, message: 'Need at least 2 active players to start a game' });
      return;
    }

    const playerA = active[0];
    const playerB = active[1];
    playerA.status = PLAYER_STATUS.IN_CHALLENGE;
    playerB.status = PLAYER_STATUS.IN_CHALLENGE;

    const challenge = challengeManager.createChallenge(playerA, playerB, 0.95);
    if (callback) callback({ success: true, challenge });
  });

  socket.on(SOCKET_EVENTS.HOST_START_ROYALE, (data, callback) => {
    if (!guardHost(callback)) return;
    const res = royaleManager.startRoyale(Array.from(players.values()));
    if (callback) callback(res);
  });

  socket.on(SOCKET_EVENTS.HOST_RESET_ROOM, (data, callback) => {
    if (!guardHost(callback)) return;
    players.clear();
    sessions.clear();
    activeGames.clear();
    connectedSockets.clear();
    eliminatedNames.clear();
    challengeManager.clearAll();
    royaleManager.clearAll();
    doppelgangerDetector.clearHistory();
    addActivityLog('Host reset the game room. All sessions and challenge history cleared.', 'warning');
    broadcastHostStatus();
    if (callback) callback({ success: true, message: 'Room has been reset.' });
  });

  socket.on(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, (data, callback) => {
    if (!guardHost(callback)) return;
    const sampleNames = ['Jerrin', 'Jerin', 'Alex', 'Aleks', 'Marcus', 'Sophia', 'David', 'Elena', 'Kai', 'Nova', 'Liam', 'Zoe'];
    const sampleDevices = ['iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8', 'iPad Air', 'OnePlus 12', 'MacBook Air'];
    
    const usedNames = new Set(Array.from(players.values()).map(p => p.name));
    let chosenName = data?.name || sampleNames.find(n => !usedNames.has(n)) || `Player_${Math.floor(Math.random() * 900 + 100)}`;
    const chosenDevice = data?.device || sampleDevices[Math.floor(Math.random() * sampleDevices.length)];

    const playerId = 'p_sim_' + Math.random().toString(36).substring(2, 8);
    const sessionId = 's_sim_' + Math.random().toString(36).substring(2, 10);

    const simPlayer = {
      playerId,
      sessionId,
      name: chosenName,
      socketId: 'mock_sock_' + playerId,
      device: chosenDevice,
      status: PLAYER_STATUS.ACTIVE,
      isSimulated: true,
      joinedAt: new Date().toISOString(),
      eliminated: false
    };

    players.set(playerId, simPlayer);
    sessions.set(sessionId, playerId);
    dbRepository.savePlayer(simPlayer);
    
    addActivityLog(`Virtual Player Joined: ${simPlayer.name} (${simPlayer.device})`, 'player');
    
    io.emit(SOCKET_EVENTS.PLAYER_JOINED, { player: simPlayer });
    broadcastHostStatus();

    // Check for Doppelgangers automatically
    checkAndTriggerDoppelganger(simPlayer);

    if (callback) callback({ success: true, player: simPlayer });
  });

  socket.on(SOCKET_EVENTS.HOST_SIMULATE_CHALLENGE, (data, callback) => {
    if (!guardHost(callback)) return;
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    if (active.length < 2) {
      if (callback) callback({ success: false, message: 'Need at least 2 active players to simulate a challenge' });
      return;
    }

    const pA = active[0];
    const pB = active[1];
    pA.status = PLAYER_STATUS.IN_CHALLENGE;
    pB.status = PLAYER_STATUS.IN_CHALLENGE;

    const challenge = challengeManager.createChallenge(pA, pB, 0.94);
    if (callback) callback({ success: true, challenge });
  });

  socket.on('host:simulate_disconnect', (data, callback) => {
    if (!guardHost(callback)) return;
    const { playerId } = data || {};
    const p = players.get(playerId) || Array.from(players.values()).find(x => x.status === PLAYER_STATUS.ACTIVE);
    if (p) {
      p.status = PLAYER_STATUS.DISCONNECTED;
      addActivityLog(`[SIMULATION] Network drop triggered on: ${p.name}`, 'disconnect');
      io.emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, { playerId: p.playerId, name: p.name });
      broadcastHostStatus();
      if (callback) callback({ success: true, player: p });
    } else {
      if (callback) callback({ success: false, message: 'No active player to disconnect' });
    }
  });

  socket.on('host:simulate_victory', async (data, callback) => {
    if (!guardHost(callback)) return;
    const { gameId, winnerId } = data || {};
    let targetGameId = gameId;
    let targetWinnerId = winnerId;

    if (!targetGameId) {
      const activeGameEntry = Array.from(activeGames.entries())[0];
      if (activeGameEntry) {
        targetGameId = activeGameEntry[0];
        const game = activeGameEntry[1];
        targetWinnerId = targetWinnerId || game.playerA.playerId;
      }
    }

    if (targetGameId && targetWinnerId) {
      const matchResult = await gameManager.finishGame(targetGameId, targetWinnerId);
      const winner = players.get(matchResult.winnerId);
      const loser = players.get(matchResult.loserId);

      await eliminatePlayerHelper(loser, winner, 'SIMULATED_VICTORY');
      await royaleManager.handleMatchCompletion(targetGameId, matchResult.winnerId, matchResult.loserId, { reason: 'SIMULATED_VICTORY' });

      addActivityLog(`[SIMULATION] Minigame victory simulated! Winner: ${winner?.name}`, 'game');
      io.emit(SOCKET_EVENTS.GAME_FINISHED, {
        gameId: targetGameId,
        winnerId: matchResult.winnerId,
        loserId: matchResult.loserId,
        winnerName: winner?.name,
        loserName: loser?.name,
        scores: matchResult.scores,
        reason: 'SIMULATED_VICTORY'
      });
      broadcastHostStatus();
      if (callback) callback({ success: true, matchResult });
    } else {
      if (callback) callback({ success: false, message: 'No active game found to simulate victory' });
    }
  });

  socket.on(SOCKET_EVENTS.HOST_REMOVE_PLAYER, (payload, callback) => {
    if (!guardHost(callback)) return;
    const { playerId } = payload || {};
    if (players.has(playerId)) {
      const p = players.get(playerId);
      players.delete(playerId);
      sessions.delete(p.sessionId);
      addActivityLog(`Player removed: ${p.name}`, 'warning');
      broadcastHostStatus();
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, message: 'Player not found' });
    }
  });

  // Ping Check
  socket.on(SOCKET_EVENTS.PING, (data) => {
    socket.emit(SOCKET_EVENTS.PONG, { received: data, time: Date.now() });
  });

  // Authoritative Disconnect Handler
  socket.on('disconnect', () => {
    const socketMeta = connectedSockets.get(socket.id);
    if (socketMeta) {
      const p = players.get(socketMeta.playerId);
      if (p) {
        p.status = PLAYER_STATUS.DISCONNECTED;
        addActivityLog(`Player disconnected: ${p.name}`, 'disconnect');
        io.emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, { playerId: p.playerId, name: p.name });
      }
      connectedSockets.delete(socket.id);
      broadcastHostStatus();
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🎮 CONNECTION CRISIS SERVER RUNNING`);
  console.log(`📡 Local Port: ${PORT}`);
  console.log(`🌐 Available Host IP Addresses:`);
  getHostIpAddresses().forEach((ip) => {
    console.log(`   - http://${ip.address}:${PORT} (${ip.interface})`);
  });
  console.log(`=========================================`);
});
