import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';
import { CONFIG } from '../shared/constants.js';
import { dbRepository } from '../database/index.js';
import { MockHotspotController } from '../network/index.js';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || CONFIG.DEFAULT_PORT;
const hotspotController = new MockHotspotController();

// In-Memory active game state managed by the server authority
const connectedSockets = new Map(); // socketId -> { playerId, sessionId, name, joinedAt }
const players = new Map(); // playerId -> playerData

// Helper to get local network IP addresses
function getHostIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Connection Crisis Server',
    uptime: process.uptime(),
    activeSockets: io.engine.clientsCount,
    playerCount: players.size,
    hostIps: getHostIpAddresses(),
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/host/status', async (req, res) => {
  const hotspotStatus = hotspotController.getStatus();
  res.json({
    serverOnline: true,
    port: PORT,
    hostIps: getHostIpAddresses(),
    hotspotStatus,
    playerCount: players.size,
    players: Array.from(players.values())
  });
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Send initial handshake / ping
  socket.emit(SOCKET_EVENTS.PONG, {
    message: 'Welcome to Connection Crisis Server',
    serverTime: Date.now(),
    socketId: socket.id
  });

  // Host dashboard request for status
  socket.on(SOCKET_EVENTS.HOST_GET_STATUS, () => {
    socket.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, {
      playerCount: players.size,
      players: Array.from(players.values()),
      hostIps: getHostIpAddresses(),
      port: PORT,
      timestamp: Date.now()
    });
  });

  // Basic player registration event (ready for step 4)
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
      device: device || 'Browser',
      status: PLAYER_STATUS.ACTIVE,
      joinedAt: new Date().toISOString(),
      eliminated: false
    };

    players.set(playerId, playerData);
    connectedSockets.set(socket.id, { playerId, sessionId });

    // Persist in repository
    await dbRepository.savePlayer(playerData);

    console.log(`[Player Registered] ${playerData.name} (${playerData.playerId})`);

    if (callback) {
      callback({
        success: true,
        player: playerData
      });
    }

    // Broadcast to host and room
    io.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, {
      playerCount: players.size,
      players: Array.from(players.values()),
      hostIps: getHostIpAddresses(),
      port: PORT,
      timestamp: Date.now()
    });
  });

  socket.on(SOCKET_EVENTS.PING, (data) => {
    socket.emit(SOCKET_EVENTS.PONG, { received: data, time: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const socketMeta = connectedSockets.get(socket.id);
    if (socketMeta) {
      const p = players.get(socketMeta.playerId);
      if (p) {
        p.status = PLAYER_STATUS.DISCONNECTED;
      }
      connectedSockets.delete(socket.id);
      
      io.emit(SOCKET_EVENTS.HOST_STATUS_UPDATE, {
        playerCount: players.size,
        players: Array.from(players.values()),
        hostIps: getHostIpAddresses(),
        port: PORT,
        timestamp: Date.now()
      });
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
