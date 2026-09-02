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

// In-Memory active game state managed strictly by server authority
const connectedSockets = new Map(); // socketId -> { playerId, sessionId }
const players = new Map(); // playerId -> playerData
const activeChallenges = new Map(); // challengeId -> challengeData
const activityLog = []; // [{ id, text, type, timestamp }]

function addActivityLog(text, type = 'info') {
  const item = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    text,
    type,
    timestamp: new Date().toLocaleTimeString()
  };
  activityLog.unshift(item);
  if (activityLog.length > 50) {
    activityLog.pop();
  }
  return item;
}

// Initial server log
addActivityLog('Connection Crisis Server initialized and listening', 'system');

// Helper to get local network IPv4 addresses
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

// Build consolidated host status snapshot
function buildHostStatusPayload() {
  const allPlayers = Array.from(players.values());
  const activePlayers = allPlayers.filter(p => p.status !== PLAYER_STATUS.ELIMINATED && p.status !== PLAYER_STATUS.DISCONNECTED);
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
    activityLog: activityLog.slice(0, 30),
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
    appName: 'Connection Crisis Server',
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

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Send handshake
  socket.emit(SOCKET_EVENTS.PONG, {
    message: 'Welcome to Connection Crisis Server',
    serverTime: Date.now(),
    socketId: socket.id
  });

  // Host requesting status
  socket.on(SOCKET_EVENTS.HOST_GET_STATUS, () => {
    socket.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, buildHostStatusPayload());
  });

  // Host Action: Start Game / Challenge
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
      createdAt: new Date().toISOString()
    };

    activeChallenges.set(challengeId, challenge);
    playerA.status = PLAYER_STATUS.IN_CHALLENGE;
    playerB.status = PLAYER_STATUS.IN_CHALLENGE;

    addActivityLog(`Host started 1v1 Challenge: ${playerA.name} VS ${playerB.name}`, 'game');
    broadcastHostStatus();

    if (callback) callback({ success: true, challenge });
  });

  // Host Action: Start Royale
  socket.on(SOCKET_EVENTS.HOST_START_ROYALE, (data, callback) => {
    const active = Array.from(players.values()).filter(p => p.status === PLAYER_STATUS.ACTIVE);
    addActivityLog(`Host triggered Connection Crisis Royale tournament with ${active.length} players!`, 'royale');
    broadcastHostStatus();
    if (callback) callback({ success: true, message: `Royale initialized with ${active.length} contenders.` });
  });

  // Host Action: Reset Room
  socket.on(SOCKET_EVENTS.HOST_RESET_ROOM, (data, callback) => {
    players.clear();
    activeChallenges.clear();
    connectedSockets.clear();
    addActivityLog('Host reset the game room. All player sessions cleared.', 'warning');
    broadcastHostStatus();
    if (callback) callback({ success: true, message: 'Room has been reset.' });
  });

  // Host Action: Simulate Virtual Player
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
    dbRepository.savePlayer(simPlayer);
    addActivityLog(`Simulated player connected: ${simPlayer.name} (${simPlayer.device})`, 'player');
    broadcastHostStatus();

    if (callback) callback({ success: true, player: simPlayer });
  });

  // Host Action: Simulate Challenge
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
      createdAt: new Date().toISOString()
    };

    activeChallenges.set(chId, challenge);
    pA.status = PLAYER_STATUS.IN_CHALLENGE;
    pB.status = PLAYER_STATUS.IN_CHALLENGE;

    addActivityLog(`Doppelganger Alert! ${pA.name} ⚡ ${pB.name} (Similarity: 94%)`, 'challenge');
    broadcastHostStatus();

    if (callback) callback({ success: true, challenge });
  });

  // Host Action: Remove / Kick Player
  socket.on(SOCKET_EVENTS.HOST_REMOVE_PLAYER, (payload, callback) => {
    const { playerId } = payload || {};
    if (players.has(playerId)) {
      const p = players.get(playerId);
      players.delete(playerId);
      addActivityLog(`Host removed player: ${p.name}`, 'warning');
      broadcastHostStatus();
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, message: 'Player not found' });
    }
  });

  // Player Registration Handshake (Step 4 preview)
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
    connectedSockets.set(socket.id, { playerId, sessionId });

    await dbRepository.savePlayer(playerData);
    addActivityLog(`Player joined lobby: ${playerData.name} (${playerData.device})`, 'player');

    if (callback) {
      callback({ success: true, player: playerData });
    }

    broadcastHostStatus();
  });

  // Socket Ping
  socket.on(SOCKET_EVENTS.PING, (data) => {
    socket.emit(SOCKET_EVENTS.PONG, { received: data, time: Date.now() });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const socketMeta = connectedSockets.get(socket.id);
    if (socketMeta) {
      const p = players.get(socketMeta.playerId);
      if (p) {
        p.status = PLAYER_STATUS.DISCONNECTED;
        addActivityLog(`Player disconnected: ${p.name}`, 'disconnect');
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
