import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { SOCKET_EVENTS, PLAYER_STATUS, CHALLENGE_STATUS } from '../shared/events.js';
import { CONFIG } from '../shared/constants.js';
import { dbRepository } from '../database/index.js';
import { MockHotspotController } from '../network/index.js';

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
const hotspotController = new MockHotspotController();

// Authoritative In-Memory Game State
const connectedSockets = new Map(); // socketId -> { playerId, sessionId }
const players = new Map(); // playerId -> playerData
const sessions = new Map(); // sessionId -> playerId
const activeChallenges = new Map(); // challengeId -> challengeData
const activeGames = new Map(); // gameId -> gameState
const activityLog = []; // [{ id, text, type, timestamp }]

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
  const activePlayers = allPlayers.filter(p => p.status === PLAYER_STATUS.ACTIVE || p.status === PLAYER_STATUS.IN_CHALLENGE || p.status === PLAYER_STATUS.IN_GAME);
  const eliminatedPlayers = allPlayers.filter(p => p.status === PLAYER_STATUS.ELIMINATED);
  const challenges = Array.from(activeChallenges.values());

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
    activityLog: activityLog.slice(0, 35),
    timestamp: Date.now()
  };
}

function broadcastHostStatus() {
  io.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, buildHostStatusPayload());
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
        if (player.status === PLAYER_STATUS.DISCONNECTED) {
          player.status = player.eliminated ? PLAYER_STATUS.ELIMINATED : PLAYER_STATUS.ACTIVE;
        }
        connectedSockets.set(socket.id, { playerId: player.playerId, sessionId });
        addActivityLog(`Player reconnected: ${player.name}`, 'player');
        
        // Broadcast reconnected event
        io.emit(SOCKET_EVENTS.PLAYER_RECONNECTED, { player });
        broadcastHostStatus();

        if (callback) callback({ success: true, player });
        return;
      }
    }
    if (callback) callback({ success: false, message: 'Session not found' });
  });

  // Host requesting status
  socket.on(SOCKET_EVENTS.HOST_GET_STATUS, () => {
    socket.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, buildHostStatusPayload());
  });

  // 1. Player Registration (Authoritative)
  socket.on(SOCKET_EVENTS.PLAYER_REGISTER, async (payload, callback) => {
    const { name, device } = payload || {};
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      if (callback) callback({ success: false, error: 'Valid player name is required' });
      return;
    }

    const trimmedName = name.trim().slice(0, 20);
    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const sessionId = 's_' + Math.random().toString(36).substring(2, 11);

    const playerData = {
      playerId,
      sessionId,
      name: trimmedName,
      socketId: socket.id,
      device: device || 'Mobile Web',
      status: PLAYER_STATUS.ACTIVE,
      joinedAt: new Date().toISOString(),
      eliminated: false
    };

    players.set(playerId, playerData);
    sessions.set(sessionId, playerId);
    connectedSockets.set(socket.id, { playerId, sessionId });

    await dbRepository.savePlayer(playerData);
    addActivityLog(`Player registered: ${playerData.name} (${playerData.device})`, 'player');

    // Authoritative broadcast
    io.emit(SOCKET_EVENTS.PLAYER_JOINED, { player: playerData });
    broadcastHostStatus();

    if (callback) {
      callback({ success: true, player: playerData });
    }
  });

  // 2. Challenge & Doppelganger Management
  socket.on(SOCKET_EVENTS.CHALLENGE_ENTER, (payload, callback) => {
    const { challengeId, playerId } = payload || {};
    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      if (callback) callback({ success: false, error: 'Challenge not found' });
      return;
    }

    challenge.enteredPlayers = challenge.enteredPlayers || [];
    if (!challenge.enteredPlayers.includes(playerId)) {
      challenge.enteredPlayers.push(playerId);
    }

    if (callback) callback({ success: true, challenge });

    // When both players have entered the challenge arena
    if (challenge.enteredPlayers.length >= 2 && challenge.status === CHALLENGE_STATUS.COUNTDOWN) {
      challenge.status = CHALLENGE_STATUS.GAME_RUNNING;
      const gameId = 'game_' + challengeId;
      
      addActivityLog(`Challenge Started: ${challenge.playerAName} VS ${challenge.playerBName}`, 'game');
      
      io.emit(SOCKET_EVENTS.CHALLENGE_STARTED, { challenge });
      io.emit(SOCKET_EVENTS.GAME_STARTED, { 
        gameId, 
        challengeId,
        playerAId: challenge.playerAId,
        playerBId: challenge.playerBId,
        gameType: 'reaction_rush'
      });
      broadcastHostStatus();
    }
  });

  // 3. Authoritative Game Action Handler
  socket.on(SOCKET_EVENTS.GAME_ACTION, async (payload, callback) => {
    const { gameId, playerId, actionType, actionData } = payload || {};
    const socketMeta = connectedSockets.get(socket.id);
    
    // Validate that action comes from authenticated player
    if (!socketMeta || socketMeta.playerId !== playerId) {
      if (callback) callback({ success: false, error: 'Unauthorized game action' });
      return;
    }

    const player = players.get(playerId);
    if (!player || player.status === PLAYER_STATUS.ELIMINATED) {
      if (callback) callback({ success: false, error: 'Player cannot perform action' });
      return;
    }

    // Server calculates authoritative response
    const timestamp = Date.now();
    addActivityLog(`Game Action [${actionType}] from ${player.name}`, 'game');

    // Emit Authoritative Score & State update
    const scoreUpdate = {
      gameId,
      playerId,
      score: 100,
      timestamp
    };

    io.emit(SOCKET_EVENTS.SCORE_UPDATED, scoreUpdate);
    io.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, { gameId, lastAction: { playerId, actionType, timestamp } });

    if (callback) callback({ success: true, scoreUpdate });
  });

  // 4. Host Triggers
  socket.on(SOCKET_EVENTS.HOST_START_GAME, (data, callback) => {
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    if (active.length < 2) {
      if (callback) callback({ success: false, message: 'Need at least 2 active players to start a game' });
      return;
    }

    const playerA = active[0];
    const playerB = active[1];
    const challengeId = 'ch_' + Date.now();

    const challenge = {
      challengeId,
      playerAId: playerA.playerId,
      playerAName: playerA.name,
      playerBId: playerB.playerId,
      playerBName: playerB.name,
      status: CHALLENGE_STATUS.COUNTDOWN,
      countdownRemaining: CONFIG.CHALLENGE_COUNTDOWN_SECONDS,
      enteredPlayers: [],
      createdAt: new Date().toISOString()
    };

    activeChallenges.set(challengeId, challenge);
    playerA.status = PLAYER_STATUS.IN_CHALLENGE;
    playerB.status = PLAYER_STATUS.IN_CHALLENGE;

    addActivityLog(`Host created Challenge: ${playerA.name} VS ${playerB.name}`, 'challenge');
    
    io.emit(SOCKET_EVENTS.CHALLENGE_CREATED, { challenge });
    broadcastHostStatus();

    if (callback) callback({ success: true, challenge });
  });

  socket.on(SOCKET_EVENTS.HOST_START_ROYALE, (data, callback) => {
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    const royaleId = 'royale_' + Date.now();
    
    addActivityLog(`Connection Crisis Royale Started (${active.length} Contenders)`, 'royale');
    
    io.emit(SOCKET_EVENTS.ROYALE_STARTED, { royaleId, contendersCount: active.length });
    io.emit(SOCKET_EVENTS.ROYALE_ROUND_START, { roundNumber: 1, activeContenders: active.map(p => p.playerId) });
    broadcastHostStatus();
    
    if (callback) callback({ success: true, message: `Royale tournament initiated with ${active.length} contenders.` });
  });

  socket.on(SOCKET_EVENTS.HOST_RESET_ROOM, (data, callback) => {
    players.clear();
    sessions.clear();
    activeChallenges.clear();
    activeGames.clear();
    connectedSockets.clear();
    addActivityLog('Host reset the game room. All sessions cleared.', 'warning');
    broadcastHostStatus();
    if (callback) callback({ success: true, message: 'Room has been reset.' });
  });

  socket.on(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, (data, callback) => {
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

    if (callback) callback({ success: true, player: simPlayer });
  });

  socket.on(SOCKET_EVENTS.HOST_SIMULATE_CHALLENGE, (data, callback) => {
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    if (active.length < 2) {
      if (callback) callback({ success: false, message: 'Need at least 2 active players to simulate a challenge' });
      return;
    }

    const pA = active[0];
    const pB = active[1];
    const chId = 'ch_sim_' + Date.now();
    const challenge = {
      challengeId: chId,
      playerAId: pA.playerId,
      playerAName: pA.name,
      playerBId: pB.playerId,
      playerBName: pB.name,
      similarityScore: 0.94,
      status: CHALLENGE_STATUS.COUNTDOWN,
      countdownRemaining: 60,
      enteredPlayers: [],
      createdAt: new Date().toISOString()
    };

    activeChallenges.set(chId, challenge);
    pA.status = PLAYER_STATUS.IN_CHALLENGE;
    pB.status = PLAYER_STATUS.IN_CHALLENGE;

    addActivityLog(`Doppelganger Alert! ${pA.name} ⚡ ${pB.name} (Similarity: 94%)`, 'challenge');
    
    io.emit(SOCKET_EVENTS.CHALLENGE_CREATED, { challenge });
    broadcastHostStatus();

    if (callback) callback({ success: true, challenge });
  });

  socket.on(SOCKET_EVENTS.HOST_REMOVE_PLAYER, (payload, callback) => {
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
